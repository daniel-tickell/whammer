'use client';
import { UnitExtra } from './UnitCard/UnitExtra';
import { UnitFactions } from './UnitCard/UnitFactions';
import { UnitInvulTop } from './UnitCard/UnitInvulTop';
import { UnitKeywords } from './UnitCard/UnitKeywords';
import { UnitName } from './UnitCard/UnitName';
import { UnitStats } from './UnitCard/UnitStats';
import { UnitWeapons } from './UnitCard/UnitWeapons';

export const UnitCardFront = ({ unit, cardStyle, className }) => {
  const headerColor = unit.headerColor || '#456664';
  const bannerColor = unit.bannerColor || '#103344';

  return (
    <div
      className={className}
      style={{
        ...cardStyle,
        display: 'flex',
        justifyContent: 'center',
        '--header-colour': headerColor,
        '--banner-colour': bannerColor,
        '--stat-text-colour': headerColor,
        '--weapon-keyword-colour': headerColor,
      }}>
      <div className="unit front" data-name={unit.name} data-fullname={`${unit.name} ${unit.subname || ''}`}>
        <div className="header">
          <UnitName
            name={unit.name}
            subname={unit.subname}
            points={unit.points}
            legends={unit.legends}
            combatPatrol={unit.combatPatrol}
            externalImage={unit.externalImage}
            imageZIndex={unit.imageZIndex}
            imagePositionX={unit.imagePositionX}
            imagePositionY={unit.imagePositionY}
            imageWidth={unit.imageWidth}
            imageHeight={unit.imageHeight}
          />
          <UnitStats stats={unit.stats} fontSize={unit.statsFontSize} />
          <div className="stats_container" key="stat-line-invul">
            {unit.abilities?.invul?.showInvulnerableSave && unit.abilities?.invul?.showAtTop && (
              <UnitInvulTop invul={unit.abilities.invul} />
            )}
          </div>
        </div>
        <div className="data_container">
          <div className="data">
            <UnitWeapons unit={unit} fontSize={unit.weaponsFontSize} side="front" />
            <UnitExtra unit={unit} fontSize={unit.abilitiesFontSize} side="front" />
          </div>
        </div>
        <div className="footer">
          <UnitKeywords keywords={unit.keywords} fontSize={unit.keywordsFontSize} />
          <UnitFactions factions={unit.factions} fontSize={unit.factionsFontSize} />
        </div>
        <div className="faction"><div className={unit.faction_id} /></div>
      </div>
    </div>
  );
};
