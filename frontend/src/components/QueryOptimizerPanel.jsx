import React from 'react';

export default function QueryOptimizerPanel({ value, onChange }) {
  return (
    <div className="form-group" style={{ marginBottom: '16px' }}>
      <label className="form-label">
        <span>Query Optimization</span>
        <span style={{ 
          color: value === 'none' ? 'var(--text-muted)' : 'var(--accent-secondary)', 
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase'
        }}>
          {value === 'none' ? 'Disabled' : value}
        </span>
      </label>
      
      <select
        className="form-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: '100%', marginBottom: '6px' }}
      >
        <option value="none">No Optimization (Original Query)</option>
        <option value="expansion">Multi-Query Expansion (3 Variances)</option>
      </select>

      <p style={{ 
        fontSize: '11px', 
        color: 'var(--text-secondary)', 
        lineHeight: '1.4',
        margin: '0',
        padding: '6px 8px',
        borderRadius: '6px',
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.04)'
      }}>
        {value === 'none' && "Searches vector space directly using raw user input text."}
        {value === 'expansion' && "Uses LLM to rewrite your query into 3 search variations. Increases retrieval diversity."}
      </p>
    </div>
  );
}
