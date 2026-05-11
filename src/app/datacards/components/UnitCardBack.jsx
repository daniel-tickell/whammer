'use client';
import { UnitExtra } from './UnitCard/UnitExtra';
import { UnitFactions } from './UnitCard/UnitFactions';
import { UnitKeywords } from './UnitCard/UnitKeywords';
import { UnitLoadout } from './UnitCard/UnitLoadout';
import { UnitName } from './UnitCard/UnitName';
import { UnitWargear } from './UnitCard/UnitWargear';
import { UnitWeapons } from './UnitCard/UnitWeapons';

export const UnitCardBack = ({ unit, cardStyle, className }) => {
  const headerColor = unit.headerColor || '#456664';
  const bannerColor = unit.bannerColor || '#103344';

  return (
    <div
      className={className}
      style={{
        ...cardStyle,
        justifyContent: 'center',
        justifyItems: 'center',
        display: 'flex',
        '--header-colour': headerColor,
        '--banner-colour': bannerColor,
        '--stat-text-colour': headerColor,
        '--weapon-keyword-colour': headerColor,
      }}>
      <div className="unit back" data-name={unit.name} data-fullname={`${unit.name} ${unit.subname || ''}`}>
        <div className="header back">
          <UnitName name={unit.name} subname={unit.subname} />
        </div>
        <div className="data_container">
          <div className="data back">
            <UnitWeapons unit={unit} fontSize={unit.weaponsFontSize} side="back" />
            <UnitExtra unit={unit} fontSize={unit.abilitiesFontSize} side="back" />
            <UnitWargear unit={unit} />
            <UnitLoadout unit={unit} />
          </div>
        </div>
        <div className="footer">
          <UnitKeywords keywords={unit.keywords} />
          <UnitFactions factions={unit.factions} />
        </div>
        <div className="faction">
          <div className={unit.faction_id} />
        </div>
      </div>
    </div>
  );
};
