'use client';
import { UnitAbility } from './UnitAbility';
import { UnitAbilityDescription, replaceKeywords } from './UnitAbilityDescription';
import { UnitInvul } from './UnitInvul';

export const UnitExtra = ({ unit, fontSize, side = 'front' }) => {
  const fs = fontSize || 12;
  const pos = unit.abilityPositions || {};
  const show = unit.showAbilities || {};

  const showCore    = show['core']    !== false && (pos.core    || 'front') === side;
  const showFaction = show['faction'] !== false && (pos.faction || 'front') === side;
  const showOther   = show['other']   !== false && (pos.other   || 'front') === side;
  const showWargear = show['wargear'] !== false && (pos.wargear || 'front') === side;
  const showDamaged = unit.abilities?.damaged?.showDamagedAbility && (pos.damaged || 'front') === side;
  const showSpecial = show['special'] !== false && unit.abilities?.special?.length > 0 && (pos.special || 'front') === side;

  return (
    <div className="extra">
      {(showCore || showFaction || showOther) && (
        <div className="abilities">
          <div className="heading"><div className="title">Abilities</div></div>
          {showCore && <UnitAbility name="core" value={unit.abilities?.core?.join(', ')} style={{ fontSize: `${fs}px` }} />}
          {showFaction && <UnitAbility name="faction" value={unit.abilities?.faction?.join(', ')} style={{ fontSize: `${fs}px` }} />}
          {showOther && unit.abilities?.other?.filter(a => a.showAbility)?.map((a, i) => (
            <UnitAbilityDescription name={a.name} description={a.description} showDescription={a.showDescription} key={i} style={{ fontSize: `${fs}px` }} />
          ))}
        </div>
      )}
      {showWargear && unit.abilities?.wargear?.filter(a => a.showAbility)?.length > 0 && (
        <div className="abilities">
          <div className="heading"><div className="title">Wargear abilities</div></div>
          {unit.abilities.wargear.filter(a => a.showAbility).map((a, i) => (
            <UnitAbilityDescription name={a.name} description={a.description} showDescription={a.showDescription} key={i} style={{ fontSize: `${fs}px` }} />
          ))}
        </div>
      )}
      {showDamaged && (
        <div className="damaged" style={{ fontSize: `${fs}px` }}>
          <div className="heading"><div className="title">Damaged: {unit.abilities.damaged.range}</div></div>
          {unit.abilities.damaged.showDescription && (
            <div className="description" style={{ fontSize: `${fs}px` }}>{replaceKeywords(unit.abilities.damaged.description)}</div>
          )}
        </div>
      )}
      {showSpecial && unit.abilities.special?.filter(a => a.showAbility)?.map((a, i) => (
        <div className="special" key={`special-${a.name}`} style={{ fontSize: `${fs}px` }}>
          <div className="heading"><div className="title">{a.name}</div></div>
          {a.showDescription && (
            <div className="description-container">
              <span className="description">{replaceKeywords(a.description)}</span>
            </div>
          )}
        </div>
      ))}
      {unit.abilities?.invul?.showInvulnerableSave && !unit.abilities?.invul?.showAtTop && (
        <UnitInvul invul={unit.abilities.invul} />
      )}
    </div>
  );
};
