'use client';
export const UnitKeywords = ({ keywords, fontSize }) => (
  <div className="keywords" style={{ fontSize: `${fontSize || 15}px` }}>
    <span className="title">keywords</span>
    <span className="value">
      {keywords?.map((kw, i, arr) => (
        kw?.includes(':')
          ? <span key={kw} style={{ fontWeight: 400, textTransform: 'uppercase', fontSize: '0.9rem' }}>{kw}&nbsp;</span>
          : `${kw}${arr.length - 1 !== i ? ',' : ''} `
      ))}
    </span>
  </div>
);
