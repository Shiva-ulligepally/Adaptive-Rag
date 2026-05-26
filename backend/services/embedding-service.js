import { tokenize } from '../utils/tokenizer.js';

/**
 * Service to generate local term frequency representation (sparse embeddings) for document indexing
 */
export function calculateTermFrequencies(text, vocabulary) {
  const words = tokenize(text);
  const tf = {};
  
  words.forEach(word => {
    tf[word] = (tf[word] || 0) + 1;
    if (vocabulary) vocabulary.add(word);
  });

  const docLength = words.length || 1;
  for (const word in tf) {
    tf[word] = tf[word] / docLength;
  }

  return tf;
}
