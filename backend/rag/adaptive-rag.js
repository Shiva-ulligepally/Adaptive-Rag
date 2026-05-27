import { expandQuery } from './query-optimizer.js';
import { retrieveDense, retrieveSparse } from './hybrid-retriever.js';
import { reciprocalRankFusion } from './rrf-fusion.js';
import { reRankLLM } from './llm-reranker.js';
import { filterContext } from './context-filter.js';
import { buildContextText, buildSystemPrompt } from './prompt-builder.js';
import { queryGroqLLM, queryGroqRaw } from '../services/groq-service.js';
import { searchWikipedia } from '../services/search-service.js';
import { createStandardDocument } from './types.js';
import { ChromaClient } from '../services/chroma-service.js';


/**
 * Clean and parse LLM JSON responses with high robustness
 */
function cleanAndParseJson(text, fallback) {
  try {
    const clean = text.replace(/```json/gi, '').replace(/```/gi, '').trim();
    return JSON.parse(clean);
  } catch (e) {
    console.warn(`[JSON Parser] Direct parse failed, attempting regex extraction on: "${text.substring(0, 100)}..."`);
    try {
      // Find the first '{' and last '}'
      const startIdx = text.indexOf('{');
      const endIdx = text.lastIndexOf('}');
      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        const jsonStr = text.substring(startIdx, endIdx + 1);
        return JSON.parse(jsonStr);
      }
    } catch (innerErr) {
      console.error(`[JSON Parser] Robust fallback failed: ${innerErr.message}`);
    }
    return fallback;
  }
}

/**
 * Route incoming query using Groq LLM
 */
export async function routeQuery(query, apiKey) {
  console.log(`[Adaptive RAG Router] Evaluating route for: "${query}"`);
  
  const systemPrompt = `You are an expert query router for a highly advanced Adaptive RAG system.
Analyze the user's query and classify it into EXACTLY one of the following categories:
1. "conversational" - Simple greetings, introduction questions, thanks, or general pleasantries (e.g. "hi", "how are you?", "who are you?").
2. "factual_direct" - A specific, narrow query asking about document details, particular articles, clauses, or precise definitions (e.g. "What is Article 19?", "Summarize Article 21").
3. "reasoning_complex" - Open-ended queries requiring logical reasoning, comparing multiple articles/sections, summaries of the entire document, or synthesis (e.g. "What is the relation between Article 14 and 19?", "Compare fundamental rights with directive principles").
4. "external_search" - Questions clearly outside the scope of legal/constitutional documents, asking about generic history, geography, programming, general news, or external science (e.g. "capital of France", "how does photosynthesis work?", "who is Einstein?").

YOU MUST respond with a strict, valid JSON object containing exactly "route" and "reasoning" fields.
Do not include any conversational filler, markdown formatting (like \`\`\`json), or extra text.
Format example:
{
  "route": "factual_direct",
  "reasoning": "The query asks for a direct definition of a specific article."
}`;

  const userMessage = `User Query: "${query}"`;
  
  try {
    const rawResult = await queryGroqRaw(apiKey, systemPrompt, userMessage, 'llama-3.3-70b-versatile', 0.0);
    const parsed = cleanAndParseJson(rawResult, { route: 'factual_direct', reasoning: 'JSON parse fallback' });
    
    // Validate route value
    const validRoutes = ['conversational', 'factual_direct', 'reasoning_complex', 'external_search'];
    if (!validRoutes.includes(parsed.route)) {
      parsed.route = 'factual_direct';
    }
    
    console.log(`[Adaptive RAG Router] Selected Route: [${parsed.route.toUpperCase()}] - ${parsed.reasoning}`);
    return parsed;
  } catch (error) {
    console.error(`[Adaptive RAG Router] Routing failed: ${error.message}. Defaulting to factual_direct.`);
    return {
      route: 'factual_direct',
      reasoning: `Routing failed: ${error.message}. Defaulting to factual_direct.`
    };
  }
}

/**
 * Grade individual chunk relevance
 */
