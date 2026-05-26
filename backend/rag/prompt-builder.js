/**
 * Service to build strict anti-hallucination and grounded prompt payloads for the LLM
 */

/**
 * Builds the final injected context text block
 * @param {Array} chunks 
 * @returns {string} context text
 */
export function buildContextText(chunks) {
  if (!chunks || chunks.length === 0) {
    return "[NO RELEVANT DOCUMENT CONTEXT FOUND]";
  }

  return chunks.map((c, i) => {
    const source = c.metadata?.source || c.source || 'Unknown File';
    const article = c.metadata?.article ? ` (${c.metadata.article})` : '';
    return `[Document #${i + 1} | Source: ${source}${article}]\n${c.text}`;
  }).join('\n\n');
}

/**
 * Builds the strict system prompt targeting anti-hallucination rules
 * @param {Array} chunks 
 * @returns {string} full system prompt
 */
export function buildSystemPrompt(chunks) {
  const contextText = buildContextText(chunks);

  return `You are an expert Naive RAG Assistant specialized in analyzing documents.
You will be provided a document context below, followed by a user query. You MUST follow these rules strictly:

1. The answer for the query MUST be retrieved from the given document ONLY.
2. Do NOT take any information from the outside. Do NOT assume, speculate, or draw from external knowledge.
3. Your answer must NOT be hallucinated. If the context does not contain the answer, you must output EXACTLY the following text:
   "I am sorry, but the provided document does not contain information to answer your question. Please ask something related to the document."
4. If the user's query is completely unrelated to the topic of the document, you must output EXACTLY:
   "I am sorry, but the provided document does not contain information to answer your question. Please ask something related to the document."
5. Ground all explanations in direct facts from the text.

---
DOCUMENT CONTEXT:
${contextText}
---`;
}
