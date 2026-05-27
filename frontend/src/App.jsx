import React, { useState, useRef, useEffect } from 'react';
import { useRAGPipeline } from './hooks/useRAGPipeline';

// Import new RAG Visualizer
import RAGVisualizer from './components/RAGVisualizer';

function App() {
  const {
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
  } = useRAGPipeline();

  const [queryInput, setQueryInput] = useState('');
  const [showCreds, setShowCreds] = useState(false);
  const [inspectorTab, setInspectorTab] = useState('flow'); // 'flow' | 'prompt' | 'raw'
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
          <div className="brand-icon">🔄</div>
          <div>
            <h1 className="brand-name">Adaptive RAG</h1>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
              SELF-CORRECTING COGNITIVE FLOWS
            </p>
          </div>
        </div>

        {/* Server Status Health check */}
        <div className="glass-card status-widget">
          <div className="status-row">
            <span>RAG Core:</span>
            <span className="status-value">
              <span className={`status-dot ${serverStatus.online ? 'active' : 'inactive'}`}></span>
              {serverStatus.online ? 'Online' : 'Offline'}
            </span>
          </div>
          <div className="status-row" style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
            <span>Knowledge Base:</span>
            <span className="status-value" style={{ fontSize: '11px', color: serverStatus.pdfFound ? 'var(--accent-success)' : 'var(--accent-danger)', wordBreak: 'break-all', textAlign: 'left' }}>
              {serverStatus.pdfFound 
                ? (serverStatus.indexStats ? serverStatus.indexStats.fileName : 'PDFs Detected') 
                : 'Missing PDF'}
            </span>
          </div>
          <div className="status-row">
            <span>State Store:</span>
            <span className="status-value font-mono-style">
              {serverStatus.isIndexed ? 'Indexed ✅' : 'No Index ❌'}
            </span>
          </div>
          {serverStatus.isIndexed && serverStatus.indexStats && (
            <div className="stats-sub-row">
              <div>Vector Chunks: {serverStatus.indexStats.chunkCount}</div>
              <div>Vocabulary Size: {serverStatus.indexStats.vocabularySize} words</div>
            </div>
          )}
        </div>

        {/* Adaptive RAG Features Board */}
        <div className="adaptive-dashboard-card glass-card">
          <h4 className="dash-title">🛡️ Adaptive Agent Guards:</h4>
          <div className="dash-bullet">
            <span className="bullet-dot green"></span>
            <span><strong>LLM Intent Router:</strong> Classifies intent & determines retrieval necessity.</span>
          </div>
          <div className="dash-bullet">
            <span className="bullet-dot purple"></span>
            <span><strong>Query Planner:</strong> Reformulates terms recursively if context matches fail.</span>
          </div>
          <div className="dash-bullet">
            <span className="bullet-dot blue"></span>
            <span><strong>Vector Indexing:</strong> TFIDF Cosine & Chroma DB hybrid semantic retrievers.</span>
          </div>
          <div className="dash-bullet">
            <span className="bullet-dot pink"></span>
            <span><strong>Double Evaluation Guards:</strong> Groundedness checks & completeness audits.</span>
          </div>
          <div className="dash-bullet">
            <span className="bullet-dot cyan"></span>
            <span><strong>Web Search fallbacks:</strong> Integrated Wikipedia intelligence pages agent.</span>
          </div>
        </div>

        {/* Collapsible API Credentials panel */}
        <div className="glass-card" style={{ padding: '10px' }}>
          <div 
            onClick={() => setShowCreds(!showCreds)} 
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}
          >
            <span>🔐 API Settings & Secrets</span>
            <span>{showCreds ? '▼' : '▶'}</span>
          </div>

          {showCreds && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '10px' }}>Groq API Key</label>
                <input 
                  type="password" 
                  className="form-input" 
                  style={{ fontSize: '11px', padding: '6px 8px' }} 
                  placeholder="Paste gsk_..." 
                  value={groqApiKey} 
                  onChange={(e) => setGroqApiKey(e.target.value)} 
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '10px' }}>Chroma URL</label>
                <input 
                  type="text" 
                  className="form-input" 
                  style={{ fontSize: '11px', padding: '6px 8px' }} 
                  value={chromaUrl} 
                  onChange={(e) => setChromaUrl(e.target.value)} 
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '10px' }}>Chroma Token</label>
                <input 
                  type="password" 
                  className="form-input" 
                  style={{ fontSize: '11px', padding: '6px 8px' }} 
                  placeholder="Optional token" 
                  value={chromaApiKey} 
                  onChange={(e) => setChromaApiKey(e.target.value)} 
                />
              </div>
            </div>
          )}
        </div>

        {/* Index Action Button */}
        <button
          className={`btn btn-primary ${isIndexing || !serverStatus.pdfFound ? 'btn-disabled' : ''}`}
          onClick={handleIndex}
          disabled={isIndexing || !serverStatus.pdfFound}
          style={{ marginTop: 'auto' }}
        >
          {isIndexing ? (
            <>
              <span className="loading-spinner"></span>
              Structuring Documents...
            </>
          ) : (
            'Parse & Vectorize Library'
          )}
        </button>

        {alert && (
          <div className={`alert-banner ${alert.type}`} style={{ margin: '0' }}>
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
              <h2>Adaptive Arena</h2>
              <p>Graded, self-correcting cognitive search engine console</p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span className="route-badge-visual">
                🤖 Pure Adaptive RAG
              </span>
              {serverStatus.chroma.connected && (
                <span className="route-badge-visual green-badge">
                  Chroma DB Ready
                </span>
              )}
            </div>
          </header>

          {/* Messages feed */}
          <div className="chat-messages">
            {chatHistory.map((msg) => {
              const isAssistant = msg.role === 'assistant';
              const isSystem = msg.meta?.engine === 'system';
              const msgRoute = msg.inspector?.adaptive?.route;
              
              const routeLabel = isAssistant && !isSystem && msgRoute
                ? `[${msgRoute.toUpperCase()} ROUTE]`
                : `[COGNITIVE ACTION]`;

              return (
                <div
                  key={msg.id}
                  className={`message ${msg.role === 'user' ? 'message-user' : 'message-bot'} ${msg.isUnrelated ? 'unrelated' : ''} ${isSystem ? 'system-msg' : ''}`}
                >
                  {isAssistant && !isSystem && (
                    <div className="message-source-tag">
                      <span style={{ marginRight: '6px' }}>{routeLabel}</span>
                      {msg.isUnrelated ? (
                        <span className="tag-warning">⚠️ GRADER WARN</span>
                      ) : (
                        <span className="tag-success">🛡️ GROUNDED</span>
                      )}
                    </div>
                  )}
                  
                  <div style={{ whiteSpace: 'pre-wrap', fontSize: '14px' }}>{msg.content}</div>
                  
                  {msg.meta && !isSystem && (
                    <div className="message-meta">
                      <span>Engine: {msg.meta.engine || 'N/A'}</span>
                      <span style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {msg.inspector && (
                          <span
                            className="inspect-badge"
                            onClick={() => setActiveInspect(msg.inspector)}
                          >
                            Inspect Telemetry
                          </span>
                        )}
                        <span>{msg.meta.timestamp}</span>
                      </span>
                    </div>
                  )}
                </div>
              );
            })}

            {isQuerying && (
              <div className="message message-bot loader-message">
                <span className="loading-spinner" style={{ borderColor: 'rgba(99, 102, 241, 0.3)', borderTopColor: 'var(--accent-secondary)' }}></span>
                <div className="loading-steps-ticker">
                  <span>Routing query intent, dynamically indexing, self-correcting planning, and auditing output...</span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Query Form Input */}
          <form onSubmit={handleSubmit} className="chat-input-area">
            <input
              className="chat-input"
              placeholder="Ask anything (e.g. 'What is Article 19?' or general questions like 'Who is Einstein?')"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              disabled={isQuerying}
            />
            <button
              type="submit"
              className={`btn btn-primary ${isQuerying || !queryInput.trim() ? 'btn-disabled' : ''}`}
              disabled={isQuerying || !queryInput.trim()}
              style={{ width: '90px', height: '54px', borderRadius: '12px' }}
            >
              Ask
            </button>
          </form>
        </div>

        {/* RAG Inspector Panel */}
        <div className="inspector-panel glass-panel">
          <header className="inspector-header">
            <h2 className="inspector-title">
              <span className="inspector-pulse"></span>
              Agentic Console
            </h2>

            {activeInspect && (
              <div className="inspector-tab-row">
                <button 
                  className={`tab-btn ${inspectorTab === 'flow' ? 'active' : ''}`}
                  onClick={() => setInspectorTab('flow')}
                >
                  Execution Flow
                </button>
                <button 
                  className={`tab-btn ${inspectorTab === 'prompt' ? 'active' : ''}`}
                  onClick={() => setInspectorTab('prompt')}
                >
                  Prompt Injected
                </button>
                <button 
                  className={`tab-btn ${inspectorTab === 'raw' ? 'active' : ''}`}
                  onClick={() => setInspectorTab('raw')}
                >
                  Document Chunks
                </button>
              </div>
            )}
          </header>

          <div className="inspector-tab-content">
            {activeInspect ? (
              <div className="active-inspector-area">
                
                {/* TAB 1: Diagram-aligned visual flowchart */}
                {inspectorTab === 'flow' && (
                  <RAGVisualizer activeInspect={activeInspect} />
                )}

                {/* TAB 2: System Prompt */}
                {inspectorTab === 'prompt' && (
                  <div className="tab-details-container">
                    <h3 className="section-title" style={{ marginTop: '0' }}>Final Context Payload</h3>
                    <pre className="details-prompt-pre">{activeInspect.systemPrompt || '[NO CONTEXT INJECTED]'}</pre>
                  </div>
                )}

                {/* TAB 3: Raw Chunks */}
                {inspectorTab === 'raw' && (
                  <div className="tab-details-container">
                    <h3 className="section-title" style={{ marginTop: '0' }}>Retrieved Document Chunks</h3>
                    {activeInspect.pipeline?.rerankedResults?.length > 0 ? (
                      activeInspect.pipeline.rerankedResults.map((item, i) => (
                        <div key={item.id || i} className="chunk-card glass-card">
                          <div className="chunk-header">
                            <span className="chunk-id">📄 Chunk #{i + 1} - {item.id}</span>
                            <span className="chunk-score">Score: {Number(item.score || 0).toFixed(4)}</span>
                          </div>
                          <p className="chunk-text">{item.text}</p>
                          <div className="chunk-meta-row">
                            <span>Source: {item.source || 'Standard Library'}</span>
                            {item.metadata?.article && <span className="meta-badge">{item.metadata.article}</span>}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="empty-text-inspect">No document chunks retrieved in active query route.</p>
                    )}
                  </div>
                )}

              </div>
            ) : (
              <div className="empty-chat">
                <div className="empty-chat-icon">⚙️</div>
                <p style={{ fontSize: '13px', fontWeight: 600 }}>Awaiting Cognitive Action</p>
                <p style={{ fontSize: '11px', padding: '0 20px' }}>Submit a query in the arena, or select "Inspect Telemetry" on an earlier response to display logs.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
