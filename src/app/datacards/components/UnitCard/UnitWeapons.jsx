'use client';
import { UnitWeaponsType } from './UnitWeaponsType';
import { UnitAbilityDescription } from './UnitAbilityDescription';

export const UnitWeapons = ({ unit, fontSize, side = 'front' }) => {
  const fs = fontSize || 14;
  const showPrimarch = unit.abilities?.primarch?.length > 0 && (unit.abilityPositions?.primarch || 'front') === side;

  return (
    <div className="weapons">
      {side === 'front' && unit.showWeapons?.['rangedWeapons'] !== false && unit.rangedWeapons?.length > 0 && (
        <UnitWeaponsType weaponType={{ name: 'Ranged weapons', class: 'ranged', skill: 'BS' }} weapons={unit.rangedWeapons} fontSize={fs} />
      )}
      {side === 'front' && unit.showWeapons?.['meleeWeapons'] !== false && unit.meleeWeapons?.length > 0 && (
        <UnitWeaponsType weaponType={{ name: 'Melee weapons', class: 'melee', skill: 'WS' }} weapons={unit.meleeWeapons} fontSize={fs} />
      )}
      {showPrimarch && unit.abilities.primarch?.filter(a => a.showAbility)?.map((pa, i) => (
        <div className="special" key={`primarch-${pa.name}`}>
          <div className="heading"><div className="title">{pa.name}</div></div>
          {pa.abilities?.filter(a => a.showAbility)?.map((a, j) => (
            <UnitAbilityDescription name={a.name} description={a.description} showDescription={a.showDescription} key={j} />
          ))}
        </div>
      ))}
    </div>
  );
};
