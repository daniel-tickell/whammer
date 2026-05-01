'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import styles from './minis.module.css';

const STATES = ['Unassembled', 'Assembled', 'Primed', 'Painted', 'Finished'];
const STATE_PROGRESS = {
  'Unassembled': 0,
  'Assembled': 25,
  'Primed': 50,
  'Painted': 75,
  'Finished': 100
};

// Icons for UI
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
  const [activeCategoryId, setActiveCategoryId] = useState(null); // For adding collection under category
  
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
        
        // Auto-select first collection if none selected
        if (data.length > 0 && !selectedCollectionId) {
          const firstCatWithCol = data.find(c => c.collections.length > 0);
          if (firstCatWithCol) {
            setSelectedCollectionId(firstCatWithCol.collections[0].id);
          }
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

  // Compute derived state
  const { globalStats, selectedCollection, collectionStats } = useMemo(() => {
    let totalMinis = 0;
    let totalEffortScore = 0;
    let totalCollections = 0;
    let allMinis = [];

    categories.forEach(cat => {
      cat.collections.forEach(col => {
        totalCollections++;
        col.miniatures.forEach(mini => {
          totalMinis += mini.qty;
          totalEffortScore += mini.qty * STATE_PROGRESS[mini.state];
          allMinis.push(mini);
        });
      });
    });

    const globalStats = {
      collections: totalCollections,
      miniatures: totalMinis,
      totalEffort: totalMinis * 100,
      finishedEffort: totalMinis > 0 ? Math.round(totalEffortScore / (totalMinis * 100) * 100) : 0
    };

    let selectedCol = null;
    categories.forEach(cat => {
      const found = cat.collections.find(col => col.id === selectedCollectionId);
      if (found) selectedCol = found;
    });

    let factionTotalMinis = 0;
    let factionEffortScore = 0;

    if (selectedCol) {
      selectedCol.miniatures.forEach(m => {
        factionTotalMinis += m.qty;
        factionEffortScore += m.qty * STATE_PROGRESS[m.state];
      });
    }

    const collectionStats = {
      miniatures: factionTotalMinis,
      totalEffort: factionTotalMinis, 
      finishedEffort: factionTotalMinis > 0 ? Math.round(factionEffortScore / (factionTotalMinis * 100) * 100) : 0
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
      await fetchCategories();
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
      await fetchCategories();
    }
  };

  const handleAddMini = async (e) => {
    e.preventDefault();
    setIsExpanding(true);
    
    if (miniForm.autoExpand) {
      try {
        const res = await fetch('/api/minis/expand', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(miniForm),
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.items.length > 0) {
            // Add collectionId to all preview items
            setPreviewItems(data.items.map(item => ({...item, collectionId: miniForm.collectionId})));
          } else {
            alert("Could not parse kit contents. Fallback to normal add?");
            await addMiniDirectly(miniForm);
          }
        } else {
          const errorData = await res.json();
          alert(`Error expanding kit contents: ${errorData.error || res.statusText}`);
        }
      } catch (err) {
        console.error(err);
        alert("Failed to connect to expansion API.");
      }
    } else {
      await addMiniDirectly(miniForm);
    }
    
    setIsExpanding(false);
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
      await fetchCategories();
    } else {
      const errorData = await res.json();
      alert(`Error adding mini: ${errorData.error || res.statusText}`);
    }
  };

  const confirmPreviewAdd = async () => {
    setIsExpanding(true);
    const res = await fetch('/api/minis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(previewItems),
    });
    
    if (res.ok) {
      setPreviewItems([]);
      setMiniForm({ kitName: '', qty: 1, collectionId: selectedCollectionId || '', state: 'Unassembled', autoExpand: false });
      setShowAddMiniModal(false);
      await fetchCategories();
    } else {
      const errorData = await res.json();
      alert(`Error confirming bulk addition: ${errorData.error || res.statusText}`);
    }
    setIsExpanding(false);
  };

  const cycleMiniState = async (mini) => {
    const currentIndex = STATES.indexOf(mini.state);
    const nextIndex = (currentIndex + 1) % STATES.length;
    const newState = STATES[nextIndex];
    
    const res = await fetch('/api/minis', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...mini, state: newState }),
    });
    if (res.ok) {
      fetchCategories();
    }
  };

  const handleDeleteMini = async (id, e) => {
    e.stopPropagation();
    if(confirm("Delete this entry?")) {
      const res = await fetch(`/api/minis?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchCategories();
      }
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
              <div className={styles.statBoxValue}>{globalStats.totalEffort}</div>
              <div className={styles.statBoxLabel}>Total Effort</div>
            </div>
            <div className={styles.statBox} style={{backgroundColor: 'rgba(192, 57, 43, 0.2)', borderColor: '#C0392B'}}>
              <IconFinishedEffort />
              <div className={styles.statBoxValue}>{globalStats.finishedEffort}%</div>
              <div className={styles.statBoxLabel}>Finished Effort</div>
            </div>
          </div>
        </div>

        <div className={styles.sidebarContent}>
          {categories.map((category) => (
            <div key={category.id} className={styles.superFactionGroup}>
              <div className={styles.superFactionHeader}>
                <h3>{category.name}</h3>
                <div className={styles.sfActions}>
                  <span 
                    onClick={() => {
                      setCollectionForm({...collectionForm, categoryId: category.id});
                      setShowAddCollectionModal(true);
                    }} 
                    className={styles.addInlineIcon}
                  >+</span>
                  <span>{category.collections.length}</span>
                </div>
              </div>
              <ul className={styles.factionList}>
                {category.collections.map((collection) => (
                  <li 
                    key={collection.id} 
                    className={`${styles.factionItem} ${selectedCollectionId === collection.id ? styles.activeFaction : ''}`}
                    onClick={() => setSelectedCollectionId(collection.id)}
                  >
                    <span className={styles.factionName}>{collection.name}</span>
                    <span className={styles.factionCount}>{collection.miniatures.length} &gt;</span>
                    <div className={styles.factionHighlight}></div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {categories.length === 0 && !loading && (
            <p className={styles.sidebarEmpty}>No categories yet. Click the 📁+ icon to start!</p>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className={styles.mainContent}>
        {selectedCollection ? (
          <>
            <h1 className={styles.mainTitle}>{selectedCollection.name}</h1>
            
            <div className={styles.factionStatsBar}>
              <div className={styles.factionStat}>
                <IconMiniatures />
                <span className={styles.fsValue}>{collectionStats.miniatures}</span>
                <span className={styles.fsLabel}>Miniatures</span>
              </div>
              <div className={styles.factionStat}>
                <IconTotalEffort />
                <span className={styles.fsValue}>{collectionStats.totalEffort}</span>
                <span className={styles.fsLabel}>Total Effort</span>
              </div>
              <div className={styles.factionStat}>
                <IconFinishedEffort />
                <span className={styles.fsValue}>{collectionStats.finishedEffort}%</span>
                <span className={styles.fsLabel}>Finished Effort</span>
              </div>
            </div>

            <div className={styles.actionsBar}>
              <button onClick={() => {
                setMiniForm({...miniForm, collectionId: selectedCollection.id});
                setShowAddMiniModal(true);
              }} className={styles.addBtn}>
                <span>📝</span> Add Miniatures to {selectedCollection.name}
              </button>
            </div>

            <div className={styles.unitsList}>
              {selectedCollection.miniatures.map(mini => {
                const progress = STATE_PROGRESS[mini.state];
                const isFinished = progress === 100;
                const isZero = progress === 0;
                
                return (
                  <div key={mini.id} className={styles.unitItem} onClick={() => cycleMiniState(mini)}>
                    <div className={styles.unitHeader}>
                      <span className={styles.unitName}>{mini.kitName}</span>
                      <div className={styles.unitRight}>
                        <span className={styles.unitQty}>{mini.qty} &gt;</span>
                        <button className={styles.deleteMiniBtn} onClick={(e) => handleDeleteMini(mini.id, e)}>×</button>
                      </div>
                    </div>
                    <div className={styles.progressBarContainer}>
                      <div 
                        className={styles.progressBar} 
                        style={{ 
                          width: `${Math.max(progress, 5)}%`, 
                          backgroundColor: isFinished ? '#27AE60' : (isZero ? '#C0392B' : '#F39C12') 
                        }}
                      ></div>
                    </div>
                  </div>
                );
              })}
              {selectedCollection.miniatures.length === 0 && (
                <p className={styles.emptyState}>No miniatures in this collection yet.</p>
              )}
            </div>
          </>
        ) : (
          <div className={styles.emptyStateContainer}>
            <h2>Welcome to your Command Center</h2>
            <p>Create categories and collections in the sidebar to organize your army.</p>
            {!loading && categories.length === 0 && (
              <button onClick={() => setShowAddCategoryModal(true)} className={styles.button} style={{marginTop: '20px'}}>
                Create Your First Category
              </button>
            )}
          </div>
        )}
      </main>

      {/* Add Category Modal */}
      {showAddCategoryModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Create New Category</h2>
              <button onClick={() => setShowAddCategoryModal(false)} className={styles.closeBtn}>×</button>
            </div>
            <form onSubmit={handleAddCategory} className={styles.form}>
              <input
                type="text"
                placeholder="Category Name (e.g. Imperium, Chaos)"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ name: e.target.value })}
                required
                className={styles.input}
                autoFocus
              />
              <button type="submit" className={styles.button}>Create Category</button>
            </form>
          </div>
        </div>
      )}

      {/* Add Collection Modal */}
      {showAddCollectionModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Create New Collection</h2>
              <button onClick={() => setShowAddCollectionModal(false)} className={styles.closeBtn}>×</button>
            </div>
            <form onSubmit={handleAddCollection} className={styles.form}>
              <input
                type="text"
                placeholder="Collection Name (e.g. Salamanders, World Eaters)"
                value={collectionForm.name}
                onChange={(e) => setCollectionForm({ ...collectionForm, name: e.target.value })}
                required
                className={styles.input}
                autoFocus
              />
              <select 
                value={collectionForm.categoryId} 
                onChange={(e) => setCollectionForm({...collectionForm, categoryId: e.target.value})}
                required
                className={styles.select}
              >
                <option value="">Select Category</option>
                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
              <button type="submit" className={styles.button}>Create Collection</button>
            </form>
          </div>
        </div>
      )}

      {/* Add Mini Modal */}
      {showAddMiniModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Add Miniature</h2>
              <button onClick={() => setShowAddMiniModal(false)} className={styles.closeBtn}>×</button>
            </div>
            
            <form onSubmit={handleAddMini} className={styles.form}>
              <div className={styles.inputGroup}>
                <input
                  type="text"
                  placeholder="Kit Name (e.g. Aggressors)"
                  value={miniForm.kitName}
                  onChange={(e) => setMiniForm({ ...miniForm, kitName: e.target.value })}
                  required
                  className={styles.input}
                />
                <input
                  type="number"
                  placeholder="Qty"
                  min="1"
                  value={miniForm.qty}
                  onChange={(e) => setMiniForm({ ...miniForm, qty: parseInt(e.target.value) || 1 })}
                  required
                  className={styles.inputQty}
                />
              </div>
              <div className={styles.inputGroup}>
                <select
                  value={miniForm.collectionId}
                  onChange={(e) => setMiniForm({ ...miniForm, collectionId: e.target.value })}
                  className={styles.select}
                  required
                >
                  <option value="">Select Collection</option>
                  {categories.flatMap(cat => cat.collections).map(col => (
                    <option key={col.id} value={col.id}>{col.name}</option>
                  ))}
                </select>
                <select
                  value={miniForm.state}
                  onChange={(e) => setMiniForm({ ...miniForm, state: e.target.value })}
                  className={styles.select}
                >
                  {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              
              <div className={styles.optionsGroup}>
                <label className={styles.checkboxLabel}>
                  <input 
                    type="checkbox" 
                    checked={miniForm.autoExpand}
                    onChange={(e) => setMiniForm({ ...miniForm, autoExpand: e.target.checked })}
                  />
                  Auto-expand via AI
                </label>
                
                <button type="submit" className={styles.button} disabled={isExpanding || previewItems.length > 0}>
                  {isExpanding && previewItems.length === 0 ? 'Consulting...' : 'Add'}
                </button>
              </div>
            </form>

            {previewItems.length > 0 && (
              <div className={styles.previewContainer}>
                <h3>Review Kit Contents</h3>
                <div className={styles.previewList}>
                  {previewItems.map((item, idx) => (
                    <div key={idx} className={styles.previewRow}>
                      <input 
                        type="number" 
                        min="1"
                        className={styles.previewInputQty}
                        value={item.qty} 
                        onChange={(e) => {
                          const newPreview = [...previewItems];
                          newPreview[idx].qty = parseInt(e.target.value) || 1;
                          setPreviewItems(newPreview);
                        }}
                      />
                      <span className={styles.previewCross}>x</span>
                      <input 
                        type="text" 
                        className={styles.previewInputName}
                        value={item.kitName} 
                        onChange={(e) => {
                          const newPreview = [...previewItems];
                          newPreview[idx].kitName = e.target.value;
                          setPreviewItems(newPreview);
                        }}
                      />
                      <button onClick={() => setPreviewItems(previewItems.filter((_, i) => i !== idx))} className={styles.previewRemoveBtn}>🗑️</button>
                    </div>
                  ))}
                </div>
                <div className={styles.previewActions}>
                  <button onClick={() => setPreviewItems([])} className={styles.cancelBtn}>Cancel</button>
                  <button onClick={confirmPreviewAdd} className={styles.confirmBtn}>Confirm Bulk Add</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
