import API_BASE from '../config/api';

/**
 * Helper to safely handle fetch responses, parse JSON, and format human-readable errors
 */
async function handleResponse(response, fallbackMsg = 'API request failed') {
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    // Catch HTML/plain text error pages and extract clean summaries
    console.error("[JSON Parsing Failed]:", text);
    const shortText = text.replace(/<[^>]*>/g, '').trim().substring(0, 150);
    throw new Error(`${fallbackMsg} (HTTP ${response.status}): ${shortText || 'Unparseable response'}`);
  }

  if (!response.ok) {
    throw new Error(data.error || `${fallbackMsg} (HTTP ${response.status})`);
  }

  return data;
}

/**
 * Service to execute Advanced RAG queries
 */
export async function queryRAG(params) {
  const response = await fetch(`${API_BASE}/api/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(params)
  });

  return await handleResponse(response, 'RAG query failed');
}

/**
 * Service to trigger document parsing and indexing
 */
export async function triggerIndexing(params) {
  const response = await fetch(`${API_BASE}/api/index-existing`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(params)
  });

  return await handleResponse(response, 'Indexing documents failed');
}

/**
 * Service to fetch system and indexing status
 */
export async function fetchSystemStatus(chromaUrl, chromaApiKey) {
  const queryStr = `chromaUrl=${encodeURIComponent(chromaUrl)}&chromaApiKey=${encodeURIComponent(chromaApiKey)}`;
  const response = await fetch(`${API_BASE}/api/status?${queryStr}`);
  
  return await handleResponse(response, 'Fetching system status failed');
}
