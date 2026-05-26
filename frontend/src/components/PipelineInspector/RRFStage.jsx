import React, { useState } from 'react';

export default function RRFStage({ rrfResults }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!rrfResults || rrfResults.length === 0) return null;

  return (
    <div className="glass-card" style={{ padding: '12px', borderLeft: '3px solid var(--accent-success)' }}>
      <div 
        onClick={() => setIsOpen(!isOpen)} 
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Stage 3: Reciprocal Rank Fusion (RRF)
          </span>
          <span style={{ 
            fontSize: '10px', 
            padding: '2px 6px', 
            borderRadius: '4px',
            backgroundColor: 'rgba(16,185,129,0.1)',
            color: 'var(--accent-success)'
          }}>
            Fused Candidates: {rrfResults.length}
          </span>
        </div>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{isOpen ? '▼' : '▶'}</span>
      </div>

      {isOpen && (
        <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>
            Blends and deduplicates dense and sparse result streams mathematically:
          </span>

          <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '4px' }}>
            {rrfResults.map((r, idx) => (
              <div key={r.id || idx} style={{
                fontSize: '11px', padding: '8px',
                backgroundColor: 'rgba(255,255,255,0.01)', borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.03)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '70%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{r.id}</span>
                    <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Rank #{idx + 1}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', fontSize: '9px', color: 'var(--text-secondary)' }}>
                    <span>Dense Rank: {r.denseRank !== null && r.denseRank !== undefined ? r.denseRank : 'N/A'}</span>
                    <span>•</span>
                    <span>Sparse Rank: {r.sparseRank !== null && r.sparseRank !== undefined ? r.sparseRank : 'N/A'}</span>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: 'var(--accent-success)', fontWeight: 700, fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                    {r.score.toFixed(4)}
                  </div>
                  <div style={{ fontSize: '8px', color: 'var(--text-muted)' }}>RRF Score</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
