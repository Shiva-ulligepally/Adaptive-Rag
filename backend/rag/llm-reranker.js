import { queryGroqRaw } from '../services/groq-service.js';

/**
 * Re-ranks retrieved document chunks using Groq LLM as a high-quality semantic evaluator
 * @param {string} query - Original user search query
 * @param {Array} chunks - Retrieved document chunks to score (e.g. top 8 candidates)
 * @param {string} apiKey - Groq API Key
 * @returns {Promise<Array>} re-ranked and graded chunks
 */
export async function reRankLLM(query, chunks, apiKey) {
  if (chunks.length === 0) return [];
  if (!apiKey || apiKey === 'your_groq_api_key_here') {
    console.warn("[LLM Re-ranker] Groq API Key is missing. Skipping re-ranking and returning original order.");
    return chunks.map(c => ({
      ...c,
      reRankScore: 10.0,
      reRankReason: 'Skipped - API Key missing'
    }));
  }

  // Cap candidates to optimize performance and prevent token overflow
  const candidates = chunks.slice(0, 10);
  console.log(`[LLM Re-ranker] Evaluating relevance for ${candidates.length} chunks against: "${query}"...`);

  const systemPrompt = `You are an expert search engine relevance evaluator (Cross-Encoder Re-ranker).
Given the user query, evaluate the relevance of each provided text passage for answering it.
Assign a score from 0.0 to 10.0 (10.0 is exceptionally relevant, contains direct facts to answer the question; 0.0 is completely irrelevant or noise).
Provide a brief 1-sentence justification for the score.

YOU MUST respond with a strict, valid JSON array of objects, containing ONLY "id", "score", and "reason" fields.
Ensure no markdown formatting (like \`\`\`json), no trailing commas, no greetings, and no conversations.
Format example:
[
  {"id": "chunk_0", "score": 9.5, "reason": "Contains direct legal article definition answering the query."},
  {"id": "chunk_1", "score": 3.0, "reason": "Mentions related topic but lacks specific answers."}
]`;

  const passagesText = candidates.map((c, i) => `--- PASSAGE ID: "${c.id}" ---\n${c.text}`).join('\n\n');
  const userMessage = `User Query: "${query}"\n\nPassages:\n${passagesText}`;

  try {
    const rawResponse = await queryGroqRaw(apiKey, systemPrompt, userMessage, 'llama-3.3-70b-versatile', 0.0);
    let parsedRankings = [];

    try {
      const cleanJson = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedRankings = JSON.parse(cleanJson);
    } catch (e) {
      console.warn(`[LLM Re-ranker] JSON parse failed, attempting regex parsing of chunks`);
      // Fallback: search for structured fields using regex
      const regex = /{\s*"id"\s*:\s*"([^"]+)"\s*,\s*"score"\s*:\s*([0-9.]+)\s*,\s*"reason"\s*:\s*"([^"]+)"\s*}/g;
      let match;
      while ((match = regex.exec(rawResponse)) !== null) {
        parsedRankings.push({
          id: match[1],
          score: parseFloat(match[2]),
          reason: match[3]
        });
      }
    }

    if (!Array.isArray(parsedRankings) || parsedRankings.length === 0) {
      throw new Error("No rankings parsed from LLM response.");
    }

    // Map LLM scores back to candidates
    const scoredMap = new Map(parsedRankings.map(r => [r.id, r]));

    const gradedResults = candidates.map(c => {
      const evaluation = scoredMap.get(c.id);
      return {
        ...c,
        reRankScore: evaluation ? Number(evaluation.score) : 1.0,
        reRankReason: evaluation ? evaluation.reason : 'No evaluation returned'
      };
    });

    // Sort by re-rank score descending
    const sortedResults = gradedResults.sort((a, b) => b.reRankScore - a.reRankScore);
    console.log(`[LLM Re-ranker] Graded scores:`, sortedResults.map(r => `${r.id}: ${r.reRankScore}`));
    return sortedResults;

  } catch (error) {
    console.error(`[LLM Re-ranker] Error during re-ranking: ${error.message}`);
    // Safe fallback: keep original list but mark as un-ranked
    return chunks.map(c => ({
      ...c,
      reRankScore: 5.0,
      reRankReason: `Fallback - Re-rank failed: ${error.message}`
    }));
  }
}
