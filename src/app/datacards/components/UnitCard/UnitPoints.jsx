'use client';
export const UnitPoints = ({ points }) => {
  const active = points?.filter(p => p.active);
  if (!active?.length) return null;
  const tip = active.map(p => `${p.models}${p.keyword ? ` (${p.keyword})` : ''}: ${p.cost}pts`).join(' | ');
  return (
    <div className="points_container" title={tip}>
      <div className="points">{active[0].cost} pts</div>
    </div>
  );
};
