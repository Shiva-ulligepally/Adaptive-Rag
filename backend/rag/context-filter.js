/**
 * Filters retrieved document chunks to ensure only highly relevant, factual context is fed to the LLM
 * @param {Array} chunks - Document chunks (either RRF fused or LLM re-ranked)
 * @param {Object} options - Threshold options
 * @returns {Array} filtered document chunks
 */
export function filterContext(chunks, options = {}) {
  const {
    minReRankScore = 4.0, // Out of 10.0 for LLM Re-ranker
    minRrfScore = 0.01,    // Minimum fused RRF score for hybrid results
    isReRankingEnabled = false
  } = options;

  if (!chunks || chunks.length === 0) return [];

  console.log(`[Context Filter] Applying thresholds: isReRanking=${isReRankingEnabled}, minReRank=${minReRankScore}, minRrf=${minRrfScore}`);

  const filtered = chunks.filter(c => {
    // 1. Basic empty text check
    if (!c.text || c.text.trim() === '') {
      return false;
    }

    // 2. Threshold check based on active scoring mode
    if (isReRankingEnabled) {
      // Re-rank score check
      const score = c.reRankScore !== undefined ? c.reRankScore : 5.0;
      return score >= minReRankScore;
    } else {
      // RRF score check
      const score = c.score !== undefined ? c.score : 0.05;
      return score >= minRrfScore;
    }
  });

  console.log(`[Context Filter] Kept ${filtered.length} of ${chunks.length} chunks.`);
  return filtered;
}
