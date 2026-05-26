import React, { useState, useRef, useEffect } from 'react';
import { useRAGPipeline } from './hooks/useRAGPipeline';

// Import Modular Parameter Components
import QueryOptimizerPanel from './components/QueryOptimizerPanel';
import RetrievalSettings from './components/RetrievalSettings';
import RerankToggle from './components/RerankToggle';

// Import Modular Inspector Stage Components
import QueryStage from './components/PipelineInspector/QueryStage';
import RetrievalStage from './components/PipelineInspector/RetrievalStage';
import RRFStage from './components/PipelineInspector/RRFStage';
import RerankStage from './components/PipelineInspector/RerankStage';
import PromptStage from './components/PipelineInspector/PromptStage';

function App() {
  const {
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
  } = useRAGPipeline();

  const [queryInput, setQueryInput] = useState('');
  const [showCreds, setShowCreds] = useState(false);
  const messagesEndRef = useRef(null);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isQuerying]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!queryInput.trim() || isQuerying) return;
    submitQuery(queryInput);
    setQueryInput('');
  };

  return (
    <div className="app-container">
      {/* SIDEBAR: Configuration Panel */}
      <aside className="sidebar glass-panel">
        <div className="brand">
          <div className="brand-icon">A</div>
          <div>
            <h1 className="brand-name">Advanced RAG</h1>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Enterprise Modular Architecture</p>
          </div>
        </div>

        {/* Server Status Health check */}
        <div className="glass-card status-widget">
          <div className="status-row">
            <span>RAG Backend:</span>
            <span className="status-value">
              <span className={`status-dot ${serverStatus.online ? 'active' : 'inactive'}`}></span>
              {serverStatus.online ? 'Online' : 'Offline'}
            </span>
          </div>
          <div className="status-row" style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
            <span>Document(s):</span>
            <span className="status-value" style={{ fontSize: '11px', color: serverStatus.pdfFound ? 'var(--accent-success)' : 'var(--accent-danger)', wordBreak: 'break-all', textAlign: 'left' }}>
              {serverStatus.pdfFound 
                ? (serverStatus.indexStats ? serverStatus.indexStats.fileName : 'PDFs Detected') 
                : 'Missing PDF'}
            </span>
          </div>
          <div className="status-row">
            <span>Index Status:</span>
            <span className="status-value" style={{ fontWeight: 600 }}>
              {serverStatus.isIndexed ? 'Indexed ✅' : 'Not Indexed ❌'}
            </span>
          </div>
          {serverStatus.isIndexed && serverStatus.indexStats && (
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '6px', marginTop: '4px' }}>
              <div>Chunks: {serverStatus.indexStats.chunkCount}</div>
              <div>Vocab Size: {serverStatus.indexStats.vocabularySize} words</div>
            </div>
          )}
        </div>

        {/* Collapsible API Credentials panel */}
        <div className="glass-card" style={{ padding: '10px' }}>
          <div 
            onClick={() => setShowCreds(!showCreds)} 
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}
          >
            <span>🔐 API Settings & Keys</span>
            <span>{showCreds ? '▼' : '▶'}</span>
          </div>

          {showCreds && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '11px' }}>Groq API Key</label>
                <input 
                  type="password" 
                  className="form-input" 
                  style={{ fontSize: '11px', padding: '6px 8px' }} 
                  placeholder="Paste Groq Key..." 
                  value={groqApiKey} 
                  onChange={(e) => setGroqApiKey(e.target.value)} 
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '11px' }}>Chroma URL</label>
                <input 
                  type="text" 
                  className="form-input" 
                  style={{ fontSize: '11px', padding: '6px 8px' }} 
                  value={chromaUrl} 
                  onChange={(e) => setChromaUrl(e.target.value)} 
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '11px' }}>Chroma Token</label>
                <input 
                  type="password" 
                  className="form-input" 
                  style={{ fontSize: '11px', padding: '6px 8px' }} 
                  placeholder="Optional Token..." 
                  value={chromaApiKey} 
                  onChange={(e) => setChromaApiKey(e.target.value)} 
                />
              </div>
            </div>
          )}
        </div>

        {/* RAG Tuning Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', borderTop: '1px solid var(--glass-border)', paddingTop: '14px' }}>
          <h2 className="section-title" style={{ margin: 0 }}>Advanced Pipeline Params</h2>
          
          {/* Stage 1 Optimizer selection */}
          <QueryOptimizerPanel value={optimizationType} onChange={setOptimizationType} />

          {/* Stage 2 & 3 Retrieval & chunking parameters */}
          <RetrievalSettings 
            strategy={searchStrategy} 
            setStrategy={setSearchStrategy}
            chunkSize={chunkSize}
            setChunkSize={setChunkSize}
            chunkOverlap={chunkOverlap}
            setChunkOverlap={setChunkOverlap}
            numResults={numResults}
            setNumResults={setNumResults}
          />

          {/* Stage 4 LLM Re-ranking */}
          <RerankToggle enabled={isReRankingEnabled} onChange={setIsReRankingEnabled} />
        </div>

        {/* Index Action Button */}
        <button
          className={`btn btn-primary ${isIndexing || !serverStatus.pdfFound ? 'btn-disabled' : ''}`}
          onClick={handleIndex}
          disabled={isIndexing || !serverStatus.pdfFound}
        >
          {isIndexing ? (
            <>
              <span className="loading-spinner"></span>
              Indexing...
            </>
          ) : (
            'Process & Index PDF'
          )}
        </button>

        {alert && (
          <div className={`alert-banner ${alert.type}`}>
            {alert.type === 'error' ? '⚠️' : '✅'} {alert.message}
          </div>
        )}
      </aside>

      {/* WORKSPACE Split: Chat + Inspector */}
      <main className="main-workspace">
        {/* Chat Section */}
        <div className="chat-container glass-panel">
          <header className="chat-header">
            <div className="chat-header-title">
              <h2>Advanced RAG Chat Room</h2>
              <p>Strict anti-hallucination context validation</p>
            </div>
            {serverStatus.chroma.connected && (
              <span className="inspect-badge" style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: 'var(--accent-success)' }}>
                Chroma DB Integrated
              </span>
            )}
          </header>

          {/* Messages feed */}
          <div className="chat-messages">
            {chatHistory.map((msg) => (
              <div
                key={msg.id}
                className={`message ${msg.role === 'user' ? 'message-user' : 'message-bot'} ${msg.isUnrelated ? 'unrelated' : ''}`}
              >
                {msg.role === 'assistant' && (
                  <div className="message-source-tag">
                    {msg.isUnrelated ? '⚠️ UNRELATED WARNING' : '📄 CONTEXT BOUND ANSWER'}
                  </div>
                )}
                <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                {msg.meta && (
                  <div className="message-meta">
                    <span>Engine: {msg.meta.engine || 'N/A'}</span>
                    <span style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {msg.inspector && (
                        <span
                          className="inspect-badge"
                          onClick={() => setActiveInspect(msg.inspector)}
                        >
                          Inspect RAG
                        </span>
                      )}
                      <span>{msg.meta.timestamp}</span>
                    </span>
                  </div>
                )}
              </div>
            ))}

            {isQuerying && (
              <div className="message message-bot" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="loading-spinner" style={{ borderColor: 'rgba(99, 102, 241, 0.3)', borderTopColor: 'var(--accent-secondary)' }}></span>
                <span style={{ color: 'var(--text-secondary)' }}>Executing advanced query optimization, hybrid fusion, and semantic reranking...</span>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Query Form Input */}
          <form onSubmit={handleSubmit} className="chat-input-area">
            <input
              className="chat-input"
              placeholder="Ask a question about Fundamental Rights (e.g. What is Article 19?)"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              disabled={isQuerying}
            />
            <button
              type="submit"
              className={`btn btn-primary ${isQuerying || !queryInput.trim() ? 'btn-disabled' : ''}`}
              disabled={isQuerying || !queryInput.trim()}
              style={{ width: '100px', height: '56px', borderRadius: '12px' }}
            >
              Ask
            </button>
          </form>
        </div>

        {/* RAG Inspector Panel */}
        <div className="inspector-panel glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <header className="inspector-header">
            <h2 className="inspector-title">
              <span className="inspector-pulse"></span>
              RAG Pipeline Inspector
            </h2>
          </header>

          {activeInspect ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h3 className="section-title" style={{ marginTop: 0 }}>Active Search Query</h3>
                <div style={{ fontSize: '14px', padding: '10px', background: 'var(--bg-secondary)', borderRadius: '6px', border: '1px solid var(--glass-border)', fontStyle: 'italic' }}>
                  "{activeInspect.userQuery}"
                </div>
              </div>

              {activeInspect.pipeline ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Stage 1: Query Optimizer Display */}
                  <QueryStage optimizedQueries={activeInspect.pipeline.optimizedQueries} />

                  {/* Stage 2: Hybrid Retrieval Display */}
                  <RetrievalStage 
                    denseResults={activeInspect.pipeline.denseResults} 
                    sparseResults={activeInspect.pipeline.sparseResults} 
                  />

                  {/* Stage 3: RRF Blending Display */}
                  <RRFStage rrfResults={activeInspect.pipeline.rrfResults} />

                  {/* Stage 4: LLM Re-ranking Display */}
                  <RerankStage rerankedResults={activeInspect.pipeline.rerankedResults} />

                  {/* Stage 5: Injected Prompt */}
                  <PromptStage 
                    systemPrompt={activeInspect.systemPrompt} 
                    finalContext={activeInspect.pipeline.finalContext} 
                  />
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                    ⚠️ This answer was generated using the old naive RAG query pipeline. Upgrade parameters in the sidebar to view advanced stage telemetry.
                  </div>
                  <PromptStage systemPrompt={activeInspect.systemPrompt} />
                </div>
              )}
            </div>
          ) : (
            <div className="empty-chat">
              <div className="empty-chat-icon">🔍</div>
              <p style={{ fontSize: '14px' }}>No active inspect session.</p>
              <p style={{ fontSize: '12px', padding: '0 20px' }}>Ask a question or click "Inspect RAG" on any answer in the chat logs to see full context injection logs.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