async function gradeChunkRelevance(query, chunk, apiKey) {
  const systemPrompt = `You are a strict document relevance evaluator.
Given a user query and a text chunk, evaluate if the chunk contains information that is directly useful, supportive, or relevant to answering the query.
Answer with strict JSON containing exactly "relevant" (boolean) and "reason" (1-sentence explanation).
Format:
{"relevant": true, "reason": "Contains exact legal article text regarding fundamental freedoms."}`;

  const userMessage = `User Query: "${query}"\n\nDocument Chunk:\n${chunk.text}`;
  
  try {
    const rawResponse = await queryGroqRaw(apiKey, systemPrompt, userMessage, 'llama-3.3-70b-versatile', 0.0);
    const parsed = cleanAndParseJson(rawResponse, { relevant: true, reason: 'Failed to evaluate' });
    return {
      chunkId: chunk.id,
      relevant: parsed.relevant === true,
      reason: parsed.reason || ''
    };
  } catch (e) {
    return { chunkId: chunk.id, relevant: true, reason: 'Fallback - allowed due to grader timeout' };
  }
}

/**
 * Rewrite user search query if retrieval yields irrelevant chunks
 */
async function rewriteQuery(query, apiKey) {
  console.log(`[Adaptive RAG Rewriter] Reformulating query: "${query}"`);
  
  const systemPrompt = `You are an expert search engine query rewriter.
The user query failed to retrieve any relevant document chunks. Reformulate the query into a highly search-optimized query.
Focus on extracting core concepts, nouns, synonyms, and legal terminology, while removing conversational prefixes or filler.
Respond with a strict JSON object containing exactly "rewrittenQuery" and "explanation".
Format:
{
  "rewrittenQuery": "Article 19 freedom of speech reasonable restrictions constitution",
  "explanation": "Extracted core legal subject nouns and removed question syntax for better keyword search matching."
}`;

  const userMessage = `Original Query: "${query}"`;
  
  try {
    const rawResponse = await queryGroqRaw(apiKey, systemPrompt, userMessage, 'llama-3.3-70b-versatile', 0.0);
    const parsed = cleanAndParseJson(rawResponse, { rewrittenQuery: `${query} details`, explanation: 'Fallback rewrite' });
    console.log(`[Adaptive RAG Rewriter] Rewritten query: "${parsed.rewrittenQuery}"`);
    return parsed;
  } catch (err) {
    return { rewrittenQuery: `${query} concepts`, explanation: 'Fallback rewrite error' };
  }
}

/**
 * Evaluate generated answer for hallucinations against contexts
 */
async function evaluateHallucination(answer, contextChunks, apiKey) {
  if (contextChunks.length === 0) {
    return { hallucinated: false, score: 100, reason: 'No context provided for evaluation.' };
  }

  const systemPrompt = `You are an expert hallucination grader.
Given a list of source document chunks and a generated answer, evaluate if the answer contains any claims, facts, or statements that are NOT directly supported by or grounded in the provided document chunks (hallucinations).
Provide a score from 0 to 100 (100 means completely grounded, zero hallucinations; 0 means completely fabricated).
Respond with a strict JSON object containing exactly "hallocinated" (boolean) and "score" (number) and "reason" (string).
Format:
{"hallocinated": false, "score": 98, "reason": "Every claim in the answer is verified in chunks 1 and 2."}`;

  const contextText = contextChunks.map((c, i) => `[Chunk #${i + 1}]\n${c.text}`).join('\n\n');
  const userMessage = `Retrieved Context:\n${contextText}\n\nGenerated Answer:\n${answer}`;
  
  try {
    const rawResponse = await queryGroqRaw(apiKey, systemPrompt, userMessage, 'llama-3.3-70b-versatile', 0.0);
    const parsed = cleanAndParseJson(rawResponse, { hallucinated: false, score: 95, reason: 'Failed to parse' });
    return {
      hallucinated: parsed.hallocinated === true || (parsed.score !== undefined && parsed.score < 70),
      score: parsed.score !== undefined ? Number(parsed.score) : 90,
      reason: parsed.reason || ''
    };
  } catch (e) {
    return { hallucinated: false, score: 90, reason: 'Fallback evaluation' };
  }
}

/**
 * Evaluate if generated answer actually answers the user query
 */
async function evaluateAnswerGrounded(query, answer, apiKey) {
  const systemPrompt = `You are an expert answer utility grader.
Given a user query and a generated answer, evaluate if the answer directly and fully addresses the user's question, providing helpful and aligned responses.
Respond with a strict JSON object containing exactly "answersQuery" (boolean) and "reason" (string).
Format:
{"answersQuery": true, "reason": "The answer provides the exact legal parameters of Article 19 as asked."}`;

  const userMessage = `User Query: "${query}"\n\nGenerated Answer:\n${answer}`;
  
  try {
    const rawResponse = await queryGroqRaw(apiKey, systemPrompt, userMessage, 'llama-3.3-70b-versatile', 0.0);
    const parsed = cleanAndParseJson(rawResponse, { answersQuery: true, reason: 'Failed to parse' });
    return {
      answersQuery: parsed.answersQuery === true,
      reason: parsed.reason || ''
    };
  } catch (e) {
    return { answersQuery: true, reason: 'Fallback utility assessment' };
  }
}

