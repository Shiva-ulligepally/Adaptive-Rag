import React, { useState } from 'react';

export default function QueryStage({ optimizedQueries }) {
  const [isOpen, setIsOpen] = useState(true);

  if (!optimizedQueries || optimizedQueries.length === 0) return null;

  const isExpanded = optimizedQueries.length > 1;

  return (
    <div className="glass-card" style={{ padding: '12px', borderLeft: '3px solid var(--accent-secondary)' }}>
      <div 
        onClick={() => setIsOpen(!isOpen)} 
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Stage 1: Query Optimizer
          </span>
          <span style={{ 
            fontSize: '10px', 
            padding: '2px 6px', 
            borderRadius: '4px',
            backgroundColor: isExpanded ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.05)',
            color: isExpanded ? 'var(--accent-secondary)' : 'var(--text-secondary)'
          }}>
            {isExpanded ? 'Multi-Query' : 'Original'}
          </span>
        </div>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{isOpen ? '▼' : '▶'}</span>
      </div>

      {isOpen && (
        <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {optimizedQueries.map((q, idx) => (
              <div key={idx} style={{ 
                display: 'flex', 
                gap: '8px', 
                alignItems: 'center',
                fontSize: '12px',
                padding: '6px 8px',
                backgroundColor: 'rgba(255,255,255,0.01)',
                borderRadius: '4px',
                border: '1px solid rgba(255,255,255,0.03)'
              }}>
                <span style={{ 
                  fontWeight: 800, 
                  color: 'var(--accent-secondary)',
                  backgroundColor: 'rgba(99,102,241,0.05)',
                  width: '18px', height: '18px',
                  borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '10px'
                }}>{idx + 1}</span>
                <span style={{ color: 'var(--text-secondary)', wordBreak: 'break-all' }}>"{q}"</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
