'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';

const TRAY_WIDTH = 217.7;
const TRAY_DEPTH = 140;
const CLEARANCE = 0.5;
const FRONT_GAP = 5;
const BACK_BARRIER = 3;
const MIN_BARRIER = 1;

function calculateTrays(armyList) {
  const usableDepth = TRAY_DEPTH - FRONT_GAP - BACK_BARRIER;
  let requiredSlots = [];

  armyList.forEach(item => {
    const D = item.baseSize;
    const basesPerSlot = Math.floor(usableDepth / D);
    const numSlots = Math.ceil(item.quantity / basesPerSlot);
    for (let i = 0; i < numSlots; i++) requiredSlots.push(D);
  });

  requiredSlots.sort((a, b) => b - a);

  const trays = [];
  let trayCounter = 1;
  let currentTray = [];
  let currentBaseSum = 0;

  for (const D of requiredSlots) {
    const newCount = currentTray.length + 1;
    const newBaseSum = currentBaseSum + D + CLEARANCE;
    const minWidthNeeded = newBaseSum + (newCount + 1) * MIN_BARRIER;

    if (minWidthNeeded <= TRAY_WIDTH) {
      currentTray.push(D);
      currentBaseSum = newBaseSum;
    } else {
      if (currentTray.length > 0) {
        const dynamicBarrier = (TRAY_WIDTH - currentBaseSum) / (currentTray.length + 1);
        trays.push({ id: trayCounter++, slot_diameters: [...currentTray], barrier_width: dynamicBarrier.toFixed(3), description: `${currentTray.length} Mixed Slots` });
      }
      currentTray = [D];
      currentBaseSum = D + CLEARANCE;
    }
  }

  if (currentTray.length > 0) {
    const dynamicBarrier = (TRAY_WIDTH - currentBaseSum) / (currentTray.length + 1);
    trays.push({ id: trayCounter++, slot_diameters: [...currentTray], barrier_width: dynamicBarrier.toFixed(3), description: `${currentTray.length} Mixed Slots` });
  }

  return trays;
}

export default function TrayGenApp() {
  const [armyList, setArmyList] = useState([]);
  const [baseSize, setBaseSize] = useState('32');
  const [customSize, setCustomSize] = useState('32');
  const [quantity, setQuantity] = useState(10);
  const [mergeShelf, setMergeShelf] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [btnText, setBtnText] = useState('Build & Download STLs');
  const [status, setStatus] = useState({ message: '', type: '' });

  const generatedTrays = calculateTrays(armyList);

  const handleAdd = useCallback(() => {
    const size = baseSize === 'custom' ? parseInt(customSize) : parseInt(baseSize);
    const qty = parseInt(quantity);
    if (!size || size <= 0 || !qty || qty <= 0) return;
    setArmyList(prev => [...prev, { id: Date.now().toString(), baseSize: size, quantity: qty }]);
  }, [baseSize, customSize, quantity]);

  const handleRemove = useCallback((id) => {
    setArmyList(prev => prev.filter(item => item.id !== id));
  }, []);

  const handleGenerate = async () => {
    if (generatedTrays.length === 0) return;
    setIsGenerating(true);
    setBtnText('Generating STLs in OpenSCAD...');
    setStatus({ message: '', type: '' });

    try {
      const response = await fetch('/api/traygen/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trays: generatedTrays, merge_shelf: mergeShelf })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to generate');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'TrayGen_STLs.zip';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setBtnText('Download Complete!');
      setStatus({ message: '', type: 'success' });
      setTimeout(() => setBtnText('Build & Download STLs'), 3000);
    } catch (error) {
      setStatus({ message: error.message, type: 'error' });
      setBtnText('Build & Download STLs');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="traygen-root">
      <div className="tg-background-gradients">
        <div className="tg-blob tg-blob-1" />
        <div className="tg-blob tg-blob-2" />
        <div className="tg-blob tg-blob-3" />
      </div>

      <div className="tg-container">
        <div className="tg-header">
          <Link href="/" className="tg-back-link">← Back to Hub</Link>
          <h1>TrayGen Studio</h1>
          <p>Parametric Auto-Packer for Warhammer Minis</p>
        </div>

        <section className={`tg-configurator${baseSize === 'custom' ? ' custom-active' : ''}`}>
          <div className="tg-input-group tg-glass-input">
            <label>Base Size (mm)</label>
            <select value={baseSize} onChange={e => setBaseSize(e.target.value)}>
              <option value="25">25mm (Infantry)</option>
              <option value="28">28mm (Primaris)</option>
              <option value="32">32mm (Standard)</option>
              <option value="40">40mm (Terminators, Characters)</option>
              <option value="50">50mm (Centurions)</option>
              <option value="60">60mm (Dreadnoughts)</option>
              <option value="custom">Custom...</option>
            </select>
          </div>

          {baseSize === 'custom' && (
            <div className="tg-input-group tg-glass-input">
              <label>Custom (mm)</label>
              <input type="number" min="1" value={customSize} onChange={e => setCustomSize(e.target.value)} />
            </div>
          )}

          <div className="tg-input-group tg-glass-input">
            <label>Number of Minis</label>
            <input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} />
          </div>

          <button className="tg-btn tg-primary-btn tg-pulse-glow" onClick={handleAdd}>Add to Army</button>
        </section>

        <section className="tg-section">
          <h2>Your Army</h2>
          <ul className="tg-army-list">
            {armyList.map(item => (
              <li key={item.id} className="tg-army-item">
                <div>
                  <strong>{item.quantity}x</strong> <span>{item.baseSize}mm Bases</span>
                </div>
                <button className="tg-rm-btn" onClick={() => handleRemove(item.id)}>Remove</button>
              </li>
            ))}
          </ul>
        </section>

        <section className="tg-section">
          <div className="tg-trays-header">
            <h2>Generated Trays</h2>
            <div className="tg-tray-summary">{generatedTrays.length} Trays Required</div>
          </div>
          <div className="tg-tray-container">
            {generatedTrays.map((tray, idx) => (
              <div key={tray.id} className="tg-tray-card">
                <div className="tg-tray-icon">{idx + 1}</div>
                <div>
                  <h3 style={{ color: 'var(--tg-text-primary)', marginBottom: '0.25rem', fontSize: '1.1rem' }}>
                    Mixed Tray {tray.id}
                  </h3>
                  <p style={{ color: 'var(--tg-text-secondary)', fontSize: '0.9rem' }}>
                    {tray.description} | Barrier: {tray.barrier_width}mm
                  </p>
                  <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#60a5fa' }}>
                    [ {tray.slot_diameters.join('mm, ')}mm ]
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="tg-footer">
          <div className="tg-merge-row">
            <input type="checkbox" id="mergeShelf" checked={mergeShelf} onChange={e => setMergeShelf(e.target.checked)} />
            <label htmlFor="mergeShelf">Merge Racks with Blank Shelf Base</label>
          </div>

          {generatedTrays.length > 0 && (
            <button
              className="tg-btn tg-generate-btn"
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              {isGenerating && <span className="tg-loader" />}
              {btnText}
            </button>
          )}

          {status.message && (
            <div className={`tg-status ${status.type}`}>{status.message}</div>
          )}
        </div>
      </div>
    </div>
  );
}
