import { queryGroqRaw } from '../services/groq-service.js';

// In-memory cache to prevent redundant LLM calls for identical queries
const optimizationCache = new Map();

/**
 * Normalizes query string to prevent whitespace/casing duplicate cache misses
 */
export function normalizeQuery(query) {
  if (!query) return '';
  return query.trim().toLowerCase().replace(/\s+/g, ' ');
}


/**
 * Generates 3 query expansions (alternative queries) using Groq LLM
 */
export async function expandQuery(query, apiKey) {
  const normalized = normalizeQuery(query);
  const cacheKey = `expansion_${normalized}`;
  
  if (optimizationCache.has(cacheKey)) {
    console.log(`[Query Optimizer] Expansion Cache Hit for: "${query}"`);
    return optimizationCache.get(cacheKey);
  }

  console.log(`[Query Optimizer] Generating query expansions for: "${query}"`);
  
  const systemPrompt = `You are a search query optimizer. Given the user query, output exactly 3 variations or synonym expansions of the query that cover different vocabulary choices or search intents.
You MUST output your response as a valid JSON array of strings containing exactly 3 items. Do not include any markdown styling, code block backticks (like \`\`\`json), or conversational filler.
Format example: ["alternative query 1", "alternative query 2", "alternative query 3"]`;
  const userMessage = `Query: "${query}"`;
  
  try {
    const responseText = await queryGroqRaw(apiKey, systemPrompt, userMessage, 'llama-3.3-70b-versatile', 0.0);
    let parsedArray = [];
    try {
      // Strip markdown code block markers if present
      const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedArray = JSON.parse(cleanJson);
    } catch (e) {
      console.warn(`[Query Optimizer] Failed parsing JSON from expansion response, trying regex match`);
      // Fallback regex parsing
      const matches = responseText.match(/"([^"\\]*(?:\\.[^"\\]*)*)"/g);
      if (matches && matches.length >= 3) {
        parsedArray = matches.slice(0, 3).map(m => m.slice(1, -1));
      }
    }

    // Clean and validate array
    const expansions = (Array.isArray(parsedArray) && parsedArray.length > 0)
      ? parsedArray.map(q => q.trim()).filter(Boolean).slice(0, 3)
      : [];

    if (expansions.length === 0) {
      throw new Error("No expansions extracted.");
    }

    // Store in cache
    optimizationCache.set(cacheKey, expansions);
    return expansions;
  } catch (error) {
    console.error(`[Query Optimizer] Query Expansion Failed: ${error.message}`);
    // Fallback to original query variations
    return [query, `${query} details`, `${query} explanation`].slice(0, 3);
  }
}
