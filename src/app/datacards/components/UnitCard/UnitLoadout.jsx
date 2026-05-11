'use client';
export const UnitLoadout = ({ unit }) => {
  const unitLoadouts = unit?.loadout?.split('.').filter(v => v);
  if (unit.showComposition === false && unit.showLoadout === false) return null;

  return (
    <div className="extra">
      <div className="composition_container">
        {unit.showComposition !== false && unit.composition?.length > 0 && (
          <>
            <div className="heading"><div className="title">Unit Composition</div></div>
            {unit.composition.map((c, i) => (
              <div className="composition" key={i}><span className="description">{c}</span></div>
            ))}
          </>
        )}
        {unit.showLoadout !== false && unitLoadouts?.map((loadout, i) => {
          const line = loadout?.split(':');
          return line?.length > 1
            ? <div className="loadout" key={i}><span className="name">{line[0]}</span><span className="description">{line[1]}.</span></div>
            : <div className="loadout" key={i}><span className="description">{loadout}</span></div>;
        })}
        {unit.leads && (
          <>
            <div className="heading"><div className="title">Leader</div></div>
            <div className="leader">
              <span className="description">This unit can lead the following units:</span>
              {unit.leads.units?.map(u => <div key={u}>■ <span className="value">{u}</span></div>)}
              {unit.leads.extra && <span className="description">{unit.leads.extra}</span>}
            </div>
          </>
        )}
        {unit.leadBy?.length > 0 && (
          <>
            <div className="heading"><div className="title">Led by</div></div>
            <div className="ledBy">
              <span className="description">This unit can be led by the following units:</span>
              {unit.leadBy.map(u => <div key={u}>■ <span className="value">{u}</span></div>)}
            </div>
          </>
        )}
        {unit.transport && (
          <>
            <div className="heading"><div className="title">Transport</div></div>
            <div className="transport"><span className="description">{unit.transport}</span></div>
          </>
        )}
      </div>
    </div>
  );
};
