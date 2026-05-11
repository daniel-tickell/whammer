'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './minis.module.css';

// ── TrayGen integration ──────────────────────────────────────────────
const TRAY_WIDTH = 217.7;
const TRAY_DEPTH = 140;
const CLEARANCE = 0.5;
const FRONT_GAP = 5;
const BACK_BARRIER = 3;
const MIN_BARRIER = 1;

function calculateTrays(armyList) {
  const usableDepth = TRAY_DEPTH - FRONT_GAP - BACK_BARRIER;
  let requiredSlots = [];
  armyList.forEach(item => {
    const D = item.baseSize;
    const basesPerSlot = Math.floor(usableDepth / D);
    const numSlots = Math.ceil(item.quantity / basesPerSlot);
    for (let i = 0; i < numSlots; i++) requiredSlots.push(D);
  });
  requiredSlots.sort((a, b) => b - a);
  const trays = [];
  let trayCounter = 1, currentTray = [], currentBaseSum = 0;
  for (const D of requiredSlots) {
    const newBaseSum = currentBaseSum + D + CLEARANCE;
    const minWidthNeeded = newBaseSum + (currentTray.length + 2) * MIN_BARRIER;
    if (minWidthNeeded <= TRAY_WIDTH) {
      currentTray.push(D);
      currentBaseSum = newBaseSum;
    } else {
      if (currentTray.length > 0) {
        const barrier = (TRAY_WIDTH - currentBaseSum) / (currentTray.length + 1);
        trays.push({ id: trayCounter++, slot_diameters: [...currentTray], barrier_width: barrier.toFixed(3), description: `${currentTray.length} Mixed Slots` });
      }
      currentTray = [D]; currentBaseSum = D + CLEARANCE;
    }
  }
  if (currentTray.length > 0) {
    const barrier = (TRAY_WIDTH - currentBaseSum) / (currentTray.length + 1);
    trays.push({ id: trayCounter++, slot_diameters: [...currentTray], barrier_width: barrier.toFixed(3), description: `${currentTray.length} Mixed Slots` });
  }
  return trays;
}

const GDC_FACTION_IDS = [
  'space_marines','chaos_spacemarines','deathguard','thousandsons','worldeaters',
  'darkangels','bloodangels','spacewolves','blacktemplar','greyknights',
  'adeptasororitas','adeptusmechanicus','adeptuscustodes','imperialknights',
  'chaosknights','chaosdaemons','astramilitarum','tyranids','necrons',
  'orks','tau','aeldari','drukhari','gsc','votann','agents','deathwatch',
  'emperors_children','unaligned',
];

function guessFactionId(name) {
  if (!name) return '';
  const key = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const exact = GDC_FACTION_IDS.find(id => id.replace(/_/g, '') === key);
  if (exact) return exact;
  const partial = GDC_FACTION_IDS.find(id => id.replace(/_/g, '').includes(key) || key.includes(id.replace(/_/g, '')));
  return partial || key;
}

function parseBaseSize(str) {
  if (!str) return null;
  const m = str.match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : null;
}
// ─────────────────────────────────────────────────────────────────────

