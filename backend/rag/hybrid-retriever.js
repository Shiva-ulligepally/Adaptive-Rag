import { createStandardDocument } from './types.js';
import { extractArticleMatch } from '../utils/scoring.js';

/**
 * Performs Dense Semantic Retrieval using Chroma DB (primary) or Local TF-IDF cosine similarity (fallback)
 * @param {string} query 
 * @param {Object} localStore - Stateful local TF-IDF vector database
 * @param {Object} chromaClient - Chroma Client instance
 * @param {number} numResults 
 * @param {boolean} forceLocal - If true, bypasses Chroma check
 * @returns {Promise<Array>} list of standardized document objects
 */
export async function retrieveDense(query, localStore, chromaClient, numResults = 5, forceLocal = false) {
  let rawResults = [];
  let retrievalType = 'dense-local';

  if (!forceLocal && chromaClient) {
    const chromaHealthy = await chromaClient.checkHealth();
    if (chromaHealthy) {
      try {
        console.log(`[Hybrid Retriever] Retrieving from Chroma DB vector space...`);
        const chromaResults = await chromaClient.querySimilarity(query, numResults);
        rawResults = chromaResults.map(r => ({
          chunk: r.chunk,
          score: r.score
        }));
        retrievalType = 'dense-chroma';
      } catch (err) {
        console.error(`[Hybrid Retriever] Chroma DB dense query failed: ${err.message}. Falling back to local dense.`);
      }
    }
  }

  // Fallback / standard local vector similarity matching (TF-IDF + Cosine Similarity)
  if (rawResults.length === 0) {
    console.log(`[Hybrid Retriever] Retrieving from Local Vector Store (TF-IDF Cosine)...`);
    const similarityResults = localStore.searchSimilarity(query, numResults);
    rawResults = similarityResults.map(r => ({
      chunk: r.chunk,
      score: r.score
    }));
    retrievalType = 'dense-local';
  }

  // Format into standardized objects
  return rawResults.map(r => createStandardDocument(r.chunk, r.score, retrievalType));
}

/**
 * Performs Sparse Keyword Search using token exact-matching and legal article boosts
 * @param {string} query 
 * @param {Object} localStore - Stateful local vector database containing chunk vocabulary
 * @param {number} numResults 
 * @returns {Array} list of standardized document objects
 */
export function retrieveSparse(query, localStore, numResults = 5) {
  console.log(`[Hybrid Retriever] Retrieving from Local Sparse Search...`);
  const sparseResults = localStore.searchKeyword(query, numResults);
  
  return sparseResults.map(r => createStandardDocument(r.chunk, r.score, 'sparse-keyword'));
}
