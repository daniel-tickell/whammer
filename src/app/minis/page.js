'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import styles from './minis.module.css';

const STATES = ['Unassembled', 'Assembled', 'Primed', 'Painted', 'Finished'];
const STATE_KEYS = ['unassembled', 'assembled', 'primed', 'painted', 'finished'];
const STATE_COLORS = {
  unassembled: '#C0392B',
  assembled: '#F39C12',
  primed: '#3498DB',
  painted: '#9B59B6',
  finished: '#27AE60'
};

const IconCollections = () => <span className={styles.icon}>📚</span>;
const IconMiniatures = () => <span className={styles.icon}>💠</span>;
const IconTotalEffort = () => <span className={styles.icon}>⚖️</span>;
const IconFinishedEffort = () => <span className={styles.icon}>✅</span>;
const IconSettings = () => <span className={styles.icon}>⚙️</span>;

export default function MinisTracker() {
  const [categories, setCategories] = useState([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState(null);
  const [showAddMiniModal, setShowAddMiniModal] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [showAddCollectionModal, setShowAddCollectionModal] = useState(false);
  
  const [categoryForm, setCategoryForm] = useState({ name: '' });
  const [collectionForm, setCollectionForm] = useState({ name: '', categoryId: '' });
  const [miniForm, setMiniForm] = useState({ kitName: '', qty: 1, collectionId: '', state: 'Unassembled', autoExpand: false });
  
  const [loading, setLoading] = useState(true);
  const [isExpanding, setIsExpanding] = useState(false);
  const [previewItems, setPreviewItems] = useState([]);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
        if (data.length > 0 && !selectedCollectionId) {
          const firstCatWithCol = data.find(c => c.collections.length > 0);
          if (firstCatWithCol) setSelectedCollectionId(firstCatWithCol.collections[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const { globalStats, selectedCollection, collectionStats } = useMemo(() => {
    let totalModels = 0;
    let finishedModels = 0;
    let totalCollections = 0;

    categories.forEach(cat => {
      cat.collections.forEach(col => {
        totalCollections++;
        col.miniatures.forEach(mini => {
          totalModels += mini.qty;
          finishedModels += mini.finished;
        });
      });
    });

    const globalStats = {
      collections: totalCollections,
      miniatures: totalModels,
      finishedEffort: totalModels > 0 ? Math.round((finishedModels / totalModels) * 100) : 0
    };

    let selectedCol = null;
    categories.forEach(cat => {
      const found = cat.collections.find(col => col.id === selectedCollectionId);
      if (found) selectedCol = found;
    });

    let factionModels = 0;
    let factionFinished = 0;
    if (selectedCol) {
      selectedCol.miniatures.forEach(m => {
        factionModels += m.qty;
        factionFinished += m.finished;
      });
    }

    const collectionStats = {
      miniatures: factionModels,
      finishedEffort: factionModels > 0 ? Math.round((factionFinished / factionModels) * 100) : 0
    };

    return { globalStats, selectedCollection: selectedCol, collectionStats };
  }, [categories, selectedCollectionId]);

  const handleAddCategory = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(categoryForm),
    });
    if (res.ok) {
      setCategoryForm({ name: '' });
      setShowAddCategoryModal(false);
      fetchCategories();
    }
  };

  const handleAddCollection = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(collectionForm),
    });
    if (res.ok) {
      setCollectionForm({ name: '', categoryId: '' });
      setShowAddCollectionModal(false);
      fetchCategories();
    }
  };

  const moveMiniState = async (mini, direction) => {
    const res = await fetch('/api/minis', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: mini.id, direction }),
    });
    if (res.ok) fetchCategories();
  };

  const handleAddMini = async (e) => {
    e.preventDefault();
    setIsExpanding(true);
    try {
      if (miniForm.autoExpand) {
        const res = await fetch('/api/minis/expand', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(miniForm),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.items.length > 0) {
            setPreviewItems(data.items.map(item => ({...item, collectionId: miniForm.collectionId})));
          } else {
            await addMiniDirectly(miniForm);
          }
        }
      } else {
        await addMiniDirectly(miniForm);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsExpanding(false);
    }
  };

  const addMiniDirectly = async (dataPayload) => {
    const res = await fetch('/api/minis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dataPayload),
    });
    if (res.ok) {
      setMiniForm({ kitName: '', qty: 1, collectionId: selectedCollectionId || '', state: 'Unassembled', autoExpand: false });
      setShowAddMiniModal(false);
      fetchCategories();
    }
  };

  const confirmPreviewAdd = async () => {
    const res = await fetch('/api/minis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(previewItems),
    });
    if (res.ok) {
      setPreviewItems([]);
      setShowAddMiniModal(false);
      fetchCategories();
    }
  };

  const handleDeleteMini = async (id, e) => {
    e.stopPropagation();
    if(confirm("Delete this entry?")) {
      const res = await fetch(`/api/minis?id=${id}`, { method: 'DELETE' });
      if (res.ok) fetchCategories();
    }
  };

  return (
    <div className={styles.appContainer}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div className={styles.sidebarTitleRow}>
            <IconSettings />
            <h2>Collections</h2>
            <div className={styles.sidebarActions}>
              <span onClick={() => setShowAddCategoryModal(true)} className={styles.actionIcon} title="Add Category">📁+</span>
              <Link href="/"><span className={styles.actionIcon}>🏠</span></Link>
            </div>
          </div>
          <div className={styles.globalStats}>
            <div className={styles.statBox} style={{backgroundColor: 'rgba(21, 101, 192, 0.2)', borderColor: '#1565C0'}}>
              <IconCollections />
              <div className={styles.statBoxValue}>{globalStats.collections}</div>
              <div className={styles.statBoxLabel}>Collections</div>
            </div>
            <div className={styles.statBox} style={{backgroundColor: 'rgba(39, 174, 96, 0.2)', borderColor: '#27AE60'}}>
              <IconMiniatures />
              <div className={styles.statBoxValue}>{globalStats.miniatures}</div>
              <div className={styles.statBoxLabel}>Miniatures</div>
            </div>
            <div className={styles.statBox} style={{backgroundColor: 'rgba(211, 84, 0, 0.2)', borderColor: '#D35400'}}>
              <IconTotalEffort />
              <div className={styles.statBoxValue}>{globalStats.miniatures}</div>
              <div className={styles.statBoxLabel}>Total Models</div>
            </div>
            <div className={styles.statBox} style={{backgroundColor: 'rgba(192, 57, 43, 0.2)', borderColor: '#C0392B'}}>
              <IconFinishedEffort />
              <div className={styles.statBoxValue}>{globalStats.finishedEffort}%</div>
              <div className={styles.statBoxLabel}>Finished Models</div>
            </div>
          </div>
        </div>

        <div className={styles.sidebarContent}>
          {categories.map((category) => (
            <div key={category.id} className={styles.superFactionGroup}>
              <div className={styles.superFactionHeader}>
                <h3>{category.name}</h3>
                <div className={styles.sfActions}>
                  <span onClick={() => { setCollectionForm({...collectionForm, categoryId: category.id}); setShowAddCollectionModal(true); }} className={styles.addInlineIcon}>+</span>
                  <span>{category.collections.length}</span>
                </div>
              </div>
              <ul className={styles.factionList}>
                {category.collections.map((collection) => (
                  <li key={collection.id} className={`${styles.factionItem} ${selectedCollectionId === collection.id ? styles.activeFaction : ''}`} onClick={() => setSelectedCollectionId(collection.id)}>
                    <span className={styles.factionName}>{collection.name}</span>
                    <span className={styles.factionCount}>{collection.miniatures.length} &gt;</span>
                    <div className={styles.factionHighlight}></div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </aside>

      {/* Main Content */}
      <main className={styles.mainContent}>
        {selectedCollection ? (
          <>
            <h1 className={styles.mainTitle}>{selectedCollection.name}</h1>
            <div className={styles.factionStatsBar}>
              <div className={styles.factionStat}><IconMiniatures /><span className={styles.fsValue}>{collectionStats.miniatures}</span><span className={styles.fsLabel}>Models</span></div>
              <div className={styles.factionStat}><IconFinishedEffort /><span className={styles.fsValue}>{collectionStats.finishedEffort}%</span><span className={styles.fsLabel}>Finished</span></div>
            </div>

            <div className={styles.actionsBar}>
              <button onClick={() => { setMiniForm({...miniForm, collectionId: selectedCollection.id}); setShowAddMiniModal(true); }} className={styles.addBtn}>
                <span>📝</span> Add Miniatures to {selectedCollection.name}
              </button>
            </div>

            <div className={styles.unitsList}>
              {selectedCollection.miniatures.map(mini => {
                return (
                  <div key={mini.id} className={styles.unitItem}>
                    <div className={styles.unitHeader}>
                      <span className={styles.unitName}>{mini.kitName}</span>
                      <div className={styles.unitRight}>
                        <span className={styles.unitQty}>{mini.qty} MODELS</span>
                        <button className={styles.deleteMiniBtn} onClick={(e) => handleDeleteMini(mini.id, e)}>×</button>
                      </div>
                    </div>
                    
                    <div className={styles.progressRow}>
                      <button className={styles.stateNavBtn} onClick={() => moveMiniState(mini, 'prev')}>‹</button>
                      
                      <div className={styles.progressBarContainer} onClick={() => moveMiniState(mini, 'next')}>
                        {STATE_KEYS.map((key, idx) => {
                          const count = mini[key];
                          if (count === 0) return null;
                          const width = (count / mini.qty) * 100;
                          const isUnbuilt = key === 'unassembled';
                          
                          return (
                            <div 
                              key={key} 
                              className={styles.progressBarSegment}
                              style={{ 
                                width: `${width}%`, 
                                backgroundColor: STATE_COLORS[key] 
                              }}
                            >
                              {width > 15 && (
                                <span className={styles.progressBarText}>
                                  {count} {isUnbuilt ? 'UNBUILT' : key.toUpperCase()}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <button className={styles.stateNavBtn} onClick={() => moveMiniState(mini, 'next')}>›</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className={styles.emptyStateContainer}>
            <h2>Welcome to your Command Center</h2>
            <p>Select a collection to view your models.</p>
          </div>
        )}
      </main>

      {/* Modals... (omitted for brevity, keep as before but update category names if needed) */}
      {showAddCategoryModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}><h2>Create Category</h2><button onClick={() => setShowAddCategoryModal(false)} className={styles.closeBtn}>×</button></div>
            <form onSubmit={handleAddCategory} className={styles.form}><input type="text" placeholder="Category Name" value={categoryForm.name} onChange={(e) => setCategoryForm({ name: e.target.value })} required className={styles.input} /><button type="submit" className={styles.button}>Create</button></form>
          </div>
        </div>
      )}
      {showAddCollectionModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}><h2>Create Collection</h2><button onClick={() => setShowAddCollectionModal(false)} className={styles.closeBtn}>×</button></div>
            <form onSubmit={handleAddCollection} className={styles.form}><input type="text" placeholder="Collection Name" value={collectionForm.name} onChange={(e) => setCollectionForm({ ...collectionForm, name: e.target.value })} required className={styles.input} /><button type="submit" className={styles.button}>Create</button></form>
          </div>
        </div>
      )}
      {showAddMiniModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}><h2>Add Miniature</h2><button onClick={() => setShowAddMiniModal(false)} className={styles.closeBtn}>×</button></div>
            <form onSubmit={handleAddMini} className={styles.form}>
              <div className={styles.inputGroup}><input type="text" placeholder="Kit Name" value={miniForm.kitName} onChange={(e) => setMiniForm({ ...miniForm, kitName: e.target.value })} required className={styles.input} /><input type="number" placeholder="Qty" min="1" value={miniForm.qty} onChange={(e) => setMiniForm({ ...miniForm, qty: parseInt(e.target.value) || 1 })} required className={styles.inputQty} /></div>
              <div className={styles.optionsGroup}><label className={styles.checkboxLabel}><input type="checkbox" checked={miniForm.autoExpand} onChange={(e) => setMiniForm({ ...miniForm, autoExpand: e.target.checked })} />Auto-expand</label><button type="submit" className={styles.button} disabled={isExpanding}>Add</button></div>
            </form>
            {previewItems.length > 0 && (
              <div className={styles.previewContainer}>
                {previewItems.map((item, idx) => (
                  <div key={idx} className={styles.previewRow}>
                    <input type="number" min="1" className={styles.previewInputQty} value={item.qty} onChange={(e) => { const np = [...previewItems]; np[idx].qty = parseInt(e.target.value); setPreviewItems(np); }} />
                    <span className={styles.previewInputName}>{item.kitName}</span>
                    <button onClick={() => setPreviewItems(previewItems.filter((_, i) => i !== idx))}>×</button>
                  </div>
                ))}
                <button onClick={confirmPreviewAdd} className={styles.confirmBtn}>Confirm Bulk Add</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
