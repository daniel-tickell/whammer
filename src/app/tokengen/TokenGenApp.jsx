'use client';

import { useState } from 'react';
import Layout from './components/Layout';
import ListImporter from './components/ListImporter';
import TokenList from './components/TokenList';
import TokenPreview from './components/TokenPreview';
import BatchDownloader from './components/BatchDownloader';
import { parseList } from './utils/parser';
import { getBaseSize } from './utils/baseSizes';

export default function TokenGenApp() {
  const [units, setUnits] = useState([]);
  const [selectedUnitId, setSelectedUnitId] = useState(null);

  const [baseColor, setBaseColor] = useState('#e0e0e0');
  const [textColor, setTextColor] = useState('#000000');
  const [tokenHeight, setTokenHeight] = useState(3);
  const [textHeight, setTextHeight] = useState(1);
  const [tokenType, setTokenType] = useState('3D');

  const handleParse = (text) => {
    const parsed = parseList(text);
    const enriched = parsed.map(u => ({
      ...u,
      baseSize: getBaseSize(u.name) || '32mm',
    }));
    setUnits(enriched);
    if (enriched.length > 0) {
      setSelectedUnitId(enriched[0].id);
    }
  };

  const handleUpdateUnit = (id, newProps) => {
    setUnits(prev => prev.map(u =>
      u.id === id ? { ...u, ...newProps } : u
    ));
  };

  const selectedUnit = units.find(u => u.id === selectedUnitId);

  return (
    <Layout>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <ListImporter onParse={handleParse} />
          <TokenList
            units={units}
            selectedId={selectedUnitId}
            onSelect={setSelectedUnitId}
            action={
              <BatchDownloader
                units={units}
                baseColor={baseColor}
                textColor={textColor}
                tokenHeight={tokenHeight}
                textHeight={textHeight}
                tokenType={tokenType}
              />
            }
          />
        </div>
        <div>
          <TokenPreview
            unit={selectedUnit}
            onUpdate={handleUpdateUnit}
            baseColor={baseColor}
            setBaseColor={setBaseColor}
            textColor={textColor}
            setTextColor={setTextColor}
            tokenHeight={tokenHeight}
            setTokenHeight={setTokenHeight}
            textHeight={textHeight}
            setTextHeight={setTextHeight}
            tokenType={tokenType}
            setTokenType={setTokenType}
          />
        </div>
      </div>
    </Layout>
  );
}
