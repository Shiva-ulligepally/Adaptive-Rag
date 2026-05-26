/**
 * Combines multiple ranked retrieval results using Reciprocal Rank Fusion (RRF)
 * @param {Array<Array>} rankedLists - Array of arrays, where each sub-array is a list of standardized documents
 * @param {number} k - Fusion constant (default 60)
 * @param {number} topK - Maximum results to return
 * @returns {Array} fused and sorted standardized document objects
 */
export function reciprocalRankFusion(rankedLists, k = 60, topK = 5) {
  console.log(`[RRF Fusion] Blending ${rankedLists.length} rank streams with constant k = ${k}...`);
  const fusionScores = new Map(); // chunkId -> { doc, score, denseRank, sparseRank, rrfBreakdown }

  rankedLists.forEach((list, streamIndex) => {
    list.forEach((doc, rankIndex) => {
      const docId = doc.id;
      const rank = rankIndex + 1;
      const rrfScore = 1 / (k + rank);

      if (!fusionScores.has(docId)) {
        fusionScores.set(docId, {
          id: doc.id,
          text: doc.text,
          source: doc.source,
          metadata: doc.metadata || {},
          score: 0,
          denseRank: doc.retrievalType.startsWith('dense') ? rank : null,
          sparseRank: doc.retrievalType === 'sparse-keyword' ? rank : null,
          retrievalType: 'hybrid-rrf',
          rrfBreakdown: []
        });
      }

      const item = fusionScores.get(docId);
      item.score += rrfScore;
      item.rrfBreakdown.push({
        stream: doc.retrievalType,
        rank: rank,
        score: rrfScore
      });

      // Update specific rank trackers for visual inspection in the UI
      if (doc.retrievalType.startsWith('dense')) {
        item.denseRank = rank;
      } else if (doc.retrievalType === 'sparse-keyword') {
        item.sparseRank = rank;
      }
    });
  });

  // Sort by fusion score descending with a stable tie-breaker (alphabetical chunk ID)
  return Array.from(fusionScores.values())
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.id.localeCompare(b.id);
    })
    .slice(0, topK);
}
