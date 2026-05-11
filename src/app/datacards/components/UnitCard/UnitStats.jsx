'use client';
import { UnitStat } from './UnitStat';

const HEADERS = [
  { text: 'M', value: 'm' }, { text: 'T', value: 't' }, { text: 'SV', value: 'sv' },
  { text: 'W', value: 'w' }, { text: 'LD', value: 'ld' }, { text: 'OC', value: 'oc' },
];

export const UnitStats = ({ stats, fontSize }) => {
  const fs = fontSize || 22;
  return (
    <>
      <div className="stats_container">
        {HEADERS.map(h => (
          <div className="stat" key={h.value}><div className="caption">{h.text}</div></div>
        ))}
      </div>
      {stats?.filter(s => s.active)?.map((stat, i) => (
        <div className="stats_container" key={`stat-line-${i}`}>
          <UnitStat value={stat.m} style={{ fontSize: `${fs}px` }} />
          <UnitStat value={stat.t} style={{ fontSize: `${fs}px` }} />
          <UnitStat value={stat.sv} style={{ fontSize: `${fs}px` }} />
          <UnitStat value={stat.w} showDamagedMarker={stat.showDamagedMarker} style={{ fontSize: `${fs}px` }} />
          <UnitStat value={stat.ld} style={{ fontSize: `${fs}px` }} />
          <UnitStat value={stat.oc} style={{ fontSize: `${fs}px` }} />
          {stat.showName && <div className="name" style={{ fontSize: '14px', overflow: 'hidden' }}>{stat.name}</div>}
        </div>
      ))}
    </>
  );
};
