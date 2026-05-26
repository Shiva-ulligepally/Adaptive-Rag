import React, { useState } from 'react';

export default function RerankStage({ rerankedResults }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!rerankedResults || rerankedResults.length === 0) return null;

  // Check if re-ranking was actually run or bypassed
  const wasReranked = rerankedResults.some(r => r.reRankReason && r.reRankReason !== 'Re-ranking disabled' && r.reRankReason !== 'Skipped - API Key missing');

  return (
    <div className="glass-card" style={{ padding: '12px', borderLeft: '3px solid var(--accent-warning)' }}>
      <div 
        onClick={() => setIsOpen(!isOpen)} 
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Stage 4: LLM Re-ranking
          </span>
          <span style={{ 
            fontSize: '10px', 
            padding: '2px 6px', 
            borderRadius: '4px',
            backgroundColor: wasReranked ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.05)',
            color: wasReranked ? 'var(--accent-warning)' : 'var(--text-muted)'
          }}>
            {wasReranked ? 'Evaluated ✓' : 'Bypassed'}
          </span>
        </div>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{isOpen ? '▼' : '▶'}</span>
      </div>

      {isOpen && (
        <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>
            Grades chunks semantically using Groq LLM reasoning (Cross-Encoder style):
          </span>

          <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '4px' }}>
            {rerankedResults.map((r, idx) => {
              const scoreColor = r.reRankScore >= 7.0 
                ? 'var(--accent-success)' 
                : (r.reRankScore >= 4.0 ? 'var(--accent-warning)' : 'var(--accent-danger)');

              return (
                <div key={r.id || idx} style={{
                  fontSize: '11px', padding: '8px',
                  backgroundColor: 'rgba(255,255,255,0.01)', borderRadius: '6px',
                  border: '1px solid rgba(255,255,255,0.03)',
                  display: 'flex', flexDirection: 'column', gap: '4px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{r.id}</span>
                      <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Source: {r.source}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ color: scoreColor, fontWeight: 800, fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                        {r.reRankScore.toFixed(1)}
                      </span>
                      <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>/10</span>
                    </div>
                  </div>

                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontStyle: 'italic', paddingLeft: '4px', borderLeft: '1px dashed rgba(255,255,255,0.1)' }}>
                    "{r.reRankReason}"
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
