import React, { useState } from 'react';

export default function PromptStage({ systemPrompt, finalContext }) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState('context'); // 'context' | 'system'

  if (!systemPrompt && !finalContext) return null;

  return (
    <div className="glass-card" style={{ padding: '12px', borderLeft: '3px solid var(--accent-secondary)' }}>
      <div 
        onClick={() => setIsOpen(!isOpen)} 
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Stage 5: Final Prompt Payload
          </span>
          <span style={{ 
            fontSize: '10px', 
            padding: '2px 6px', 
            borderRadius: '4px',
            backgroundColor: 'rgba(99,102,241,0.1)',
            color: 'var(--accent-secondary)'
          }}>
            Grounded & Shielded
          </span>
        </div>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{isOpen ? '▼' : '▶'}</span>
      </div>

      {isOpen && (
        <div style={{ marginTop: '10px' }}>
          {/* View Modes */}
          <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px', marginBottom: '8px' }}>
            <button 
              onClick={() => setViewMode('context')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: viewMode === 'context' ? 'var(--accent-secondary)' : 'var(--text-muted)',
                fontWeight: 600, fontSize: '11px', textTransform: 'uppercase',
                padding: '4px 8px', borderBottom: viewMode === 'context' ? '2px solid var(--accent-secondary)' : 'none'
              }}
            >
              Filtered Contexts
            </button>
            <button 
              onClick={() => setViewMode('system')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: viewMode === 'system' ? 'var(--accent-secondary)' : 'var(--text-muted)',
                fontWeight: 600, fontSize: '11px', textTransform: 'uppercase',
                padding: '4px 8px', borderBottom: viewMode === 'system' ? '2px solid var(--accent-secondary)' : 'none'
              }}
            >
              Full Shielded Prompt
            </button>
          </div>

          {/* Prompt content */}
          <div style={{ 
            fontSize: '11px', 
            fontFamily: 'var(--font-mono)', 
            backgroundColor: 'var(--bg-primary)', 
            padding: '10px', 
            borderRadius: '6px', 
            border: '1px solid var(--glass-border)',
            maxHeight: '220px',
            overflowY: 'auto',
            whiteSpace: 'pre-wrap',
            color: 'var(--text-secondary)',
            lineHeight: '1.4'
          }}>
            {viewMode === 'context' 
              ? (finalContext || "[No context injected]") 
              : (systemPrompt || "[No system prompt available]")}
          </div>
        </div>
      )}
    </div>
  );
}
