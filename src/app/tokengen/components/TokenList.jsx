'use client';

export default function TokenList({ units, selectedId, onSelect, action }) {
  if (!units || units.length === 0) {
    return (
      <div className="panel">
        <h2>Parsed Units</h2>
        <p style={{ color: 'var(--text-secondary)' }}>No units parsed yet.</p>
      </div>
    );
  }

  return (
    <div className="panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h2 style={{ margin: 0 }}>Parsed Units</h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            {units.length} unit{units.length !== 1 ? 's' : ''} found
          </span>
        </div>
        {action}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '500px', overflowY: 'auto' }}>
        {units.map(unit => (
          <div
            key={unit.id}
            onClick={() => onSelect(unit.id)}
            style={{
              padding: '0.8rem',
              background: unit.id === selectedId ? 'var(--bg-tertiary)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${unit.id === selectedId ? 'var(--accent-primary)' : 'transparent'}`,
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div>
              <div style={{ fontWeight: 600, color: unit.id === selectedId ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                {unit.name}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {unit.quantity} model{unit.quantity !== 1 ? 's' : ''} • {unit.baseSize}
              </div>
            </div>
            {unit.id === selectedId && (
              <div style={{ color: 'var(--accent-primary)', fontSize: '1.2rem' }}>
                &rsaquo;
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
