import { expandQuery } from './query-optimizer.js';
import { retrieveDense, retrieveSparse } from './hybrid-retriever.js';
import { reciprocalRankFusion } from './rrf-fusion.js';
import { reRankLLM } from './llm-reranker.js';
import { filterContext } from './context-filter.js';
import { buildContextText, buildSystemPrompt } from './prompt-builder.js';
import { queryGroqLLM } from '../services/groq-service.js';
import { ChromaClient } from '../services/chroma-service.js';

/**
 * Orchestrates the full Advanced RAG Pipeline systematically
 * 
 * Pipeline Order:
 * 1. User Query
 * 2. Query Optimization (HyDE or Expansion)
 * 3. Hybrid Retrieval (Dense & Sparse)
 * 4. Reciprocal Rank Fusion (RRF)
 * 5. LLM Re-ranking
 * 6. Context Filtering
 * 7. Prompt Construction
 * 8. Final LLM Generation
 * 
 * @param {Object} params - Pipeline parameters
 * @returns {Promise<Object>} Final answer and detailed pipeline inspection telemetry
 */
export async function executeAdvancedRAG(params) {
  const {
    query,
    localStore,
    groqApiKey,
    chromaUrl,
    chromaApiKey,
    optimizationType = 'none', // 'none' | 'expansion' | 'hyde'
    searchStrategy = 'hybrid', // 'dense' | 'sparse' | 'hybrid'
    isReRankingEnabled = false,
    numResults = 3,            // Final Top-K chunks to retrieve
    chunkSize = 150,
    chunkOverlap = 30
  } = params;

  console.log(`[Advanced RAG Orchestrator] Executing pipeline for query: "${query}"`);
  console.log(`[Config] OptType=${optimizationType}, Strategy=${searchStrategy}, Rerank=${isReRankingEnabled}, FinalK=${numResults}`);

  // Create Chroma REST instance if config provided
  let chromaClient = null;
  if (chromaUrl) {
    chromaClient = new ChromaClient(chromaUrl, chromaApiKey);
  }

  // --- STAGE 1: QUERY OPTIMIZATION ---
  let optimizedQueries = [query];
  let denseSearchQueries = [query];

  if (optimizationType === 'expansion') {
    const expansions = await expandQuery(query, groqApiKey);
    optimizedQueries = [...expansions];
    denseSearchQueries = [query, ...expansions]; // Include original + expanded queries
  }

  // --- STAGE 2: HYBRID RETRIEVAL ---
  let denseResults = [];
  let sparseResults = [];

  // A. Dense retrieval (run on optimized queries for semantic matching)
  if (searchStrategy === 'dense' || searchStrategy === 'hybrid') {
    // Run retrieval for each query variation and pool them
    const retrievalPromises = denseSearchQueries.map(q => 
      retrieveDense(q, localStore, chromaClient, numResults * 2, false)
    );
    const denseBatches = await Promise.all(retrievalPromises);
    
    // Deduplicate pooled dense results based on chunk ID
    const denseMap = new Map();
    denseBatches.flat().forEach(doc => {
      if (!denseMap.has(doc.id) || doc.score > denseMap.get(doc.id).score) {
        denseMap.set(doc.id, doc);
      }
    });
    denseResults = Array.from(denseMap.values()).sort((a, b) => b.score - a.score);
  }

  // B. Sparse retrieval (run on original query keywords for precise matching)
  if (searchStrategy === 'sparse' || searchStrategy === 'hybrid') {
    sparseResults = retrieveSparse(query, localStore, numResults * 2);
  }

  // --- STAGE 3: RECIPROCAL RANK FUSION (RRF) ---
  let rrfResults = [];
  if (searchStrategy === 'hybrid') {
    // Blend dense and sparse rank results using RRF
    rrfResults = reciprocalRankFusion([denseResults, sparseResults], 60, numResults * 3);
  } else if (searchStrategy === 'dense') {
    // Pass dense results forward as merged, mapping rank index to fusion score stub
    rrfResults = denseResults.map((doc, idx) => ({
      ...doc,
      score: 1 / (60 + idx + 1)
    })).slice(0, numResults * 3);
  } else {
    // Pass sparse results forward as merged
    rrfResults = sparseResults.map((doc, idx) => ({
      ...doc,
      score: 1 / (60 + idx + 1)
    })).slice(0, numResults * 3);
  }

  // --- STAGE 4: LLM RE-RANKER ---
  let rerankedResults = [];
  if (isReRankingEnabled) {
    // Score the fused candidates via the LLM Cross-Encoder
    rerankedResults = await reRankLLM(query, rrfResults, groqApiKey);
  } else {
    // Fallback mapping original rank values
    rerankedResults = rrfResults.map(c => ({
      ...c,
      reRankScore: 10.0 - (c.score * 10), // artificial score for UI consistency
      reRankReason: 'Re-ranking disabled'
    }));
  }

  // --- STAGE 5: CONTEXT FILTERING ---
  // Drop irrelevant chunks to prevent hallucination risk
  const filteredChunks = filterContext(rerankedResults, {
    minReRankScore: 4.0,
    minRrfScore: 0.01,
    isReRankingEnabled: isReRankingEnabled
  }).slice(0, numResults); // Slice down to target Top-K numResults after filtering

  // Fallback chunking if everything got filtered out
  const activeChunks = filteredChunks.length > 0 
    ? filteredChunks 
    : rerankedResults.slice(0, numResults); // safe fallback to original top results

  // --- STAGE 6 & 7: PROMPT CONSTRUCTION ---
  const finalContext = buildContextText(activeChunks);
  const systemPrompt = buildSystemPrompt(activeChunks);

  // --- STAGE 8: FINAL LLM GENERATION ---
  console.log(`[Advanced RAG Orchestrator] Generating final response with ${activeChunks.length} contexts...`);
  const answer = await queryGroqLLM(groqApiKey, query, activeChunks, systemPrompt);

  // Collect source documents list
  const sources = Array.from(new Set(activeChunks.map(c => c.source || c.metadata?.source)));

  return {
    answer,
    sources,
    usedEngine: isReRankingEnabled ? 'advanced-hybrid-rerank' : `advanced-${searchStrategy}`,
    pipeline: {
      optimizedQueries,
      denseResults: denseResults.slice(0, 10),
      sparseResults: sparseResults.slice(0, 10),
      rrfResults: rrfResults.slice(0, 10),
      rerankedResults: rerankedResults.slice(0, 10),
      finalContext
    }
  };
}