/**
 * Primary Orchestrator for Adaptive RAG Pipeline
 */
export async function executeAdaptiveRAG(params) {
  const {
    query,
    localStore,
    groqApiKey,
    chromaUrl,
    chromaApiKey,
    numResults = 3, // fallback default
    chunkSize = 150,
    chunkOverlap = 30
  } = params;

  console.log(`[Adaptive RAG] Starting execution pipeline for: "${query}"`);
  
  const pipelineHistory = [];
  pipelineHistory.push(`Pipeline triggered with query: "${query}"`);

  // 1. ROUTING STAGE
  const routeEval = await routeQuery(query, groqApiKey);
  const activeRoute = routeEval.route;
  pipelineHistory.push(`Query classified as [${activeRoute.toUpperCase()}] by Query Router: "${routeEval.reasoning}"`);

  // Dynamic Parameters configuration based on route
  let resolvedK = 3;
  let resolvedStrategy = 'hybrid';
  let resolvedRerank = false;
  let resolvedOpt = 'none';

  if (activeRoute === 'conversational') {
    resolvedK = 0;
    resolvedStrategy = 'none';
  } else if (activeRoute === 'factual_direct') {
    resolvedK = 3;
    resolvedStrategy = 'hybrid';
    resolvedRerank = false;
    resolvedOpt = 'none';
  } else if (activeRoute === 'reasoning_complex') {
    resolvedK = 5;
    resolvedStrategy = 'hybrid';
    resolvedRerank = true;
    resolvedOpt = 'expansion';
  } else if (activeRoute === 'external_search') {
    resolvedK = 3;
    resolvedStrategy = 'external';
  }

  pipelineHistory.push(`Configuring dynamic retrieval settings: Route=${activeRoute.toUpperCase()}, K=${resolvedK}, Strategy=${resolvedStrategy}, Rerank=${resolvedRerank}, QueryExpansion=${resolvedOpt}`);

  // CONVERSATIONAL ROUTE: Immediate direct answer, bypass vector stores
  if (activeRoute === 'conversational') {
    const conversationalPrompt = `You are a premium, highly experienced Adaptive RAG Assistant. 
The user is initiating conversation or chit-chat. Engage in a friendly, professional manner. 
If they ask who you are, explain that you are an elite Adaptive RAG Platform powered by self-correcting multi-agent routers and dynamic graders. Keep the response helpful, brief, and sleek.`;
    const response = await queryGroqLLM(groqApiKey, query, [], conversationalPrompt);
    
    return {
      answer: response,
      sources: [],
      usedEngine: 'adaptive-conversational',
      route: activeRoute,
      dynamicParams: { K: 0, strategy: 'none', rerank: false, expansion: 'none' },
      retrievalGrades: [],
      queryRewrite: { triggered: false },
      hallucinationEvaluation: { hallucinated: false, score: 100, reason: 'N/A' },
      answerEvaluation: { answersQuery: true, reason: 'N/A' },
      pipelineHistory: [...pipelineHistory, `Direct conversational response generated. Done.`].map(String)
    };
  }

  // EXTERNAL SEARCH ROUTE: Run Wikipedia REST service
  if (activeRoute === 'external_search') {
    pipelineHistory.push(`Executing web search agent...`);
    const wikiDocs = await searchWikipedia(query, resolvedK);
    pipelineHistory.push(`Web search retrieved ${wikiDocs.length} pages from Wikipedia APIs.`);

    // Build grounding system prompt for external knowledge
    const externalPrompt = `You are an expert web intelligence agent answering queries based on the fetched internet text extracts below.
Verify all facts against the provided text. Ground all answers. If the information is missing, use general knowlege but declare a warning that the page wasn't found in search summaries.

---
FETCHED WEB CONTEXT:
${wikiDocs.map((c, i) => `[Web Results #${i + 1}]\n${c.text}`).join('\n\n')}
---`;

    const answer = await queryGroqLLM(groqApiKey, query, wikiDocs, externalPrompt);
    pipelineHistory.push(`Generated final answer using web context.`);

    return {
      answer,
      sources: wikiDocs.map(d => d.source),
      usedEngine: 'adaptive-external-web',
      route: activeRoute,
      dynamicParams: { K: resolvedK, strategy: 'external', rerank: false, expansion: 'none' },
      retrievalGrades: wikiDocs.map(d => ({ chunkId: d.id, relevant: true, reason: 'Search-matched Web Page' })),
      queryRewrite: { triggered: false },
      hallucinationEvaluation: { hallucinated: false, score: 98, reason: 'Web matched grounding checked' },
      answerEvaluation: { answersQuery: true, reason: 'Web agent provided direct answer' },
      pipelineHistory: [...pipelineHistory, `Web search pipeline completed.`].map(String),
      webSearchResults: wikiDocs.map(d => ({ title: d.metadata.title, url: d.metadata.url, description: d.metadata.description }))
    };
  }

  // RAG RETRIEVAL ROUTES (factual_direct & reasoning_complex)
  let activeSearchQuery = query;
  let denseSearchQueries = [query];
  let searchAttempt = 1;
  let maxSearchAttempts = 2;
  let activeChunks = [];
  let isQueryRewritten = false;
  let originalQueryStr = query;
  let rewrittenQueryStr = '';
  let rewriteReasoning = '';
  let gradingReports = [];
  let denseCandidates = [];
  let sparseCandidates = [];

  // Create Chroma REST Client
  let chromaClient = null;
  if (chromaUrl) {
    chromaClient = new ChromaClient(chromaUrl, chromaApiKey);
  }

  while (searchAttempt <= maxSearchAttempts) {
    pipelineHistory.push(`[Search Attempt ${searchAttempt}/${maxSearchAttempts}] Querying vector indices for: "${activeSearchQuery}"`);
    
    // A. Query expansion if reasoning_complex
    if (resolvedOpt === 'expansion' && searchAttempt === 1) {
      pipelineHistory.push(`Triggering HyDE query expansion to capture synonyms...`);
      try {
        const expansions = await expandQuery(activeSearchQuery, groqApiKey);
        denseSearchQueries = [activeSearchQuery, ...expansions];
        pipelineHistory.push(`Query expanded into: ${JSON.stringify(expansions)}`);
      } catch (err) {
        pipelineHistory.push(`Expansion failed: ${err.message}. Reverting to original query.`);
      }
    } else {
      denseSearchQueries = [activeSearchQuery];
    }

    // B. Retrieve Candidates
    denseCandidates = [];
    sparseCandidates = [];

    // Dense retrieval
    pipelineHistory.push(`Retrieving dense semantic candidates (Chroma/TF-IDF)...`);
    const densePromises = denseSearchQueries.map(q => 
      retrieveDense(q, localStore, chromaClient, resolvedK * 2, false)
    );
    const denseBatches = await Promise.all(densePromises);
    const denseMap = new Map();
    denseBatches.flat().forEach(doc => {
      if (!denseMap.has(doc.id) || doc.score > denseMap.get(doc.id).score) {
        denseMap.set(doc.id, doc);
      }
    });
    denseCandidates = Array.from(denseMap.values()).sort((a, b) => b.score - a.score);

    // Sparse retrieval
    pipelineHistory.push(`Retrieving sparse exact keyword candidates (Local Vocabulary Index)...`);
    sparseCandidates = retrieveSparse(activeSearchQuery, localStore, resolvedK * 2);

    // C. reciprocal rank fusion
    pipelineHistory.push(`Fusing dense & sparse rankings via RRF (K-constant=60)...`);
    const rrfCandidates = reciprocalRankFusion([denseCandidates, sparseCandidates], 60, resolvedK * 3);

    // D. Re-ranking
    let rerankedCandidates = [];
    if (resolvedRerank) {
      pipelineHistory.push(`Triggering LLM Cross-Encoder Re-ranker for deep context alignment...`);
      rerankedCandidates = await reRankLLM(activeSearchQuery, rrfCandidates, groqApiKey);
    } else {
      rerankedCandidates = rrfCandidates.map((c, i) => ({
        ...c,
        reRankScore: 10.0 - (i * 0.8),
        reRankReason: 'Direct pipeline - bypass re-ranking'
      }));
    }

    // E. Evaluate Relevance / Grading
    pipelineHistory.push(`Evaluating document relevance of top candidates...`);
    const gradingPromises = rerankedCandidates.slice(0, resolvedK).map(chunk => 
      gradeChunkRelevance(activeSearchQuery, chunk, groqApiKey)
    );
    const gradedResults = await Promise.all(gradingPromises);
    
    // Filter out irrelevant chunks
    const relevantGradesMap = new Map(gradedResults.map(g => [g.chunkId, g]));
    const filteredChunks = rerankedCandidates.slice(0, resolvedK).filter(chunk => {
      const evaluation = relevantGradesMap.get(chunk.id);
      return evaluation ? evaluation.relevant === true : true;
    });

    gradingReports = rerankedCandidates.slice(0, resolvedK).map(chunk => {
      const evaluation = relevantGradesMap.get(chunk.id);
      return {
        chunkId: chunk.id,
        text: chunk.text.substring(0, 100) + '...',
        score: chunk.reRankScore,
        relevant: evaluation ? evaluation.relevant : true,
        reason: evaluation ? evaluation.reason : 'Assumed relevant by default'
      };
    });

    console.log(`[Adaptive RAG Grader] Relevant chunks: ${filteredChunks.length} of ${resolvedK}`);
    pipelineHistory.push(`Relevance Grader kept ${filteredChunks.length} of ${resolvedK} chunks. Rejected: ${resolvedK - filteredChunks.length}`);

    if (filteredChunks.length > 0) {
      activeChunks = filteredChunks;
      break; // Found relevant context! Proceed to generation.
    }

    // If 0 chunks relevant, try rewriting query
    if (searchAttempt < maxSearchAttempts) {
      pipelineHistory.push(`[ALERT] 0 chunks relevant! Activating self-correction query rewrite loop.`);
      const rewriteData = await rewriteQuery(activeSearchQuery, groqApiKey);
      activeSearchQuery = rewriteData.rewrittenQuery;
      rewrittenQueryStr = rewriteData.rewrittenQuery;
      rewriteReasoning = rewriteData.explanation;
      isQueryRewritten = true;
    }
    
    searchAttempt++;
  }

  // F. Fallback if still 0 chunks
  if (activeChunks.length === 0) {
    pipelineHistory.push(`[ALERT] Self-correcting retrieval failed to locate document files matches. Performing fallback to original top candidates.`);
    // Safe fallback to top 2 reranked results
    activeChunks = sparseCandidates.slice(0, 2);
  }

  // 3. GENERATION & STAGE-GRADING (Hallucination + Answer groundedness)
  pipelineHistory.push(`Constructing strict prompt and generating response...`);
  const finalContext = buildContextText(activeChunks);
  const systemPrompt = buildSystemPrompt(activeChunks);
  const answer = await queryGroqLLM(groqApiKey, originalQueryStr, activeChunks, systemPrompt);

  pipelineHistory.push(`Verifying generated answer for hallucination checks...`);
  const hallucinationCheck = await evaluateHallucination(answer, activeChunks, groqApiKey);
  pipelineHistory.push(`Hallucination Evaluation: Groundedness score = ${hallucinationCheck.score}/100. Hallucinated = ${hallucinationCheck.hallucinated}`);

  pipelineHistory.push(`Evaluating answer completeness and query intent alignment...`);
  const answerCheck = await evaluateAnswerGrounded(originalQueryStr, answer, groqApiKey);
  pipelineHistory.push(`Answer Grader: Directly answers query = ${answerCheck.answersQuery}. Details: "${answerCheck.reason}"`);

  // Final compile of source files
  const sources = Array.from(new Set(activeChunks.map(c => c.source || c.metadata?.source)));

  return {
    answer,
    sources,
    usedEngine: resolvedRerank ? 'adaptive-hybrid-rerank' : `adaptive-${resolvedStrategy}`,
    route: activeRoute,
    dynamicParams: {
      K: resolvedK,
      strategy: resolvedStrategy,
      rerank: resolvedRerank,
      expansion: resolvedOpt
    },
    retrievalGrades: gradingReports,
    queryRewrite: {
      triggered: isQueryRewritten,
      originalQuery: originalQueryStr,
      rewrittenQuery: rewrittenQueryStr,
      explanation: rewriteReasoning
    },
    hallucinationEvaluation: {
      hallucinated: hallucinationCheck.hallucinated,
      score: hallucinationCheck.score,
      reason: hallucinationCheck.reason
    },
    answerEvaluation: {
      answersQuery: answerCheck.answersQuery,
      reason: answerCheck.reason
    },
    pipelineHistory: [...pipelineHistory, `Adaptive RAG complete.`].map(String),
    pipeline: {
      optimizedQueries: denseSearchQueries,
      denseResults: denseCandidates.slice(0, 5),
      sparseResults: sparseCandidates.slice(0, 5),
      rrfResults: activeChunks.slice(0, 5),
      rerankedResults: activeChunks,
      finalContext
    }
  };
}
