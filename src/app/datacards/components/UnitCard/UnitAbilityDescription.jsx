'use client';
import React from 'react';

export function replaceKeywords(text) {
  if (!text) return null;
  // Strip [keyword] markers to just the keyword text, keep everything else as-is
  return text
    .replace(/\[(.*?)\]/g, '$1')
    .split('■')
    .map((seg, i, arr) => (
      <React.Fragment key={i}>
        {seg}
        {i < arr.length - 1 && <><br />■</>}
      </React.Fragment>
    ));
}

export const UnitAbilityDescription = ({ name, description, showDescription, style }) => (
  <div className="ability" style={style}>
    <span className="name">{name}</span>
    {showDescription && <span className="description">{replaceKeywords(description)}</span>}
  </div>
);
