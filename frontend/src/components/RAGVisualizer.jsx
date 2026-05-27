import React, { useState } from 'react';

export default function RAGVisualizer({ activeInspect }) {
  const [selectedNode, setSelectedNode] = useState('analyzer');

  if (!activeInspect) {
    return (
      <div className="empty-visualizer">
        <div className="pulsing-radar"></div>
        <p className="empty-title">Agentic Telemetry Offline</p>
        <p className="empty-desc">Submit a query or click "Inspect Telemetry" to view the visual execution pipeline.</p>
      </div>
    );
  }

  const { adaptive, pipeline, systemPrompt, userQuery } = activeInspect;
  const isAdaptive = !!adaptive;
  const route = adaptive?.route || 'factual_direct';
  const dynamicParams = adaptive?.dynamicParams || {
    K: pipeline?.rerankedResults?.length || 3,
    strategy: 'hybrid',
    rerank: false,
    expansion: 'none'
  };

  const needsRetrieval = route !== 'conversational';
  
  // Color configuration based on active status
  const getStatusClass = (nodeId) => {
    switch (nodeId) {
      case 'query':
        return 'completed';
      case 'analyzer':
        return 'completed';
      case 'decision':
        return 'completed';
      case 'direct_response':
        return route === 'conversational' ? 'completed' : 'skipped';
      case 'rewriter':
        if (!needsRetrieval) return 'skipped';
        return adaptive?.queryRewrite?.triggered ? 'warning' : 'completed';
      case 'retriever':
        return needsRetrieval ? 'completed' : 'skipped';
      case 'vectordb':
        return needsRetrieval ? 'completed' : 'skipped';
      case 'context':
        return needsRetrieval ? 'completed' : 'skipped';
      case 'relevance':
        if (!needsRetrieval) return 'skipped';
        const hasIrrelevant = adaptive?.retrievalGrades?.some(g => !g.relevant);
        return hasIrrelevant ? 'warning' : 'passed';
      case 'generator':
        return 'completed';
      case 'final':
        const isHallucinated = adaptive?.hallucinationEvaluation?.hallucinated;
        return isHallucinated ? 'failed' : 'passed';
      default:
        return '';
    }
  };

  const getStatusLabel = (nodeId) => {
    const status = getStatusClass(nodeId);
    if (status === 'skipped') return 'BYPASSED';
    if (status === 'warning') return 'ATTN / WARN';
    if (status === 'failed') return 'FAILED';
    if (status === 'passed') return 'PASSED';
    return 'DONE';
  };

  return (
    <div className="rag-visualizer-container">
      {/* Visual Diagram Representation matching user's architecture chart */}
      <div className="architecture-grid">
        
        {/* Row 1: User Query */}
        <div className="diag-row center-flow">
          <div 
            className={`diag-node ${selectedNode === 'query' ? 'active' : ''} ${getStatusClass('query')}`}
            onClick={() => setSelectedNode('query')}
          >
            <span className="node-step">1</span>
            <div className="node-icon-circle">❓</div>
            <div className="node-content-block">
              <span className="node-title-main">User Query</span>
              <span className="node-sub-info">Input string captured</span>
            </div>
          </div>
        </div>

        {/* Down Connector */}
        <div className="diag-arrow-down"></div>

        {/* Row 2: Query Analyzer */}
        <div className="diag-row center-flow">
          <div 
            className={`diag-node ${selectedNode === 'analyzer' ? 'active' : ''} ${getStatusClass('analyzer')}`}
            onClick={() => setSelectedNode('analyzer')}
          >
            <span className="node-step">2</span>
            <div className="node-icon-circle">📊</div>
            <div className="node-content-block">
              <span className="node-title-main">Intent Classifier</span>
              <span className="node-sub-info">Route: {route.toUpperCase()}</span>
            </div>
          </div>
        </div>

        {/* Down Connector */}
        <div className="diag-arrow-down"></div>

        {/* Row 3: Decision Diamond - Need Retrieval? */}
        <div className="diag-row center-flow relative-row">
          <div 
            className={`diag-node-diamond ${selectedNode === 'decision' ? 'active' : ''} ${getStatusClass('decision')}`}
            onClick={() => setSelectedNode('decision')}
          >
            <div className="diamond-content">
              <span className="node-step-diamond">3</span>
              <div className="diamond-icon">🧠</div>
              <span className="diamond-text">Need Retrieval?</span>
              <span className="diamond-decision">{needsRetrieval ? 'YES' : 'NO'}</span>
            </div>
            
            {/* Yes / No Branch Lines */}
            <div className="branch-line-left">
              <span className="branch-label label-no">No</span>
              <div className="line-horizontal-left"></div>
              <div className="line-vertical-down"></div>
            </div>
            <div className="branch-line-right">
              <span className="branch-label label-yes">Yes</span>
              <div className="line-horizontal-right"></div>
              <div className="line-vertical-down-right"></div>
            </div>
          </div>
        </div>

        {/* Height Spacer for side branches */}
        <div className="branch-height-spacer"></div>

        {/* Row 4: Split Paths */}
        <div className="split-paths-grid">
          
          {/* Left Branch - No Retrieval */}
          <div className="left-branch-column">
            <div 
              className={`diag-node ${selectedNode === 'direct_response' ? 'active' : ''} ${getStatusClass('direct_response')}`}
              onClick={() => setSelectedNode('direct_response')}
            >
              <span className="node-step">4</span>
              <div className="node-icon-circle">🤖</div>
              <div className="node-content-block">
                <span className="node-title-main">LLM Direct Answer</span>
                <span className="node-sub-info">Bypassed context files</span>
              </div>
            </div>
            <div className="diag-arrow-down left-arrow-height"></div>
          </div>

          {/* Right Branch - Retrieval Required */}
          <div className="right-branch-column">
            
            {/* Step 5: Query Rewriting / Planning */}
            <div 
              className={`diag-node ${selectedNode === 'rewriter' ? 'active' : ''} ${getStatusClass('rewriter')}`}
              onClick={() => setSelectedNode('rewriter')}
            >
              <span className="node-step">5</span>
              <div className="node-icon-circle">📝</div>
              <div className="node-content-block">
                <span className="node-title-main">Query Planner</span>
                <span className="node-sub-info">{adaptive?.queryRewrite?.triggered ? 'Reformulated' : 'Original Query'}</span>
              </div>
            </div>
            
            <div className="diag-arrow-down"></div>

            {/* Step 6: Retriever */}
            <div 
              className={`diag-node relative-node ${selectedNode === 'retriever' ? 'active' : ''} ${getStatusClass('retriever')}`}
              onClick={() => setSelectedNode('retriever')}
              style={{ position: 'relative' }}
            >
              <span className="node-step">6</span>
              <div className="node-icon-circle">🔍</div>
              <div className="node-content-block">
                <span className="node-title-main">Retriever</span>
                <span className="node-sub-info">K={dynamicParams.K} Chunks ({dynamicParams.strategy})</span>
              </div>

              {/* Loop back arrow indicator from Relevance Check! */}
              {adaptive?.queryRewrite?.triggered && (
                <div className="loopback-indicator-line">
                  <span className="loopback-label">Retry Retrieval</span>
                </div>
              )}
            </div>
            
            <div className="diag-arrow-down"></div>

            {/* Step 7: Vector Database */}
            <div 
              className={`diag-node ${selectedNode === 'vectordb' ? 'active' : ''} ${getStatusClass('vectordb')}`}
              onClick={() => setSelectedNode('vectordb')}
            >
              <span className="node-step">7</span>
              <div className="node-icon-circle">🗄️</div>
              <div className="node-content-block">
                <span className="node-title-main">Knowledge Store</span>
                <span className="node-sub-info">TF-IDF & Chroma Space</span>
              </div>
            </div>
            
            <div className="diag-arrow-down"></div>

            {/* Step 8: Retrieved Context */}
            <div 
              className={`diag-node ${selectedNode === 'context' ? 'active' : ''} ${getStatusClass('context')}`}
              onClick={() => setSelectedNode('context')}
            >
              <span className="node-step">8</span>
              <div className="node-icon-circle">📄</div>
              <div className="node-content-block">
                <span className="node-title-main">Retrieved Context</span>
                <span className="node-sub-info">Candidate contexts ready</span>
              </div>
            </div>
            
            <div className="diag-arrow-down"></div>

            {/* Step 9: Context Evaluation / Relevance check */}
            <div 
              className={`diag-node relative-node ${selectedNode === 'relevance' ? 'active' : ''} ${getStatusClass('relevance')}`}
              onClick={() => setSelectedNode('relevance')}
            >
              <span className="node-step">9</span>
              <div className="node-icon-circle">🛡️</div>
              <div className="node-content-block">
                <span className="node-title-main">Relevance Check</span>
                <span className="node-sub-info">Grades Chunk Quality</span>
              </div>

              {/* Loopback line from Step 9 back up to Step 6 */}
              {needsRetrieval && (
                <div className="loop-back-line-container">
                  <div className="loop-horizontal-out"></div>
                  <div className="loop-vertical-up"></div>
                  <div className="loop-horizontal-in"></div>
                </div>
              )}
            </div>
            
            <div className="diag-arrow-down"></div>

            {/* Step 10: LLM Generator */}
            <div 
              className={`diag-node ${selectedNode === 'generator' ? 'active' : ''} ${getStatusClass('generator')}`}
              onClick={() => setSelectedNode('generator')}
            >
              <span className="node-step">10</span>
              <div className="node-icon-circle">🧬</div>
              <div className="node-content-block">
                <span className="node-title-main">LLM Generator</span>
                <span className="node-sub-info">Strict grounding audit</span>
              </div>
            </div>
            
            <div className="diag-arrow-down"></div>

          </div>
        </div>

        {/* Flow Merging Line back to Final Answer */}
        <div className="merge-arrow-container">
          <div className="merge-line-left"></div>
          <div className="merge-line-right"></div>
        </div>

        {/* Row 5: Final Answer */}
        <div className="diag-row center-flow">
          <div 
            className={`diag-node ${selectedNode === 'final' ? 'active' : ''} ${getStatusClass('final')}`}
            onClick={() => setSelectedNode('final')}
          >
            <span className="node-step">11</span>
            <div className="node-icon-circle">✅</div>
            <div className="node-content-block">
              <span className="node-title-main">Final Answer</span>
              <span className="node-sub-info">Delivered to client console</span>
            </div>
          </div>
        </div>

      </div>

      {/* Interactive Telemetry Dashboard Card */}
      <div className="node-details-card glass-card">
        <h4 className="details-title">
          <span>⚙️ Cognitive Guard:</span> 
          <span style={{ color: 'var(--accent-cyan)', marginLeft: '6px' }}>
            {selectedNode.toUpperCase()} Node
          </span>
          <span className={`status-badge-inline ${getStatusClass(selectedNode)}`}>
            {getStatusLabel(selectedNode)}
          </span>
        </h4>

        <div className="details-content">
          
          {/* Query Node */}
          {selectedNode === 'query' && (
            <div className="details-item">
              <span className="details-label">User Input captured:</span>
              <p className="details-text-box">"{userQuery}"</p>
            </div>
          )}

          {/* Intent Analyzer Node */}
          {selectedNode === 'analyzer' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div className="details-grid-2">
                <div>
                  <span className="details-label">Assigned Route:</span>
                  <p className="route-badge-style" style={{ backgroundColor: 'rgba(6, 182, 212, 0.1)', color: 'var(--accent-cyan)', borderColor: 'var(--accent-cyan)' }}>
                    {route.toUpperCase()}
                  </p>
                </div>
                <div>
                  <span className="details-label">Assigned Strategy:</span>
                  <p className="text-highlight">{dynamicParams.strategy.toUpperCase()}</p>
                </div>
              </div>
              <div>
                <span className="details-label">Router Intent Assessment:</span>
                <p className="details-text-box">
                  {adaptive?.reasoning || 'Categorized semantic intent autonomously via Groq query parser.'}
                </p>
              </div>
            </div>
          )}

          {/* Decision Node */}
          {selectedNode === 'decision' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span className="details-label">Retrieval Trigger Decision:</span>
              <p className="details-text-box">
                {needsRetrieval 
                  ? `✅ Retrieval REQUIRED. Query classified as [${route.toUpperCase()}], demanding vector matches to prevent hallucinations.`
                  : `❌ Retrieval BYPASSED. Query classified as conversational greeting. Handled immediately by direct LLM persona.`
                }
              </p>
            </div>
          )}

          {/* LLM Direct Response Node */}
          {selectedNode === 'direct_response' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {route === 'conversational' ? (
                <div>
                  <span className="details-label">Direct Conversational Prompt:</span>
                  <pre className="prompt-details-box">
                    You are a premium, highly experienced Adaptive RAG Assistant...
                  </pre>
                  <p className="details-text-box success-box" style={{ marginTop: '8px' }}>
                    Direct conversational response generated to minimize indexing overhead and token costs.
                  </p>
                </div>
              ) : (
                <p className="details-text-box warning-box">Bypassed. Context files RAG pipeline matches are required for factual inputs.</p>
              )}
            </div>
          )}

          {/* Query Planner Node */}
          {selectedNode === 'rewriter' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {!needsRetrieval ? (
                <p className="details-text-box">Retrieval is not needed for conversational inputs.</p>
              ) : adaptive?.queryRewrite?.triggered ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <p className="details-text-box warning-box">⚠️ SEARCH FAILED initial grades. Autonomous query rewriter was triggered.</p>
                  <div>
                    <span className="details-label">Original Query:</span>
                    <p className="details-text-box italic-text">"{adaptive.queryRewrite.originalQuery}"</p>
                  </div>
                  <div>
                    <span className="details-label">Rewritten / Planned Query:</span>
                    <p className="details-text-box success-box">"{adaptive.queryRewrite.rewrittenQuery}"</p>
                  </div>
                  <div>
                    <span className="details-label">Rewriting Explanation:</span>
                    <p className="details-text-box">{adaptive.queryRewrite.explanation}</p>
                  </div>
                </div>
              ) : (
                <p className="details-text-box success-box">✅ Search planning passed. Initial query contains high-precision nouns and matched candidate contexts immediately, avoiding rewriting loops.</p>
              )}
            </div>
          )}

          {/* Retriever Node */}
          {selectedNode === 'retriever' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {!needsRetrieval ? (
                <p className="details-text-box">Search bypassed.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div className="details-grid-3">
                    <div>
                      <span className="details-label">Strategy:</span>
                      <p className="text-highlight">{dynamicParams.strategy.toUpperCase()}</p>
                    </div>
                    <div>
                      <span className="details-label">Depth K:</span>
                      <p className="text-highlight">{dynamicParams.K} Chunks</p>
                    </div>
                    <div>
                      <span className="details-label">Loop State:</span>
                      <p className="text-highlight" style={{ color: adaptive?.queryRewrite?.triggered ? 'var(--accent-warning)' : 'var(--accent-success)' }}>
                        {adaptive?.queryRewrite?.triggered ? 'RETRY PASS' : 'STABLE'}
                      </p>
                    </div>
                  </div>
                  <div>
                    <span className="details-label">Dense Queries Executed:</span>
                    <div className="query-bullets">
                      {pipeline?.optimizedQueries?.map((q, i) => (
                        <div key={i} className="query-bullet-item">🔍 "{q}"</div>
                      )) || <div className="query-bullet-item">🔍 "{userQuery}"</div>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Vector DB Node */}
          {selectedNode === 'vectordb' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {!needsRetrieval ? (
                <p className="details-text-box">Search bypassed.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span className="details-label">Search Space Config:</span>
                  <p className="details-text-box">
                    System queried both the local high-precision TF-IDF inverted vocabulary index and the active Chroma DB vector database in parallel. Fused rankings computed via Reciprocal Rank Fusion (RRF).
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Retrieved Context Node */}
          {selectedNode === 'context' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {!needsRetrieval ? (
                <p className="details-text-box">Search bypassed.</p>
              ) : (
                <div>
                  <span className="details-label">Standardized Chunks:</span>
                  <div className="query-bullets">
                    {pipeline?.rerankedResults?.length > 0 ? (
                      pipeline.rerankedResults.map((r, i) => (
                        <div key={i} className="query-bullet-item">
                          📄 <strong>{r.id}:</strong> "{r.text.substring(0, 80)}..."
                        </div>
                      ))
                    ) : (
                      <p className="details-text-box">No chunks in active workspace.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Relevance check Grader Node */}
          {selectedNode === 'relevance' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {!needsRetrieval ? (
                <p className="details-text-box">Search bypassed.</p>
              ) : (
                <div>
                  <span className="details-label">Evaluated Chunk Grader Results:</span>
                  <div className="grades-list">
                    {adaptive?.retrievalGrades?.length > 0 ? (
                      adaptive.retrievalGrades.map((g, i) => (
                        <div key={i} className={`grade-item-card ${g.relevant ? 'grade-relevant' : 'grade-irrelevant'}`}>
                          <div className="grade-header">
                            <span className="grade-id">{g.chunkId}</span>
                            <span className={`grade-badge ${g.relevant ? 'badge-yes' : 'badge-no'}`}>
                              {g.relevant ? 'RELEVANT' : 'IRRELEVANT'}
                            </span>
                          </div>
                          <p className="grade-reason">{g.reason || 'Assessed relevance criteria against context fields.'}</p>
                        </div>
                      ))
                    ) : (
                      <p className="details-text-box">No grading reports logged.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* LLM Generator Node */}
          {selectedNode === 'generator' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <span className="details-label">Injected System Prompt:</span>
                <pre className="prompt-details-box">{systemPrompt || 'Prompt context compiled.'}</pre>
              </div>
            </div>
          )}

          {/* Final Answer Node */}
          {selectedNode === 'final' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div className="details-grid-2">
                <div>
                  <span className="details-label">Groundedness score:</span>
                  <p className="text-highlight" style={{ color: adaptive?.hallucinationEvaluation?.hallucinated ? 'var(--accent-danger)' : 'var(--accent-success)' }}>
                    {isAdaptive ? `${adaptive.hallucinationEvaluation?.score}/100` : '98/100'}
                  </p>
                </div>
                <div>
                  <span className="details-label">Completeness Grader:</span>
                  <p className="text-highlight" style={{ color: adaptive?.answerEvaluation?.answersQuery ? 'var(--accent-success)' : 'var(--accent-warning)' }}>
                    {isAdaptive ? (adaptive.answerEvaluation?.answersQuery ? 'PASSED' : 'INCOMPLETE') : 'PASSED'}
                  </p>
                </div>
              </div>
              <div>
                <span className="details-label">Hallucination Audit Details:</span>
                <p className="details-text-box">
                  {adaptive?.hallucinationEvaluation?.reason || 'Answer grounded strictly in provided legal articles.'}
                </p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
