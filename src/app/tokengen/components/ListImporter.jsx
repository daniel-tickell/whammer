'use client';

import { useState } from 'react';

export default function ListImporter({ onParse }) {
  const [text, setText] = useState('');

  return (
    <div className="panel">
      <h2>Import List</h2>
      <textarea
        placeholder="Paste your Battlescribe or text list here... (e.g. '10x Intercessors')"
        value={text}
        onChange={(e) => setText(e.target.value)}
        style={{
          width: '100%',
          height: '150px',
          background: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-color)',
          padding: '1rem',
          borderRadius: '4px',
          resize: 'vertical',
          fontFamily: 'monospace',
          boxSizing: 'border-box'
        }}
      />
      <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn" onClick={() => onParse(text)}>Parse List</button>
      </div>
    </div>
  );
}
