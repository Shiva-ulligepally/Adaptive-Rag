import React from 'react';

export default function RetrievalSettings({ 
  strategy, 
  setStrategy, 
  chunkSize, 
  setChunkSize, 
  chunkOverlap, 
  setChunkOverlap,
  numResults,
  setNumResults 
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div className="form-group">
        <label className="form-label">
          <span>Retrieval Strategy</span>
          <span style={{ 
            color: 'var(--accent-primary)', 
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase'
          }}>
            {strategy === 'dense' && 'Dense Vector'}
            {strategy === 'sparse' && 'Sparse Keyword'}
            {strategy === 'hybrid' && 'Hybrid RRF'}
          </span>
        </label>
        
        <select
          className="form-select"
          value={strategy}
          onChange={(e) => setStrategy(e.target.value)}
        >
          <option value="dense">Dense Vector (Similarity)</option>
          <option value="sparse">Sparse Keyword (Term Match)</option>
          <option value="hybrid">Hybrid Search (Dense + Sparse)</option>
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">
          <span>Retrieve Count (Top-K)</span>
          <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{numResults}</span>
        </label>
        <input
          type="range"
          min="1"
          max="8"
          step="1"
          value={numResults}
          onChange={(e) => setNumResults(parseInt(e.target.value))}
        />
      </div>

      <div className="form-group">
        <label className="form-label">
          <span>Chunk Size (Words)</span>
          <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{chunkSize}</span>
        </label>
        <input
          type="range"
          min="50"
          max="400"
          step="10"
          value={chunkSize}
          onChange={(e) => setChunkSize(parseInt(e.target.value))}
        />
      </div>

      <div className="form-group">
        <label className="form-label">
          <span>Chunk Overlap (Words)</span>
          <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{chunkOverlap}</span>
        </label>
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value={chunkOverlap}
          onChange={(e) => setChunkOverlap(parseInt(e.target.value))}
        />
      </div>
    </div>
  );
}
