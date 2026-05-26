/**
 * Computes cosine similarity between two sparse vector maps
 * @param {Object} queryVector - Query TF-IDF vector
 * @param {Object} chunkVector - Chunk TF-IDF vector
 * @returns {number} similarity score
 */
export function computeCosineSimilarity(queryVector, chunkVector) {
  let dotProduct = 0;
  let queryNormSquare = 0;
  let chunkNormSquare = 0;

  // Since vectors are sparse maps, dot product is easy
  for (const word in queryVector) {
    if (chunkVector[word]) {
      dotProduct += queryVector[word] * chunkVector[word];
    }
    queryNormSquare += queryVector[word] * queryVector[word];
  }

  // Compute norm for chunk vector
  for (const word in chunkVector) {
    chunkNormSquare += chunkVector[word] * chunkVector[word];
  }

  const queryNorm = Math.sqrt(queryNormSquare);
  const chunkNorm = Math.sqrt(chunkNormSquare);

  return (chunkNorm > 0 && queryNorm > 0) 
    ? dotProduct / (chunkNorm * queryNorm) 
    : 0;
}

/**
 * Parses a query to look for exact legal article numbers
 * (e.g. "Article 19" or "19") for matching boosts
 * @param {string} query 
 * @returns {string|null} target article text
 */
export function extractArticleMatch(query) {
  if (!query) return null;
  const articleMatch = query.match(/\b(12|13|14|15|16|17|18|19|20|21|22|23|24|25|26|27|28|29|30|31|32|33|34|35)\b/);
  return articleMatch ? `Article ${articleMatch[1]}` : null;
}
