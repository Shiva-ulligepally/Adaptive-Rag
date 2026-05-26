import API_BASE from '../config/api';

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

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status} Error`);
  }
  return data;
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

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Indexing failed');
  }
  return data;
}

/**
 * Service to fetch system and indexing status
 */
export async function fetchSystemStatus(chromaUrl, chromaApiKey) {
  const queryStr = `chromaUrl=${encodeURIComponent(chromaUrl)}&chromaApiKey=${encodeURIComponent(chromaApiKey)}`;
  const response = await fetch(`${API_BASE}/api/status?${queryStr}`);
  
  if (!response.ok) {
    throw new Error('Server offline');
  }
  return await response.json();
}
