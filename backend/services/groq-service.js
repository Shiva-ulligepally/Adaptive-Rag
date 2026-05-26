import { traceable } from 'langsmith/traceable';

/**
 * Service to handle Groq LLM API integrations and completions
 */
export const queryGroqLLM = traceable(
  async function (apiKey, query, contextChunks, systemPromptOverride) {
    if (!apiKey || apiKey === 'your_groq_api_key_here') {
      throw new Error('Groq API Key is not configured. Please supply a valid Groq API Key.');
    }

    // Combine context chunks
    const contextText = contextChunks.map((c, i) => `[Chunk #${i + 1}]\n${c.text}`).join('\n\n');

    // Strict anti-hallucination system prompt as requested:
    // "the answer for the query should be from the given document only should NOT TAKE FROM THE OUTSIDE. and also the answer should not be hallucinated."
    const defaultSystemPrompt = `You are an expert Naive RAG Assistant specialized in analyzing documents.
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

    const systemPrompt = systemPromptOverride || defaultSystemPrompt;

    const requestBody = {
      model: 'llama-3.3-70b-versatile', // Groq's high capacity fast LLM
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
      ],
      temperature: 0.0, // Set temperature to 0 to minimize hallucinations and force deterministic answers
      max_tokens: 1024
    };

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const errMsg = errData.error?.message || `HTTP ${response.status} ${response.statusText}`;
        throw new Error(`Groq API Error: ${errMsg}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error(`[Groq LLM Error]: ${error.message}`);
      throw error;
    }
  },
  {
    name: "queryGroqLLM",
    run_type: "llm"
  }
);

/**
 * Performs general chat completions via Groq (used for optimization and ranking tasks)
 */
export async function queryGroqRaw(apiKey, systemPrompt, userMessage, model = 'llama-3.3-70b-versatile', temperature = 0.0) {
  if (!apiKey || apiKey === 'your_groq_api_key_here') {
    throw new Error('Groq API Key is missing.');
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature,
      response_format: model.includes('llama3') || model.includes('llama-3') ? undefined : { type: "json_object" }
    })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error?.message || `Groq API Error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}
