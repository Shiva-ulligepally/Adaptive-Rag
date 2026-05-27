import { useState, useEffect } from 'react';
import { queryRAG, triggerIndexing, fetchSystemStatus } from '../services/api';

export function useRAGPipeline() {
  // Config & API Credentials
  const [groqApiKey, setGroqApiKey] = useState(() => localStorage.getItem('groq_api_key') || '');
  const [chromaUrl, setChromaUrl] = useState(() => localStorage.getItem('chroma_url') || 'http://localhost:8000');
  const [chromaApiKey, setChromaApiKey] = useState(() => localStorage.getItem('chroma_api_key') || '');

  // Operational States
  const [chatHistory, setChatHistory] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Welcome to the Adaptive RAG arena. Query the knowledge base autonomously, inspect step-by-step cognitive evaluations, and observe query rewrites and grounding grading in real-time.',
      meta: { engine: 'system' }
    }
  ]);
  const [activeInspect, setActiveInspect] = useState(null);
  const [serverStatus, setServerStatus] = useState({
    online: false,
    pdfFound: false,
    isIndexed: false,
    indexStats: null,
    chroma: { connected: false, url: 'http://localhost:8000', collection: '' }
  });

  // Loading & Alert UI States
  const [isIndexing, setIsIndexing] = useState(false);
  const [isQuerying, setIsQuerying] = useState(false);
  const [alert, setAlert] = useState(null);

  // Save Credentials to localStorage
  useEffect(() => {
    localStorage.setItem('groq_api_key', groqApiKey);
  }, [groqApiKey]);

  useEffect(() => {
    localStorage.setItem('chroma_url', chromaUrl);
  }, [chromaUrl]);

  useEffect(() => {
    localStorage.setItem('chroma_api_key', chromaApiKey);
  }, [chromaApiKey]);

  // Status check
  const checkStatus = async () => {
    try {
      const data = await fetchSystemStatus(chromaUrl, chromaApiKey);
      setServerStatus({
        online: true,
        pdfFound: data.pdfFound,
        isIndexed: data.isIndexed,
        indexStats: data.indexStats,
        chroma: data.chroma
      });
    } catch (e) {
      setServerStatus(prev => ({ ...prev, online: false }));
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  }, [chromaUrl, chromaApiKey]);

  // Index Action
  const handleIndex = async () => {
    setIsIndexing(true);
    setAlert(null);
    try {
      const data = await triggerIndexing({
        chunkSize: 150,
        chunkOverlap: 30,
        chromaUrl,
        chromaApiKey
      });
      if (data.success) {
        setAlert({ type: 'success', message: 'Documents successfully chunked and vectorized!' });
        setServerStatus(prev => ({
          ...prev,
          isIndexed: true,
          indexStats: data.stats,
          chroma: { ...prev.chroma, connected: data.chroma.indexed }
        }));
      } else {
        setAlert({ type: 'error', message: data.error || 'Indexing failed.' });
      }
    } catch (err) {
      setAlert({ type: 'error', message: `Could not index documents: ${err.message}` });
    } finally {
      setIsIndexing(false);
    }
  };

  // Submit query
  const submitQuery = async (queryText) => {
    if (!queryText.trim() || isQuerying) return;

    setAlert(null);
    const userMessageId = `user_${Date.now()}`;
    const botMessageId = `bot_${Date.now()}`;

    // Add user message
    setChatHistory(prev => [
      ...prev,
      {
        id: userMessageId,
        role: 'user',
        content: queryText,
        meta: { timestamp: new Date().toLocaleTimeString() }
      }
    ]);

    setIsQuerying(true);

    try {
      const data = await queryRAG({
        query: queryText,
        numResults: 3,
        chunkSize: 150,
        chunkOverlap: 30,
        groqApiKey,
        chromaUrl,
        chromaApiKey
      });

      if (data.success) {
        const botMsg = {
          id: botMessageId,
          role: 'assistant',
          content: data.answer,
          isUnrelated: data.isUnrelated,
          meta: {
            timestamp: new Date().toLocaleTimeString(),
            engine: data.usedEngine,
            chunksCount: data.pipeline?.rerankedResults?.length || 0
          },
          inspector: {
            userQuery: queryText,
            systemPrompt: data.inspector?.systemPrompt || '',
            pipeline: data.pipeline || null,
            adaptive: data.adaptive || null
          }
        };

        setChatHistory(prev => [...prev, botMsg]);

        // Auto-select latest bot response for RAG Inspector
        setActiveInspect(botMsg.inspector);
        checkStatus(); // trigger refresh
      } else {
        setChatHistory(prev => [
          ...prev,
          {
            id: botMessageId,
            role: 'assistant',
            content: `⚠️ Error from server: ${data.error || 'Failed to generate answer.'}`,
            meta: { engine: 'system' }
          }
        ]);
      }
    } catch (err) {
      setChatHistory(prev => [
        ...prev,
        {
          id: botMessageId,
          role: 'assistant',
          content: `❌ RAG backend error: ${err.message}. Ensure backend is running and credentials are valid.`,
          meta: { engine: 'system' }
        }
      ]);
    } finally {
      setIsQuerying(false);
    }
  };

  return {
    groqApiKey,
    setGroqApiKey,
    chromaUrl,
    setChromaUrl,
    chromaApiKey,
    setChromaApiKey,
    chatHistory,
    activeInspect,
    setActiveInspect,
    serverStatus,
    isIndexing,
    isQuerying,
    alert,
    handleIndex,
    submitQuery
  };
}
