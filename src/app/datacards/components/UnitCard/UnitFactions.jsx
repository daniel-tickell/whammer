'use client';
export const UnitFactions = ({ factions, fontSize }) => (
  <div className="factions" style={{ fontSize: `${fontSize || 18}px` }}>
    <span className="title">faction keywords</span>
    <span className="value">{factions?.join(', ')}</span>
  </div>
);
