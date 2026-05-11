'use client';
import { replaceKeywords } from './UnitAbilityDescription';

export const UnitAbility = ({ name, value, style }) => (
  <>
    {value && (
      <div className="ability" data-name={name} style={style}>
        <span className="title">{name}</span>
        <span className="value">{replaceKeywords(value)}</span>
      </div>
    )}
  </>
);
