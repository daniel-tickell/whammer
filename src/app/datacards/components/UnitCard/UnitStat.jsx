'use client';
export const UnitStat = ({ value, showDamagedMarker, style }) => (
  <div className="stat">
    <div className="value_container">
      <div className="value" style={style}>{value}</div>
    </div>
    {showDamagedMarker && <div className="damageTable" />}
  </div>
);