const STATE_KEYS = ['ordered', 'unassembled', 'assembled', 'primed', 'painted', 'finished'];
const STATE_COLORS = {
  ordered:     '#C0392B',
  unassembled: '#E8621A',
  assembled:   '#F39C12',
  primed:      '#F1C40F',
  painted:     '#8BC34A',
  finished:    '#27AE60',
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

const PREDEFINED_CATEGORIES = ['Imperium', 'Xenos', 'Chaos', 'Kill Team'];
const CAT_ORDER = [...PREDEFINED_CATEGORIES, 'Uncategorized'];

const EMPTY_FORM = { unitName: '', qty: 1, faction: '', category: '', baseSize: '', gameSystem: '', unitType: '', tags: '' };

export default function ModelManager() {
  const router = useRouter();
  const [models, setModels] = useState([]);
  const [selectedFaction, setSelectedFaction] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_FORM);

  const [editingModel, setEditingModel] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [collapsedCategories, setCollapsedCategories] = useState(new Set());

  const [definedCategories, setDefinedCategories] = useState([]);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [editCategoryName, setEditCategoryName] = useState('');

  const [draggingFaction, setDraggingFaction] = useState(null);
  const [dragOverCategory, setDragOverCategory] = useState(null);
  const [draggingModelId, setDraggingModelId] = useState(null);
  const [dragOverFaction, setDragOverFaction] = useState(null);
  const [editingFaction, setEditingFaction] = useState(null);
  const [editFactionName, setEditFactionName] = useState('');

  const [selectedModelIds, setSelectedModelIds] = useState(new Set());
  const [showTrayModal, setShowTrayModal] = useState(false);
  const [trayMergeShelf, setTrayMergeShelf] = useState(false);
  const [trayGenerating, setTrayGenerating] = useState(false);

  const [cardHeaderColor] = useState('#13151A');
  const [cardBannerColor] = useState('#C0392B');

  const [definedFactions, setDefinedFactions] = useState([]);
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupCategory, setNewGroupCategory] = useState('');

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

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) setDefinedCategories(await res.json());
    } catch {}
  };

  const fetchFactions = async () => {
    try {
      const res = await fetch('/api/factions');
      if (res.ok) setDefinedFactions(await res.json());
    } catch {}
  };

  const handleRenameCategory = async (oldName) => {
    const trimmed = editCategoryName.trim();
    setEditingCategory(null);
    if (!trimmed || trimmed === oldName) return;
    await fetch('/api/categories', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldName, newName: trimmed }),
    });
    fetchCategories();
    fetchFactions();
    fetchModels();
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCategoryName.trim() }),
    });
    setNewCategoryName('');
    setShowAddCategoryModal(false);
    fetchCategories();
  };

  const handleRenameFaction = async (oldName) => {
    const trimmed = editFactionName.trim();
    setEditingFaction(null);
    if (!trimmed || trimmed === oldName) return;
    if (selectedFaction === oldName) setSelectedFaction(trimmed);
    await fetch('/api/factions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldName, newName: trimmed }),
    });
    fetchFactions();
    fetchModels();
  };

  const handleModelDropOnFaction = async (targetFaction, modelId) => {
    setDraggingModelId(null);
    setDragOverFaction(null);
    const model = models.find(m => m._id === modelId);
    if (!model || model.faction === targetFaction) return;
    await fetch('/api/models', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        _id: modelId,
        faction: targetFaction,
        category: factionCategoryMap[targetFaction] || null,
      }),
    });
    fetchModels();
  };

  const handleAddGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    await fetch('/api/factions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newGroupName.trim(), category: newGroupCategory || null }),
    });
    setNewGroupName('');
    setShowAddGroupModal(false);
    fetchFactions();
  };

  const handleFactionDrop = async (e, targetCat) => {
    e.preventDefault();
    const faction = e.dataTransfer.getData('text/plain');
    setDraggingFaction(null);
    setDragOverCategory(null);
    if (!faction || factionCategoryMap[faction] === targetCat) return;
    await Promise.all([
      fetch('/api/models', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ faction, category: targetCat }),
      }),
      fetch('/api/factions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: faction, category: targetCat }),
      }),
    ]);
    fetchModels();
    fetchFactions();
  };

  useEffect(() => { fetchModels(); fetchCategories(); fetchFactions(); }, []);
  useEffect(() => { setSelectedModelIds(new Set()); }, [selectedFaction]);

  const { categories, factionsByCategory, factionModels, factionCategoryMap, globalStats } = useMemo(() => {
    const factionMap = {};
    const catFactionMap = {};
    const factionCatMap = {};
    let totalQty = 0, totalFinished = 0;

    for (const m of models) {
      if (!factionMap[m.faction]) factionMap[m.faction] = [];
      factionMap[m.faction].push(m);

      const cat = m.category || 'Uncategorized';
      if (!catFactionMap[cat]) catFactionMap[cat] = new Set();
      catFactionMap[cat].add(m.faction);
      if (m.category && !factionCatMap[m.faction]) factionCatMap[m.faction] = m.category;

      totalQty += m.qty;
      totalFinished += m.finished;
    }

    // Merge defined factions (may have no models yet)
    for (const f of definedFactions) {
      const cat = f.category || 'Uncategorized';
      if (!catFactionMap[cat]) catFactionMap[cat] = new Set();
      catFactionMap[cat].add(f.name);
      if (f.category && !factionCatMap[f.name]) factionCatMap[f.name] = f.category;
    }

    // Merge defined (persisted) categories with those derived from models
    const allCatNames = [...new Set([...definedCategories, ...Object.keys(catFactionMap)])];
    const order = [...definedCategories, ...CAT_ORDER.filter(c => !definedCategories.includes(c)), 'Uncategorized'];
    const sortedCats = allCatNames.sort((a, b) => {
      const ai = order.indexOf(a), bi = order.indexOf(b);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.localeCompare(b);
    });

    return {
      categories: sortedCats,
      factionsByCategory: Object.fromEntries(
        Object.entries(catFactionMap).map(([cat, set]) => [cat, [...set].sort()])
      ),
      factionModels: factionMap,
      factionCategoryMap: factionCatMap,
      globalStats: {
        factions: Object.keys(factionMap).length,
        units: models.length,
        models: totalQty,
        finished: totalQty > 0 ? Math.round((totalFinished / totalQty) * 100) : 0,
      },
    };
  }, [models, definedCategories, definedFactions]);

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

  const moveAllState = async (model, direction) => {
    await fetch('/api/models', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _id: model._id, direction }),
    });
    fetchModels();
  };

  const toggleModelSelect = (id) => {
    setSelectedModelIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleDownloadTrays = async () => {
    setTrayGenerating(true);
    const selected = currentModels.filter(m => selectedModelIds.has(m._id));
    const armyList = selected
      .map(m => ({ baseSize: parseBaseSize(m.baseSize), quantity: m.qty }))
      .filter(item => item.baseSize);
    const trays = calculateTrays(armyList);
    try {
      const res = await fetch('/api/traygen/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trays, merge_shelf: trayMergeShelf }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'TrayGen_STLs.zip'; a.click();
        URL.revokeObjectURL(url);
        setShowTrayModal(false);
        setSelectedModelIds(new Set());
      }
    } finally {
      setTrayGenerating(false);
    }
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
      category: model.category || '',
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
              <span onClick={() => { setNewCategoryName(''); setShowAddCategoryModal(true); }} className={styles.actionIcon} title="Add Category">➕</span>
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
          {categories.map(cat => {
            const collapsed = collapsedCategories.has(cat);
            return (
              <div key={cat} className={`${styles.superFactionGroup} ${dragOverCategory === cat ? styles.dragOverGroup : ''}`}
                onDragOver={e => { if (!draggingModelId) { e.preventDefault(); setDragOverCategory(cat); } }}
                onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOverCategory(null); }}
                onDrop={e => { if (!draggingModelId) handleFactionDrop(e, cat); }}>
                <div className={styles.categoryHeader}>
                  {editingCategory === cat ? (
                    <input
                      className={styles.renameCatInput}
                      value={editCategoryName}
                      autoFocus
                      onChange={e => setEditCategoryName(e.target.value)}
                      onBlur={() => handleRenameCategory(cat)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') { e.preventDefault(); handleRenameCategory(cat); }
                        if (e.key === 'Escape') setEditingCategory(null);
                      }}
                      onClick={e => e.stopPropagation()}
                    />
                  ) : (
                    <span className={styles.categoryHeaderTitle} onClick={() => setCollapsedCategories(prev => {
                      const next = new Set(prev);
                      collapsed ? next.delete(cat) : next.add(cat);
                      return next;
                    })}>{cat}</span>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className={styles.renameCatBtn} title={`Rename ${cat}`}
                      onClick={() => { setEditingCategory(cat); setEditCategoryName(cat); }}>✎</span>
                    <span className={styles.addInlineIcon} title={`Add group to ${cat}`}
                      onClick={() => { setNewGroupCategory(cat); setNewGroupName(''); setShowAddGroupModal(true); }}>+</span>
                    <span className={styles.categoryChevron} onClick={() => setCollapsedCategories(prev => {
                      const next = new Set(prev);
                      collapsed ? next.delete(cat) : next.add(cat);
                      return next;
                    })}>{collapsed ? '▶' : '▼'}</span>
                  </div>
                </div>
                {!collapsed && (
                  <ul className={styles.factionList}>
                    {(factionsByCategory[cat] || []).map(faction => {
                      const fModels = factionModels[faction] || [];
                      const totalQty = fModels.reduce((s, m) => s + m.qty, 0);
                      return (
                        <li key={faction}
                          draggable
                          onDragStart={e => { setDraggingFaction(faction); e.dataTransfer.setData('text/plain', faction); e.dataTransfer.effectAllowed = 'move'; }}
                          onDragEnd={() => { setDraggingFaction(null); setDragOverCategory(null); }}
                          onDragOver={e => { if (draggingModelId) { e.preventDefault(); e.stopPropagation(); setDragOverFaction(faction); } }}
                          onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOverFaction(null); }}
                          onDrop={e => { if (draggingModelId) { e.preventDefault(); e.stopPropagation(); handleModelDropOnFaction(faction, draggingModelId); } }}
                          className={`${styles.factionItem} ${selectedFaction === faction ? styles.activeFaction : ''} ${draggingFaction === faction ? styles.draggingFaction : ''} ${dragOverFaction === faction ? styles.dragOverFaction : ''}`}
                          onClick={() => setSelectedFaction(faction)}>
                          <div className={styles.factionHighlight} />
                          <div className={styles.factionItemTop}>
                            {editingFaction === faction ? (
                              <input
                                className={styles.renameFactionInput}
                                value={editFactionName}
                                autoFocus
                                onChange={e => setEditFactionName(e.target.value)}
                                onBlur={() => handleRenameFaction(faction)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') { e.preventDefault(); handleRenameFaction(faction); }
                                  if (e.key === 'Escape') setEditingFaction(null);
                                }}
                                onClick={e => e.stopPropagation()}
                              />
                            ) : (
                              <>
                                <span className={styles.factionName}>{faction}</span>
                                <span className={styles.renameFactionBtn} title="Rename"
                                  onClick={e => { e.stopPropagation(); setEditingFaction(faction); setEditFactionName(faction); }}>✎</span>
                              </>
                            )}
                            <span className={styles.factionCount}>{fModels.length}</span>
                          </div>
                          {totalQty > 0 && (
                            <div className={styles.factionMiniBar}>
                              {STATE_KEYS.map(key => {
                                const count = fModels.reduce((s, m) => s + m[key], 0);
                                if (count === 0) return null;
                                return (
                                  <div key={key} className={styles.factionMiniBarSegment}
                                    style={{ width: `${(count / totalQty) * 100}%`, backgroundColor: STATE_COLORS[key] }} />
                                );
                              })}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
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
              <button onClick={() => { setAddForm({ ...EMPTY_FORM, faction: selectedFaction, category: factionCategoryMap[selectedFaction] || '' }); setShowAddModal(true); }} className={styles.addBtn}>
                <span>📝</span> Add to {selectedFaction}
              </button>
              <button
                className={styles.selectAllBtn}
                onClick={() => {
                  const allIds = currentModels.map(m => m._id);
                  const allSelected = allIds.every(id => selectedModelIds.has(id));
                  setSelectedModelIds(allSelected ? new Set() : new Set(allIds));
                }}>
                {currentModels.every(m => selectedModelIds.has(m._id)) && currentModels.length > 0 ? '☑ Deselect All' : '☐ Select All'}
              </button>
              {selectedModelIds.size > 0 && (
                <>
                  <button onClick={() => setShowTrayModal(true)} className={styles.trayBtn}>
                    🖨 Generate Trays ({selectedModelIds.size})
                  </button>
                  <button
                    onClick={() => {
                      const selected = currentModels.filter(m => selectedModelIds.has(m._id));
                      const units = selected.map(m => m.unitName).join(',');
                      const faction = guessFactionId(selectedFaction);
                      const params = new URLSearchParams({ faction, units, headerColor: cardHeaderColor, bannerColor: cardBannerColor });
                      router.push(`/datacards?${params.toString()}`);
                    }}
                    className={styles.cardBtn}>
                    🃏 Data Cards ({selectedModelIds.size})
                  </button>
                </>
              )}
            </div>

            <div className={styles.unitsList}>
              {currentModels.map(model => (
                <div key={model._id}
                  draggable
                  onDragStart={e => { setDraggingModelId(model._id); e.dataTransfer.effectAllowed = 'move'; }}
                  onDragEnd={() => { setDraggingModelId(null); setDragOverFaction(null); }}
                  className={`${styles.unitItem} ${draggingModelId === model._id ? styles.draggingUnitItem : ''}`}>
                  <div className={styles.unitHeader}>
                    <input
                      type="checkbox"
                      className={styles.modelCheckbox}
                      checked={selectedModelIds.has(model._id)}
                      onChange={() => toggleModelSelect(model._id)}
                      onClick={e => e.stopPropagation()}
                    />
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
                    <button className={styles.bulkNavBtn} onClick={() => moveAllState(model, 'all-prev')} title="Move all back one state">«</button>
                    <button className={styles.stateNavBtn} onClick={() => moveState(model, 'prev')}>‹</button>
                    <div className={styles.progressBarContainer} onClick={() => moveState(model, 'next')}>
                      {STATE_KEYS.map(key => {
                        const count = model[key];
                        if (count === 0) return null;
                        const width = (count / model.qty) * 100;
                        return (
                          <div key={key} className={styles.progressBarSegment} style={{ width: `${width}%`, backgroundColor: STATE_COLORS[key] }}>
                            {width > 15 && <span className={styles.progressBarText}>{count} {key === 'unassembled' ? 'UNBUILT' : key === 'ordered' ? 'ORDERED' : key.toUpperCase()}</span>}
                          </div>
                        );
                      })}
                    </div>
                    <button className={styles.stateNavBtn} onClick={() => moveState(model, 'next')}>›</button>
                    <button className={styles.bulkNavBtn} onClick={() => moveAllState(model, 'all-next')} title="Advance all one state">»</button>
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
              <input list="cat-list" placeholder="Category (e.g. Imperium)" value={addForm.category} onChange={e => setAddForm({ ...addForm, category: e.target.value })} className={styles.input} />
              <datalist id="cat-list">{PREDEFINED_CATEGORIES.map(c => <option key={c} value={c} />)}</datalist>
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

      {/* Tray Generation Modal */}
      {showTrayModal && (() => {
        const selected = currentModels.filter(m => selectedModelIds.has(m._id));
        const withBase = selected.filter(m => parseBaseSize(m.baseSize));
        const withoutBase = selected.filter(m => !parseBaseSize(m.baseSize));
        const armyList = withBase.map(m => ({ baseSize: parseBaseSize(m.baseSize), quantity: m.qty }));
        const trays = calculateTrays(armyList);
        return (
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
              <div className={styles.modalHeader}>
                <h2>Generate Trays</h2>
                <button onClick={() => setShowTrayModal(false)} className={styles.closeBtn}>×</button>
              </div>
              <div className={styles.trayPreview}>
                {selected.map(m => {
                  const bs = parseBaseSize(m.baseSize);
                  return (
                    <div key={m._id} className={styles.trayPreviewRow}>
                      <span className={bs ? styles.trayPreviewOk : styles.trayPreviewWarn}>{bs ? '✓' : '⚠'}</span>
                      <span className={styles.trayPreviewName}>{m.unitName}</span>
                      <span className={styles.trayPreviewBase}>{m.baseSize || '—'}</span>
                      <span className={styles.trayPreviewQty}>×{m.qty}</span>
                      {!bs && <span className={styles.trayPreviewSkip}>skipped</span>}
                    </div>
                  );
                })}
              </div>
              {withoutBase.length > 0 && (
                <p className={styles.trayWarnText}>⚠ {withoutBase.length} model{withoutBase.length > 1 ? 's' : ''} without a base size will be skipped.</p>
              )}
              <div className={styles.traySummary}>
                {trays.length > 0
                  ? <>{trays.length} tray{trays.length > 1 ? 's' : ''} required &mdash; {trays.map(t => t.slot_diameters.length).reduce((a, b) => a + b, 0)} slots total</>
                  : 'No models with base sizes selected.'}
              </div>
              <label className={styles.trayMergeLabel}>
                <input type="checkbox" checked={trayMergeShelf} onChange={e => setTrayMergeShelf(e.target.checked)} />
                Merge with blank shelf base
              </label>
              <button
                className={styles.button}
                onClick={handleDownloadTrays}
                disabled={trays.length === 0 || trayGenerating}
              >
                {trayGenerating ? 'Generating…' : '⬇ Download STLs'}
              </button>
            </div>
          </div>
        );
      })()}

      {/* Add Group Modal */}
      {showAddGroupModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Add Group</h2>
              <button onClick={() => setShowAddGroupModal(false)} className={styles.closeBtn}>×</button>
            </div>
            <form onSubmit={handleAddGroup} className={styles.form}>
              <input
                type="text"
                placeholder="Group name (e.g. Space Marines)"
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                required
                autoFocus
                className={styles.input}
              />
              <button type="submit" className={styles.button}>Add Group</button>
            </form>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {showAddCategoryModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Add Category</h2>
              <button onClick={() => setShowAddCategoryModal(false)} className={styles.closeBtn}>×</button>
            </div>
            <form onSubmit={handleAddCategory} className={styles.form}>
              <input
                list="cat-list"
                placeholder="Category name (e.g. Imperium)"
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
                required
                autoFocus
                className={styles.input}
              />
              <datalist id="cat-list">{PREDEFINED_CATEGORIES.map(c => <option key={c} value={c} />)}</datalist>
              <button type="submit" className={styles.button}>Add Category</button>
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
              <input list="cat-list" placeholder="Category (e.g. Imperium)" value={editForm.category || ''} onChange={e => setEditForm({ ...editForm, category: e.target.value })} className={styles.input} />
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
