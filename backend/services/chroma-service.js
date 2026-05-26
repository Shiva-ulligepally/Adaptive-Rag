/**
 * Chroma DB REST Client Integration
 */
export class ChromaClient {
  constructor(url = 'http://localhost:8000', apiKey = '') {
    this.baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    this.apiKey = apiKey;
    this.collectionName = 'constitution_part3_rag';
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
      headers['x-chroma-token'] = this.apiKey;
    }
    return headers;
  }

  async checkHealth() {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1`, { 
        method: 'GET',
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(3000) // 3s timeout
      });
      return response.ok;
    } catch (e) {
      return false;
    }
  }

  async getOrCreateCollection() {
    const response = await fetch(`${this.baseUrl}/api/v1/collections`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        name: this.collectionName,
        metadata: { "description": "Collection for simple constitution RAG" },
        get_or_create: true
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get/create Chroma collection: ${errorText}`);
    }

    return await response.json();
  }

  async addDocuments(chunks) {
    const collection = await this.getOrCreateCollection();
    const collectionId = collection.id;

    const payload = {
      ids: chunks.map(c => c.id),
      documents: chunks.map(c => c.text),
      metadatas: chunks.map(c => ({
        startWord: c.metadata.startWord,
        endWord: c.metadata.endWord,
        article: c.metadata.article || null,
        source: c.metadata.source || null
      }))
    };

    const response = await fetch(`${this.baseUrl}/api/v1/collections/${collectionId}/add`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Chroma DB add error: ${errorText}`);
    }

    return await response.json();
  }

  async querySimilarity(queryText, nResults = 3) {
    const collection = await this.getOrCreateCollection();
    const collectionId = collection.id;

    const response = await fetch(`${this.baseUrl}/api/v1/collections/${collectionId}/query`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        query_texts: [queryText],
        n_results: nResults
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Chroma DB query error: ${errorText}`);
    }

    const data = await response.json();
    const results = [];
    if (data.documents && data.documents[0]) {
      for (let i = 0; i < data.documents[0].length; i++) {
        results.push({
          chunk: {
            id: data.ids[0][i],
            text: data.documents[0][i],
            metadata: data.metadatas[0][i] || {}
          },
          score: data.distances ? (1 - data.distances[0][i]) : 0.8
        });
      }
    }
    return results;
  }
}
