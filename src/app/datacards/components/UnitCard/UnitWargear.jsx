'use client';
export const UnitWargear = ({ unit }) => {
  if (unit.showWargear === false || !unit.wargear?.length) return null;
  const explanations = [];
  return (
    <div className="wargear_container">
      <div className="wargear">
        <div className="heading"><div className="title">Wargear Options</div></div>
        <div className="content">
          {unit.wargear.map((wargear, i) => (
            <div className="item" key={`wargear-${i}`}>
              <span className="description">
                {wargear.split('◦')[0]}
                <ul style={{ columns: wargear.split('◦').length > 4 ? '2' : '1' }}>
                  {wargear.split('◦').slice(1).map(line => (
                    <li key={line}>{line.trim()}</li>
                  ))}
                </ul>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
