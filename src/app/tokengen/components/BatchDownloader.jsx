'use client';

import { useState, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { useFont } from '@react-three/drei';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import JSZip from 'jszip';
import { TokenModel } from './TokenPreview';
import { drawTokenToCanvas } from '../utils/tokenRenderer';

export default function BatchDownloader({ units, baseColor, textColor, tokenHeight, textHeight, tokenType }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const sceneRefs = useRef({});

  useFont.preload('/fonts/helvetiker_regular.typeface.json');

  const handleDownloadAll = async () => {
    if (units.length === 0) return;
    setIsGenerating(true);
    setProgress(0);

    const downloadZip = async (zip) => {
      const content = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `warhammer_tokens_${tokenType === '2D' ? '2d' : '3d'}.zip`;
      link.click();
      setIsGenerating(false);
    };

    if (tokenType === '2D') {
      setTimeout(async () => {
        try {
          const zip = new JSZip();
          const canvas = document.createElement('canvas');
          for (let i = 0; i < units.length; i++) {
            const unit = units[i];
            if (!unit) continue;
            drawTokenToCanvas(canvas, unit, { baseColor, textColor });
            const blob = await new Promise(resolve => canvas.toBlob(resolve));
            const safeName = (unit.name || 'token').replace(/[^a-z0-9]/gi, '_');
            const count = unit.quantity || 1;
            if (count > 1) {
              for (let c = 1; c <= count; c++) zip.file(`${safeName}_${c}.png`, blob);
            } else {
              zip.file(`${safeName}.png`, blob);
            }
            setProgress(((i + 1) / units.length) * 100);
            await new Promise(r => setTimeout(r, 10));
          }
          await downloadZip(zip);
        } catch (err) {
          alert('Failed to generate 2D zip: ' + err.message);
          setIsGenerating(false);
        }
      }, 100);
      return;
    }

    setTimeout(async () => {
      try {
        const zip = new JSZip();
        const exporter = new STLExporter();
        for (let i = 0; i < units.length; i++) {
          const unit = units[i];
          if (!unit) continue;
          const group = sceneRefs.current[unit.id];
          if (group) {
            const badMeshes = [];
            group.traverse((child) => {
              if (child.isMesh && (!child.geometry?.attributes?.position)) badMeshes.push(child);
            });
            badMeshes.forEach(child => child.parent?.remove(child));
            const stlData = exporter.parse(group, { binary: true });
            const blob = new Blob([stlData], { type: 'application/octet-stream' });
            const count = unit.quantity || 1;
            const safeName = (unit.name || 'token').replace(/[^a-z0-9]/gi, '_');
            if (count > 1) {
              for (let c = 1; c <= count; c++) zip.file(`${safeName}_${c}.stl`, blob);
            } else {
              zip.file(`${safeName}.stl`, blob);
            }
          }
          setProgress(((i + 1) / units.length) * 100);
        }
        await downloadZip(zip);
      } catch (err) {
        alert('Failed to generate zip: ' + err.message);
        setIsGenerating(false);
      }
    }, 4000);
  };

  return (
    <div>
      {!isGenerating ? (
        <button className="btn" onClick={handleDownloadAll} disabled={units.length === 0}>
          Download All as ZIP
        </button>
      ) : (
        <div className="btn" style={{ cursor: 'wait' }}>
          Generating... {Math.round(progress)}%
        </div>
      )}

      {isGenerating && tokenType !== '2D' && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '1px', height: '1px', opacity: 0, pointerEvents: 'none', zIndex: -1 }}>
          <Canvas>
            {units.map((unit, i) => (
              <group key={unit.id} position={[i * 100, 0, 0]}>
                <TokenModel
                  unit={unit}
                  exportRef={(el) => { sceneRefs.current[unit.id] = el; }}
                  baseColor={baseColor}
                  textColor={textColor}
                  tokenHeight={tokenHeight}
                  textHeight={textHeight}
                />
              </group>
            ))}
          </Canvas>
        </div>
      )}
    </div>
  );
}
