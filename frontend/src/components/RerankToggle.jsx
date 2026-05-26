import React from 'react';

export default function RerankToggle({ enabled, onChange }) {
  return (
    <div className="form-group" style={{ marginBottom: '16px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        padding: '10px 12px',
        borderRadius: '8px',
        backgroundColor: 'rgba(99, 102, 241, 0.03)',
        border: '1px solid rgba(99, 102, 241, 0.08)'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
            LLM Re-ranking
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            Uses Groq Cross-Encoder
          </span>
        </div>
        
        <label className="switch-container" style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px' }}>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onChange(e.target.checked)}
            style={{ opacity: 0, width: 0, height: 0 }}
          />
          <span className={`slider-button ${enabled ? 'active' : ''}`} style={{
            position: 'absolute',
            cursor: 'pointer',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: enabled ? 'var(--accent-secondary)' : '#2e374a',
            transition: '0.3s',
            borderRadius: '24px',
            boxShadow: enabled ? '0 0 10px rgba(99,102,241,0.5)' : 'none'
          }}>
            <span style={{
              position: 'absolute',
              content: '""',
              height: '18px', width: '18px',
              left: enabled ? '22px' : '4px',
              bottom: '3px',
              backgroundColor: 'white',
              transition: '0.3s',
              borderRadius: '50%'
            }} />
          </span>
        </label>
      </div>

      {enabled && (
        <p style={{ 
          fontSize: '11px', 
          color: 'var(--accent-success)', 
          lineHeight: '1.4',
          margin: '6px 0 0 0',
          padding: '4px 6px',
          borderLeft: '2px solid var(--accent-success)'
        }}>
          💡 Grades top hybrid candidates on a scale of 0-10 using Groq semantic reasoning. Filters out irrelevant chunks!
        </p>
      )}
    </div>
  );
}
