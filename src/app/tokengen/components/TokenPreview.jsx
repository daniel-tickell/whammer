'use client';

import { useMemo, useRef, useState, useLayoutEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text3D, Center } from '@react-three/drei';
import * as THREE from 'three';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { commonBaseSizes, saveBaseSize } from '../utils/baseSizes';
import { drawTokenToCanvas } from '../utils/tokenRenderer';

export function CenteredText3D({ children, ...props }) {
  const meshRef = useRef();

  useLayoutEffect(() => {
    if (meshRef.current?.geometry) {
      meshRef.current.geometry.computeBoundingBox();
      const box = meshRef.current.geometry.boundingBox;
      const xOffset = -0.5 * (box.max.x + box.min.x);
      meshRef.current.geometry.translate(xOffset, 0, 0);
    }
  }, [children, props.height, props.size, props.font, props.bevelEnabled, props.bevelSize, props.bevelThickness]);

  return (
    <Text3D ref={meshRef} {...props}>
      {children}
      <meshStandardMaterial color={props.materialColor || '#ffd700'} />
    </Text3D>
  );
}

export function TokenModel({ unit, exportRef, baseColor, textColor, tokenHeight, textHeight, hasBevel, hasRing }) {
  const textGroupRef = useRef();
  const wrapperRef = useRef();

  const { width, depth, isRect } = useMemo(() => {
    const sizeStr = unit?.baseSize || '32mm';
    let w = 32, d = 32;
    let rect = sizeStr.toLowerCase().includes('rect');
    const match = sizeStr.match(/(\d+)(?:x(\d+))?/);
    if (match) {
      w = parseInt(match[1]);
      d = match[2] ? parseInt(match[2]) : w;
    }
    return { width: w, depth: d, isRect: rect };
  }, [unit?.baseSize]);

  const radius = width / 2;
  const cylinderHeight = tokenHeight || 3;

  const words = useMemo(() => {
    const name = unit?.name || 'Unit Name';
    return name.trim().split(/\s+/).filter(w => w.length > 0);
  }, [unit?.name]);

  const fontSize = 5;
  const lineHeight = fontSize * 1.2;

  useLayoutEffect(() => {
    if (textGroupRef.current && wrapperRef.current) {
      wrapperRef.current.scale.set(1, 1, 1);
      wrapperRef.current.updateWorldMatrix(true, true);
      const box = new THREE.Box3().setFromObject(textGroupRef.current);
      if (!box.isEmpty()) {
        const textWidth = box.max.x - box.min.x;
        const textHeight = box.max.y - box.min.y;
        const marginW = width * 0.15;
        const marginD = depth * 0.15;
        const availableWidth = width - marginW;
        const availableHeight = depth - marginD;
        const scaleW = availableWidth / textWidth;
        const scaleH = availableHeight / textHeight;
        let fitScale = Math.min(scaleW, scaleH);
        if (fitScale > 1.5) fitScale = 1.5;
        const adjustment = unit?.scaleAdjustment || 1.0;
        fitScale *= adjustment;
        wrapperRef.current.scale.set(fitScale, fitScale, 1);
      }
    }
  }, [words, width, depth, unit?.scaleAdjustment]);

  const angleRad = 75 * (Math.PI / 180);
  const bevelInset = cylinderHeight / Math.tan(angleRad);
  const topRadius = hasBevel ? Math.max(0.1, radius - bevelInset) : radius;

  return (
    <group ref={exportRef}>
      {isRect ? (
        <mesh position={[0, cylinderHeight / 2, 0]}>
          <boxGeometry args={[width, cylinderHeight, depth]} />
          <meshStandardMaterial color={baseColor || '#333333'} />
        </mesh>
      ) : (
        <>
          <mesh position={[0, cylinderHeight / 2, 0]} scale={[1, 1, depth / width]}>
            <cylinderGeometry args={[topRadius, radius, cylinderHeight, 64]} />
            <meshStandardMaterial color={baseColor || '#333333'} />
          </mesh>
          {hasRing && (
            <mesh position={[0, cylinderHeight, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, depth / width, 1]}>
              <torusGeometry args={[topRadius - 1, 1, 16, 64]} />
              <meshStandardMaterial color={textColor || '#ffd700'} />
            </mesh>
          )}
        </>
      )}

      <group ref={wrapperRef} position={[0, cylinderHeight - 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <group ref={textGroupRef}>
          {words.map((word, i) => {
            const yOffset = ((words.length - 1) / 2 - i) * lineHeight;
            return (
              <group key={i} position={[0, yOffset, 0]}>
                <CenteredText3D
                  font="/fonts/helvetiker_regular.typeface.json"
                  size={fontSize}
                  height={textHeight || 1}
                  curveSegments={32}
                  bevelEnabled
                  bevelThickness={0.1}
                  bevelSize={0.05}
                  bevelOffset={0}
                  bevelSegments={5}
                  materialColor={textColor || '#ffd700'}
                >
                  {word}
                </CenteredText3D>
              </group>
            );
          })}
        </group>
      </group>
    </group>
  );
}

export default function TokenPreview({
  unit, onUpdate,
  baseColor, setBaseColor,
  textColor, setTextColor,
  tokenHeight, setTokenHeight,
  textHeight, setTextHeight,
  tokenType, setTokenType
}) {
  const exportRef = useRef();
  const canvasRef = useRef(null);
  const [isCustom, setIsCustom] = useState(false);
  const [hasBevel, setHasBevel] = useState(false);
  const [hasRing, setHasRing] = useState(false);

  const handleDownload = () => {
    if (!unit) return;
    if (tokenType === '2D') {
      if (canvasRef.current) {
        const link = document.createElement('a');
        link.download = `${unit.name || 'token'}_${unit.baseSize || 'base'}.png`;
        link.href = canvasRef.current.toDataURL('image/png');
        link.click();
      }
    } else {
      if (!exportRef.current) return;
      try {
        const sceneClone = exportRef.current.clone(true);
        const badMeshes = [];
        sceneClone.traverse((child) => {
          if (child.isMesh && (!child.geometry?.attributes?.position)) {
            badMeshes.push(child);
          }
        });
        badMeshes.forEach(child => child.parent?.remove(child));
        const exporter = new STLExporter();
        const result = exporter.parse(sceneClone, { binary: true });
        const blob = new Blob([result], { type: 'application/octet-stream' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${unit.name || 'token'}_${unit.baseSize || 'base'}.stl`;
        link.click();
      } catch (err) {
        alert('Failed to generate STL: ' + err.message);
      }
    }
  };

  useLayoutEffect(() => {
    if (tokenType === '2D' && canvasRef.current && unit) {
      drawTokenToCanvas(canvasRef.current, unit, { baseColor, textColor, hasRing });
    }
  }, [tokenType, unit, baseColor, textColor, hasRing]);

  const handleSizeChange = (e) => {
    const val = e.target.value;
    if (val === 'Custom') {
      setIsCustom(true);
    } else {
      setIsCustom(false);
      if (onUpdate && unit) {
        onUpdate(unit.id, { baseSize: val });
        saveBaseSize(unit.name, val);
      }
    }
  };

  const handleScaleAdjust = (delta) => {
    if (onUpdate && unit) {
      const current = unit.scaleAdjustment || 1.0;
      const next = Math.round((current + delta) * 10) / 10;
      if (next > 0.1) onUpdate(unit.id, { scaleAdjustment: next });
    }
  };

  const currentShape = useMemo(() => {
    if (!unit?.baseSize) return 'Circle';
    if (unit.baseSize.toLowerCase().includes('rect')) return 'Rect';
    const match = unit.baseSize.match(/(\d+)(?:x(\d+))?/);
    if (match && match[2] && match[1] !== match[2]) return 'Oval';
    return 'Circle';
  }, [unit?.baseSize]);

  const handleShapeChange = (newShape) => {
    if (!unit) return;
    let w = 32, d = 32;
    const match = unit.baseSize.match(/(\d+)(?:x(\d+))?/);
    if (match) { w = parseInt(match[1]); d = match[2] ? parseInt(match[2]) : w; }
    let newSize = newShape === 'Circle' ? `${w}mm`
      : newShape === 'Oval' ? `${w}x${d}mm`
      : `${w}x${d}mm Rect`;
    if (onUpdate) onUpdate(unit.id, { baseSize: newSize });
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const w = formData.get('width');
    const d = formData.get('depth');
    let newSize = `${w}mm`;
    if (currentShape === 'Rect') newSize = `${w}x${d}mm Rect`;
    else if (currentShape === 'Oval' || w !== d) newSize = `${w}x${d}mm`;
    if (onUpdate && unit) {
      onUpdate(unit.id, { baseSize: newSize });
      saveBaseSize(unit.name, newSize);
    }
  };

  if (!unit) {
    return (
      <div className="panel" style={{ minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Select a unit to preview</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className="panel" style={{ padding: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Base Size</label>
          <select
            className="btn"
            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'white' }}
            value={commonBaseSizes.includes(unit.baseSize) ? unit.baseSize : 'Custom'}
            onChange={handleSizeChange}
          >
            {commonBaseSizes.map(size => <option key={size} value={size}>{size}</option>)}
            <option value="Custom">Custom...</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', marginLeft: '0.5rem' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Shape</label>
          <select
            className="btn"
            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'white' }}
            value={currentShape}
            onChange={(e) => handleShapeChange(e.target.value)}
          >
            <option value="Circle">Circle</option>
            <option value="Oval">Oval</option>
            <option value="Rect">Rect</option>
          </select>
        </div>

        {isCustom && (
          <form onSubmit={handleCustomSubmit} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>W</label>
              <input name="width" type="number" defaultValue={32} style={{ padding: '0.4rem', borderRadius: '4px', width: '40px' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>D</label>
              <input name="depth" type="number" defaultValue={32} style={{ padding: '0.4rem', borderRadius: '4px', width: '40px' }} />
            </div>
            <button type="submit" className="btn" style={{ fontSize: '0.8rem' }}>Set</button>
          </form>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', marginLeft: '1rem' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Options</label>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.8rem', color: 'white' }}>
              <input type="checkbox" checked={hasBevel} onChange={e => setHasBevel(e.target.checked)} /> Bevel
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.8rem', color: 'white' }}>
              <input type="checkbox" checked={hasRing} onChange={e => setHasRing(e.target.checked)} /> Ring
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', marginLeft: '1rem' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Scale</label>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button className="btn" style={{ padding: '0.2rem 0.5rem' }} onClick={() => handleScaleAdjust(-0.1)}>-</button>
            <span style={{ fontSize: '0.8rem', minWidth: '30px', textAlign: 'center' }}>{(unit.scaleAdjustment || 1.0).toFixed(1)}x</span>
            <button className="btn" style={{ padding: '0.2rem 0.5rem' }} onClick={() => handleScaleAdjust(0.1)}>+</button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', marginLeft: '1rem' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Height (Base/Text)</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <input type="number" min="1" max="20" step="0.5" value={tokenHeight || 3}
              onChange={(e) => setTokenHeight?.(parseFloat(e.target.value))}
              style={{ width: '45px', padding: '0.2rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'white' }} />
            <input type="number" min="0.2" max="5" step="0.1" value={textHeight || 1}
              onChange={(e) => setTextHeight?.(parseFloat(e.target.value))}
              style={{ width: '45px', padding: '0.2rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'white' }} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', marginLeft: '0.5rem' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Colors</label>
          <div style={{ display: 'flex', gap: '2px' }}>
            <input type="color" value={baseColor || '#333333'} onChange={(e) => setBaseColor?.(e.target.value)}
              title="Base Color" style={{ width: '24px', height: '24px', padding: 0, border: 'none', cursor: 'pointer', background: 'none' }} />
            <input type="color" value={textColor || '#ffd700'} onChange={(e) => setTextColor?.(e.target.value)}
              title="Text Color" style={{ width: '24px', height: '24px', padding: 0, border: 'none', cursor: 'pointer', background: 'none' }} />
          </div>
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
          <div style={{ display: 'flex', border: '1px solid var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
            {['3D', '2D'].map(t => (
              <button key={t} onClick={() => setTokenType?.(t)}
                style={{ padding: '0.2rem 0.5rem', background: tokenType === t ? 'var(--accent-primary)' : 'transparent',
                  color: tokenType === t ? 'black' : 'var(--text-secondary)', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}>
                {t}
              </button>
            ))}
          </div>
          <button className="btn" onClick={handleDownload}>{tokenType === '2D' ? 'PNG' : 'STL'}</button>
        </div>
      </div>

      <div className="panel" style={{ position: 'relative', height: '500px', padding: 0, overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#222' }}>
        {tokenType === '3D' ? (
          <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 50, 50], fov: 50 }}>
            <ambientLight intensity={0.5} />
            <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
            <pointLight position={[-10, -10, -10]} />
            <Center>
              <TokenModel unit={unit} exportRef={exportRef} baseColor={baseColor} textColor={textColor}
                tokenHeight={tokenHeight} textHeight={textHeight} hasBevel={hasBevel} hasRing={hasRing} />
            </Center>
            <OrbitControls makeDefault />
          </Canvas>
        ) : (
          <div style={{ overflow: 'auto', maxWidth: '100%', maxHeight: '100%', padding: '2rem' }}>
            <canvas ref={canvasRef} style={{ maxWidth: '100%', maxHeight: '100%', boxShadow: '0 0 20px rgba(0,0,0,0.5)' }} />
          </div>
        )}
        <div style={{ position: 'absolute', top: '20px', left: '20px', pointerEvents: 'none' }}>
          <h3 style={{ margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
            {unit.name}
            <span style={{ fontSize: '0.8em', marginLeft: '10px', opacity: 0.8 }}>{unit.baseSize}</span>
          </h3>
        </div>
      </div>
    </div>
  );
}
