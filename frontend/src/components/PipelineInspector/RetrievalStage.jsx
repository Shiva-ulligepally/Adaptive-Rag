import React, { useState } from 'react';

export default function RetrievalStage({ denseResults, sparseResults }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dense'); // 'dense' | 'sparse'

  const hasDense = denseResults && denseResults.length > 0;
  const hasSparse = sparseResults && sparseResults.length > 0;

  if (!hasDense && !hasSparse) return null;

  return (
    <div className="glass-card" style={{ padding: '12px', borderLeft: '3px solid var(--accent-primary)' }}>
      <div 
        onClick={() => setIsOpen(!isOpen)} 
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Stage 2: Hybrid Retrieval
          </span>
          <span style={{ 
            fontSize: '10px', 
            padding: '2px 6px', 
            borderRadius: '4px',
            backgroundColor: 'rgba(59,130,246,0.1)',
            color: 'var(--accent-primary)'
          }}>
            Dense: {denseResults?.length || 0} | Sparse: {sparseResults?.length || 0}
          </span>
        </div>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{isOpen ? '▼' : '▶'}</span>
      </div>

      {isOpen && (
        <div style={{ marginTop: '10px' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px', marginBottom: '8px' }}>
            <button 
              onClick={() => setActiveTab('dense')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: activeTab === 'dense' ? 'var(--accent-primary)' : 'var(--text-muted)',
                fontWeight: 600, fontSize: '11px', textTransform: 'uppercase',
                padding: '4px 8px', borderBottom: activeTab === 'dense' ? '2px solid var(--accent-primary)' : 'none'
              }}
              disabled={!hasDense}
            >
              Dense Vectors
            </button>
            <button 
              onClick={() => setActiveTab('sparse')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: activeTab === 'sparse' ? 'var(--accent-primary)' : 'var(--text-muted)',
                fontWeight: 600, fontSize: '11px', textTransform: 'uppercase',
                padding: '4px 8px', borderBottom: activeTab === 'sparse' ? '2px solid var(--accent-primary)' : 'none'
              }}
              disabled={!hasSparse}
            >
              Sparse Keywords
            </button>
          </div>

          {/* Tab contents */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
            {activeTab === 'dense' && hasDense && denseResults.map((r, idx) => (
              <div key={r.id || idx} style={{ 
                fontSize: '11px', padding: '6px 8px', 
                backgroundColor: 'rgba(255,255,255,0.01)', borderRadius: '4px',
                border: '1px solid rgba(255,255,255,0.03)',
                display: 'flex', flexDirection: 'column', gap: '2px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.id}</span>
                  <span style={{ color: 'var(--accent-success)', fontFamily: 'var(--font-mono)' }}>
                    Score: {r.score.toFixed(4)}
                  </span>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
                  Source: {r.source} ({r.retrievalType})
                </div>
                <div style={{ color: 'var(--text-secondary)', marginTop: '2px', fontStyle: 'italic', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  "{r.text}"
                </div>
              </div>
            ))}

            {activeTab === 'sparse' && hasSparse && sparseResults.map((r, idx) => (
              <div key={r.id || idx} style={{ 
                fontSize: '11px', padding: '6px 8px', 
                backgroundColor: 'rgba(255,255,255,0.01)', borderRadius: '4px',
                border: '1px solid rgba(255,255,255,0.03)',
                display: 'flex', flexDirection: 'column', gap: '2px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.id}</span>
                  <span style={{ color: 'var(--accent-success)', fontFamily: 'var(--font-mono)' }}>
                    Score: {r.score.toFixed(4)}
                  </span>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
                  Source: {r.source}
                </div>
                <div style={{ color: 'var(--text-secondary)', marginTop: '2px', fontStyle: 'italic', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  "{r.text}"
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
