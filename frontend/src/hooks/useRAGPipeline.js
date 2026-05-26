import { useState, useEffect } from 'react';
import { queryRAG, triggerIndexing, fetchSystemStatus } from '../services/api';

export function useRAGPipeline() {
  // Config & API Credentials
  const [groqApiKey, setGroqApiKey] = useState(() => localStorage.getItem('groq_api_key') || '');
  const [chromaUrl, setChromaUrl] = useState(() => localStorage.getItem('chroma_url') || 'http://localhost:8000');
  const [chromaApiKey, setChromaApiKey] = useState(() => localStorage.getItem('chroma_api_key') || '');

  // Advanced RAG Parameters
  const [optimizationType, setOptimizationType] = useState('none'); // 'none' | 'expansion'
  const [searchStrategy, setSearchStrategy] = useState('hybrid');   // 'dense' | 'sparse' | 'hybrid'
  const [isReRankingEnabled, setIsReRankingEnabled] = useState(false);
  const [chunkSize, setChunkSize] = useState(150);
  const [chunkOverlap, setChunkOverlap] = useState(30);
  const [numResults, setNumResults] = useState(3);

  // Operational States
  const [chatHistory, setChatHistory] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Welcome to the Advanced RAG platform. Please upload/index your documents to start querying with state-of-the-art hybrid search and re-ranking.',
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
        chunkSize,
        chunkOverlap,
        chromaUrl,
        chromaApiKey
      });
      if (data.success) {
        setAlert({ type: 'success', message: 'Document split and vector database loaded successfully!' });
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
        optimizationType,
        searchStrategy,
        isReRankingEnabled,
        numResults,
        chunkSize,
        chunkOverlap,
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
            pipeline: data.pipeline || null
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
    optimizationType,
    setOptimizationType,
    searchStrategy,
    setSearchStrategy,
    isReRankingEnabled,
    setIsReRankingEnabled,
    chunkSize,
    setChunkSize,
    chunkOverlap,
    setChunkOverlap,
    numResults,
    setNumResults,
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
