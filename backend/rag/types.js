/**
 * Standardizes a retrieved document chunk for the Advanced RAG pipeline
 * @param {Object} chunk - The source chunk { id, text, metadata }
 * @param {number} score - The retrieval/fusion score
 * @param {string} retrievalType - 'dense' | 'sparse' | 'hybrid'
 * @returns {Object} standardized document object
 */
export function createStandardDocument(chunk, score = 0.0, retrievalType = 'dense') {
  return {
    id: chunk.id || '',
    text: chunk.text || '',
    score: Number(score) || 0.0,
    source: chunk.metadata?.source || 'Unknown Source',
    retrievalType: retrievalType,
    metadata: chunk.metadata || {}
  };
}
