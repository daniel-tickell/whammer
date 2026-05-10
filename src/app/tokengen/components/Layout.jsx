'use client';

import Link from 'next/link';

export default function Layout({ children }) {
  return (
    <div className="app-container">
      <header className="app-header">
        <h1>40k Token Generator</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <p className="subtitle">List to STL Converter</p>
          <Link href="/" className="back-link">← Hub</Link>
        </div>
      </header>
      <main className="app-content">
        {children}
      </main>
      <footer className="app-footer">
        <p>Built for the Emperor</p>
      </footer>
    </div>
  );
}
