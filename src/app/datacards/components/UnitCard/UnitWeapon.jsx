'use client';
import { replaceKeywords } from './UnitAbilityDescription';

const UnitWeaponKeywords = ({ keywords }) => (
  <span className="weapon_keywords">
    {keywords.map((kw, i) => (
      <span key={kw} className="keyword">{kw}{i < keywords.length - 1 ? ', ' : ''}</span>
    ))}
  </span>
);

export const UnitWeapon = ({ weapon, style }) => (
  <>
    {weapon.profiles?.filter(l => l.active !== false)?.map((line, i, profiles) => (
      <div className={`weapon${profiles.length > 1 ? ' multi-line' : ''}`} key={`weapon-line-${i}`} data-name={line.name} style={style}>
        <div className="line">
          <div className="value" style={{ display: 'flex', flexWrap: 'wrap' }}>
            <span>{line.name}</span>
            {line.keywords?.length > 0 && (
              <span style={{ paddingLeft: '4px' }}><UnitWeaponKeywords keywords={line.keywords} /></span>
            )}
          </div>
          <div className="value center">{line.range}</div>
          <div className="value center">{line.attacks}</div>
          <div className="value center">{line.skill}</div>
          <div className="value center">{line.strength}</div>
          <div className="value center">{line.ap}</div>
          <div className="value center">{line.damage}</div>
        </div>
      </div>
    ))}
    {weapon?.abilities && (
      <div className="special">
        {weapon.abilities?.filter(l => l.showAbility)?.map((line, i) => (
          <div className="ability" style={{ paddingLeft: 30, paddingRight: 8 }} key={`weapon-ability-${line.name}`}>
            <span className="name">{line.name}</span>
            {line.showDescription && <span className="description">{replaceKeywords(line.description)}</span>}
          </div>
        ))}
      </div>
    )}
  </>
);
