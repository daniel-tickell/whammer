'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import styles from './minis.module.css';

const STATE_KEYS = ['unassembled', 'assembled', 'primed', 'painted', 'finished'];
const STATE_COLORS = {
  unassembled: '#C0392B',
  assembled: '#F39C12',
  primed: '#3498DB',
  painted: '#9B59B6',
  finished: '#27AE60',
};

const BASE_SIZES = [
  '25mm', '28.5mm', '32mm', '40mm', '50mm', '60mm', '80mm', '90mm',
  '100mm', '130mm', '160mm', '60x35mm', '75x42mm', '90x52mm',
  '105x70mm', '120x92mm', '170x105mm',
];

const UNIT_TYPES = [
  'Infantry', 'Character', 'Cavalry', 'Vehicle', 'Monster',
  'Artillery', 'Battlesuit', 'Beast', 'Swarm', 'Fortification',
];

const EMPTY_FORM = { unitName: '', qty: 1, faction: '', baseSize: '', gameSystem: '', unitType: '', tags: '' };

export default function ModelManager() {
  const [models, setModels] = useState([]);
  const [selectedFaction, setSelectedFaction] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_FORM);

  const [editingModel, setEditingModel] = useState(null);
  const [editForm, setEditForm] = useState({});

  const fetchModels = async () => {
    try {
      const res = await fetch('/api/models');
      if (res.ok) {
        const data = await res.json();
        setModels(data);
        if (!selectedFaction && data.length > 0) {
          setSelectedFaction(data[0].faction);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchModels(); }, []);

  const { factions, factionModels, globalStats } = useMemo(() => {
    const factionMap = {};
    let totalQty = 0, totalFinished = 0;

    for (const m of models) {
      if (!factionMap[m.faction]) factionMap[m.faction] = [];
      factionMap[m.faction].push(m);
      totalQty += m.qty;
      totalFinished += m.finished;
    }

    return {
      factions: Object.keys(factionMap).sort(),
      factionModels: factionMap,
      globalStats: {
        factions: Object.keys(factionMap).length,
        units: models.length,
        models: totalQty,
        finished: totalQty > 0 ? Math.round((totalFinished / totalQty) * 100) : 0,
      },
    };
  }, [models]);

  const currentModels = [...(factionModels[selectedFaction] ?? [])].sort((a, b) => a.unitName.localeCompare(b.unitName));
  const currentQty = currentModels.reduce((s, m) => s + m.qty, 0);
  const currentFinished = currentModels.reduce((s, m) => s + m.finished, 0);
  const currentPct = currentQty > 0 ? Math.round((currentFinished / currentQty) * 100) : 0;

  const moveState = async (model, direction) => {
    await fetch('/api/models', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _id: model._id, direction }),
    });
    fetchModels();
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    await fetch('/api/models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...addForm,
        tags: addForm.tags ? addForm.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      }),
    });
    setSelectedFaction(addForm.faction);
    setAddForm(EMPTY_FORM);
    setShowAddModal(false);
    fetchModels();
  };

  const openEdit = (model) => {
    setEditingModel(model);
    setEditForm({
      unitName: model.unitName,
      qty: model.qty,
      faction: model.faction,
      baseSize: model.baseSize || '',
      gameSystem: model.gameSystem || '',
      unitType: model.unitType || '',
      tags: (model.tags || []).join(', '),
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    await fetch('/api/models', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        _id: editingModel._id,
        ...editForm,
        qty: parseInt(editForm.qty) || 1,
        tags: editForm.tags ? editForm.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      }),
    });
    setEditingModel(null);
    fetchModels();
  };

  const handleDelete = async (_id) => {
    if (!confirm('Delete this model?')) return;
    await fetch(`/api/models?id=${_id}`, { method: 'DELETE' });
    fetchModels();
  };

  if (loading) return <div className={styles.appContainer} style={{ alignItems: 'center', justifyContent: 'center' }}><p>Loading…</p></div>;

  return (
    <div className={styles.appContainer}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div className={styles.sidebarTitleRow}>
            <span className={styles.icon}>🗂️</span>
            <h2>Models</h2>
            <div className={styles.sidebarActions}>
              <span onClick={() => { setAddForm(EMPTY_FORM); setShowAddModal(true); }} className={styles.actionIcon} title="Add Model">➕</span>
              <Link href="/"><span className={styles.actionIcon}>🏠</span></Link>
            </div>
          </div>
          <div className={styles.globalStats}>
            <div className={styles.statBox} style={{ backgroundColor: 'rgba(21,101,192,0.2)', borderColor: '#1565C0' }}>
              <span className={styles.icon}>📚</span>
              <div className={styles.statBoxValue}>{globalStats.factions}</div>
              <div className={styles.statBoxLabel}>Factions</div>
            </div>
            <div className={styles.statBox} style={{ backgroundColor: 'rgba(39,174,96,0.2)', borderColor: '#27AE60' }}>
              <span className={styles.icon}>💠</span>
              <div className={styles.statBoxValue}>{globalStats.units}</div>
              <div className={styles.statBoxLabel}>Units</div>
            </div>
            <div className={styles.statBox} style={{ backgroundColor: 'rgba(211,84,0,0.2)', borderColor: '#D35400' }}>
              <span className={styles.icon}>⚖️</span>
              <div className={styles.statBoxValue}>{globalStats.models}</div>
              <div className={styles.statBoxLabel}>Models</div>
            </div>
            <div className={styles.statBox} style={{ backgroundColor: 'rgba(192,57,43,0.2)', borderColor: '#C0392B' }}>
              <span className={styles.icon}>✅</span>
              <div className={styles.statBoxValue}>{globalStats.finished}%</div>
              <div className={styles.statBoxLabel}>Finished</div>
            </div>
          </div>
        </div>

        <div className={styles.sidebarContent}>
          {factions.map(faction => (
            <div key={faction} className={`${styles.factionItem} ${selectedFaction === faction ? styles.activeFaction : ''}`} onClick={() => setSelectedFaction(faction)}>
              <span className={styles.factionName}>{faction}</span>
              <span className={styles.factionCount}>{factionModels[faction].length}</span>
              <div className={styles.factionHighlight}></div>
            </div>
          ))}
        </div>
      </aside>

      {/* Main */}
      <main className={styles.mainContent}>
        {selectedFaction ? (
          <>
            <h1 className={styles.mainTitle}>{selectedFaction}</h1>
            <div className={styles.factionStatsBar}>
              <div className={styles.factionStat}><span className={styles.icon}>💠</span><span className={styles.fsValue}>{currentQty}</span><span className={styles.fsLabel}>Models</span></div>
              <div className={styles.factionStat}><span className={styles.icon}>✅</span><span className={styles.fsValue}>{currentPct}%</span><span className={styles.fsLabel}>Finished</span></div>
            </div>

            <div className={styles.actionsBar}>
              <button onClick={() => { setAddForm({ ...EMPTY_FORM, faction: selectedFaction }); setShowAddModal(true); }} className={styles.addBtn}>
                <span>📝</span> Add to {selectedFaction}
              </button>
            </div>

            <div className={styles.unitsList}>
              {currentModels.map(model => (
                <div key={model._id} className={styles.unitItem}>
                  <div className={styles.unitHeader}>
                    <div className={styles.unitNameBlock}>
                      <span className={styles.unitName}>{model.unitName}</span>
                      <div className={styles.metaBadges}>
                        {model.baseSize && <span className={styles.badge} style={{ backgroundColor: 'rgba(52,152,219,0.2)', borderColor: '#3498DB' }}>{model.baseSize}</span>}
                        {model.unitType && <span className={styles.badge} style={{ backgroundColor: 'rgba(155,89,182,0.2)', borderColor: '#9B59B6' }}>{model.unitType}</span>}
                        {model.gameSystem && <span className={styles.badge} style={{ backgroundColor: 'rgba(230,126,34,0.2)', borderColor: '#E67E22' }}>{model.gameSystem}</span>}
                        {(model.tags || []).map(tag => (
                          <span key={tag} className={styles.badge} style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.15)' }}>{tag}</span>
                        ))}
                      </div>
                    </div>
                    <div className={styles.unitRight}>
                      <span className={styles.unitQty}>{model.qty} MODELS</span>
                      <button className={styles.editMiniBtn} onClick={() => openEdit(model)} title="Edit">✎</button>
                      <button className={styles.deleteMiniBtn} onClick={() => handleDelete(model._id)}>×</button>
                    </div>
                  </div>

                  <div className={styles.progressRow}>
                    <button className={styles.stateNavBtn} onClick={() => moveState(model, 'prev')}>‹</button>
                    <div className={styles.progressBarContainer} onClick={() => moveState(model, 'next')}>
                      {STATE_KEYS.map(key => {
                        const count = model[key];
                        if (count === 0) return null;
                        const width = (count / model.qty) * 100;
                        return (
                          <div key={key} className={styles.progressBarSegment} style={{ width: `${width}%`, backgroundColor: STATE_COLORS[key] }}>
                            {width > 15 && <span className={styles.progressBarText}>{count} {key === 'unassembled' ? 'UNBUILT' : key.toUpperCase()}</span>}
                          </div>
                        );
                      })}
                    </div>
                    <button className={styles.stateNavBtn} onClick={() => moveState(model, 'next')}>›</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className={styles.emptyStateContainer}>
            <h2>Model Manager</h2>
            <p>Select a faction to view your collection.</p>
          </div>
        )}
      </main>

      {/* Add Model Modal */}
      {showAddModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}><h2>Add Model</h2><button onClick={() => setShowAddModal(false)} className={styles.closeBtn}>×</button></div>
            <form onSubmit={handleAdd} className={styles.form}>
              <div className={styles.inputGroup}>
                <input type="text" placeholder="Unit name" value={addForm.unitName} onChange={e => setAddForm({ ...addForm, unitName: e.target.value })} required className={styles.input} />
                <input type="number" placeholder="Qty" min="1" value={addForm.qty} onChange={e => setAddForm({ ...addForm, qty: parseInt(e.target.value) || 1 })} required className={styles.inputQty} />
              </div>
              <input type="text" placeholder="Faction" value={addForm.faction} onChange={e => setAddForm({ ...addForm, faction: e.target.value })} required className={styles.input} />
              <div className={styles.inputGroup}>
                <select value={addForm.baseSize} onChange={e => setAddForm({ ...addForm, baseSize: e.target.value })} className={styles.select}>
                  <option value="">Base size…</option>
                  {BASE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={addForm.unitType} onChange={e => setAddForm({ ...addForm, unitType: e.target.value })} className={styles.select}>
                  <option value="">Unit type…</option>
                  {UNIT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <input type="text" placeholder="Game system (e.g. Warhammer 40,000)" value={addForm.gameSystem} onChange={e => setAddForm({ ...addForm, gameSystem: e.target.value })} className={styles.input} />
              <input type="text" placeholder="Tags (comma-separated)" value={addForm.tags} onChange={e => setAddForm({ ...addForm, tags: e.target.value })} className={styles.input} />
              <button type="submit" className={styles.button}>Add</button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Model Modal */}
      {editingModel && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}><h2>Edit Model</h2><button onClick={() => setEditingModel(null)} className={styles.closeBtn}>×</button></div>
            <form onSubmit={handleSaveEdit} className={styles.form}>
              <div className={styles.inputGroup}>
                <input type="text" placeholder="Unit name" value={editForm.unitName} onChange={e => setEditForm({ ...editForm, unitName: e.target.value })} required className={styles.input} />
                <input type="number" min="1" value={editForm.qty} onChange={e => setEditForm({ ...editForm, qty: parseInt(e.target.value) || 1 })} required className={styles.inputQty} />
              </div>
              <input type="text" placeholder="Faction" value={editForm.faction} onChange={e => setEditForm({ ...editForm, faction: e.target.value })} required className={styles.input} />
              <div className={styles.inputGroup}>
                <select value={editForm.baseSize} onChange={e => setEditForm({ ...editForm, baseSize: e.target.value })} className={styles.select}>
                  <option value="">Base size…</option>
                  {BASE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={editForm.unitType} onChange={e => setEditForm({ ...editForm, unitType: e.target.value })} className={styles.select}>
                  <option value="">Unit type…</option>
                  {UNIT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <input type="text" placeholder="Game system" value={editForm.gameSystem} onChange={e => setEditForm({ ...editForm, gameSystem: e.target.value })} className={styles.input} />
              <input type="text" placeholder="Tags (comma-separated)" value={editForm.tags} onChange={e => setEditForm({ ...editForm, tags: e.target.value })} className={styles.input} />
              <button type="submit" className={styles.button}>Save</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
