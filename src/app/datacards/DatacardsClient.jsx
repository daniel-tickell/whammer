'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toBlob } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { v4 as uuidv4 } from 'uuid';
import { UnitCardBack } from './components/UnitCardBack';
import { UnitCardFront } from './components/UnitCardFront';
import styles from './datacards.module.css';

const GDC_BASE = 'https://raw.githubusercontent.com/game-datacards/datasources/develop/10th/gdc';

const FACTIONS = [
  { id: 'aeldari',            name: 'Aeldari' },
  { id: 'adeptasororitas',    name: 'Adepta Sororitas' },
  { id: 'adeptuscustodes',    name: 'Adeptus Custodes' },
  { id: 'adeptusmechanicus',  name: 'Adeptus Mechanicus' },
  { id: 'agents',             name: 'Agents of the Imperium' },
  { id: 'astramilitarum',     name: 'Astra Militarum' },
  { id: 'blacktemplar',       name: 'Black Templars' },
  { id: 'bloodangels',        name: 'Blood Angels' },
  { id: 'chaosdaemons',       name: 'Chaos Daemons' },
  { id: 'chaos_spacemarines', name: 'Chaos Space Marines' },
  { id: 'chaosknights',       name: 'Chaos Knights' },
  { id: 'darkangels',         name: 'Dark Angels' },
  { id: 'deathguard',         name: 'Death Guard' },
  { id: 'deathwatch',         name: 'Deathwatch' },
  { id: 'drukhari',           name: 'Drukhari' },
  { id: 'emperors_children',  name: "Emperor's Children" },
  { id: 'greyknights',        name: 'Grey Knights' },
  { id: 'gsc',                name: 'Genestealer Cults' },
  { id: 'imperialknights',    name: 'Imperial Knights' },
  { id: 'necrons',            name: 'Necrons' },
  { id: 'orks',               name: 'Orks' },
  { id: 'space_marines',      name: 'Space Marines' },
  { id: 'spacewolves',        name: 'Space Wolves' },
  { id: 'tau',                name: "T'au Empire" },
  { id: 'thousandsons',       name: 'Thousand Sons' },
  { id: 'tyranids',           name: 'Tyranids' },
  { id: 'unaligned',          name: 'Unaligned' },
  { id: 'votann',             name: 'Leagues of Votann' },
  { id: 'worldeaters',        name: 'World Eaters' },
];

const FACTION_THEMES = {
  aeldari:            { header: '#347379', banner: '#0a353a' },
  adeptasororitas:    { header: '#570c0c', banner: '#561113' },
  adeptuscustodes:    { header: '#6d5035', banner: '#6a0e19' },
  adeptusmechanicus:  { header: '#9f2628', banner: '#5d1615' },
  agents:             { header: '#244b6a', banner: '#1a3445' },
  astramilitarum:     { header: '#324935', banner: '#0a2118' },
  blacktemplar:       { header: '#142637', banner: '#202a2f' },
  bloodangels:        { header: '#72191c', banner: '#631210' },
  chaosdaemons:       { header: '#393940', banner: '#202224' },
  chaos_spacemarines: { header: '#222a2f', banner: '#320b0d' },
  chaosknights:       { header: '#49584c', banner: '#102824' },
  darkangels:         { header: '#013a17', banner: '#16291a' },
  deathguard:         { header: '#4d560e', banner: '#2c290c' },
  deathwatch:         { header: '#3d3e41', banner: '#232425' },
  drukhari:           { header: '#0f454e', banner: '#102929' },
  emperors_children:  { header: '#1A3037', banner: '#2E0B03' },
  greyknights:        { header: '#4a5e67', banner: '#325b68' },
  gsc:                { header: '#391625', banner: '#291221' },
  imperialknights:    { header: '#023e58', banner: '#122d42' },
  necrons:            { header: '#04532a', banner: '#032b16' },
  orks:               { header: '#465b18', banner: '#283109' },
  space_marines:      { header: '#4b6262', banner: '#092135' },
  spacewolves:        { header: '#435d63', banner: '#283743' },
  tau:                { header: '#2e5a6a', banner: '#175966' },
  thousandsons:       { header: '#185862', banner: '#0b3645' },
  tyranids:           { header: '#381a3a', banner: '#411f41' },
  unaligned:          { header: '#4b6262', banner: '#092135' },
  votann:             { header: '#3c4b3f', banner: '#572d0a' },
  worldeaters:        { header: '#4d161a', banner: '#611013' },
};

const CARD_STYLE_BASE = {
  '--background-colour': 'black',
  '--title-text-colour': 'white',
  '--faction-text-colour': 'white',
  '--header-text-colour': 'white',
  '--stat-title-colour': 'white',
  '--text-background-colour': '#dfe0e2',
  '--rows-colour': '#d8d8da',
  '--alt-rows-colour': '#dee3e0',
  '--keywords-background-colour': '#d8d8da',
  '--green-stratagem-colour': '#2c594c',
  '--blue-stratagem-colour': '#234461',
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ── Fuzzy matching ───────────────────────────────────────────────────────────
function norm(s) {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
}
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => i || j));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[m][n];
}
function scoreMatch(query, unitName) {
  const q = norm(query), u = norm(unitName);
  if (!q) return 0;
  if (q === u) return 100;
  if (u.includes(q)) return 80;
  if (q.includes(u)) return 70;
  const qWords = q.split(' ').filter(w => w.length > 2);
  const uWords = u.split(' ').filter(w => w.length > 2);
  const overlap = qWords.filter(qw => uWords.some(uw => qw.startsWith(uw) || uw.startsWith(qw))).length;
  if (overlap >= Math.min(qWords.length, uWords.length, 1) * 0.6 && overlap > 0) return 50 + overlap * 5;
  const qFirst = qWords[0] || q, uFirst = uWords[0] || u;
  if (qFirst.length >= 4 && levenshtein(qFirst, uFirst) <= 2) return 40;
  return 0;
}
function findBestMatch(query, sheets) {
  let best = null, bestScore = 0;
  for (const sheet of sheets) {
    const score = scoreMatch(query, sheet.name);
    if (score > bestScore) { bestScore = score; best = sheet; }
  }
  return bestScore >= 40 ? best : null;
}
// ─────────────────────────────────────────────────────────────────────────────

function blobToDataUrl(blob) {
  return new Promise(res => { const r = new FileReader(); r.onloadend = () => res(r.result); r.readAsDataURL(blob); });
}

// Weapons have no top-level name — derive one from their profiles
function weaponKey(w) {
  const profiles = w.profiles || [];
  if (profiles.length === 0) return 'unknown';
  const first = profiles[0].name || '';
  if (profiles.length === 1) return first;
  // Multi-profile: strip mode suffix (e.g. "Plasma pistol – Standard" → "Plasma pistol")
  const cut = first.search(/\s[–\-]\s/);
  return cut > 0 ? first.slice(0, cut) : first;
}

const STYLE_DEFAULTS = {
  statsFontSize: 22,
  weaponsFontSize: 14,
  abilitiesFontSize: 12,
  keywordsFontSize: 15,
  factionsFontSize: 18,
};

const ABILITY_TYPES = [
  { key: 'core',    label: 'Core Abilities' },
  { key: 'faction', label: 'Faction Abilities' },
  { key: 'other',   label: 'Other Abilities' },
  { key: 'wargear', label: 'Wargear Abilities' },
  { key: 'damaged', label: 'Damaged' },
  { key: 'special', label: 'Special' },
];

export function DatacardsClient({ initialFaction, initialUnits, initialHeaderColor, initialBannerColor }) {
  const defaultFaction = initialFaction || FACTIONS[9].id;
  const unitNames = initialUnits ? initialUnits.split(',').map(u => u.trim()).filter(Boolean) : [];

  const [factionId, setFactionId] = useState(defaultFaction);
  const [factionData, setFactionData] = useState(null);
  const [loadingFaction, setLoadingFaction] = useState(false);
  const [search, setSearch] = useState('');
  const [deck, setDeck] = useState([]);
  // { [deckId]: { ranged: Set<name>, melee: Set<name> } }
  const [weaponExclusions, setWeaponExclusions] = useState({});
  const [editingWeapons, setEditingWeapons] = useState(null); // deckId being edited
  const [editingStyle, setEditingStyle] = useState(null);    // deckId being styled
  // { [deckId]: { statsFontSize, weaponsFontSize, abilitiesFontSize, keywordsFontSize, factionsFontSize,
  //               abilityPositions: { core,faction,other,wargear,damaged,special },
  //               showWeapons: { rangedWeapons, meleeWeapons },
  //               showAbilities: { core,faction,other,wargear,special },
  //               showComposition, showLoadout, showWargear } }
  const [cardOverrides, setCardOverrides] = useState({});
  const [headerColor, setHeaderColor] = useState(initialHeaderColor || '#456664');
  const [bannerColor, setBannerColor] = useState(initialBannerColor || '#103344');
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState('');
  const [bootstrapped, setBootstrapped] = useState(unitNames.length === 0);
  const [unmatched, setUnmatched] = useState([]);

  const frontRefs = useRef([]);
  const backRefs = useRef([]);

  const fetchFaction = useCallback(async (id) => {
    setLoadingFaction(true);
    setFactionData(null);
    try {
      const res = await fetch(`${GDC_BASE}/${id}.json?t=${Date.now()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setFactionData(await res.json());
    } catch (e) {
      console.error('Failed to fetch faction:', e);
    } finally {
      setLoadingFaction(false);
    }
  }, []);

  useEffect(() => { fetchFaction(factionId); }, [factionId, fetchFaction]);

  useEffect(() => {
    if (bootstrapped || !factionData || unitNames.length === 0) return;
    const sheets = factionData.datasheets || [];
    const matched = [], missed = [];
    for (const name of unitNames) {
      const hit = findBestMatch(name, sheets);
      hit ? matched.push({ ...hit, _deckId: uuidv4() }) : missed.push(name);
    }
    if (matched.length > 0) setDeck(matched);
    if (missed.length > 0) setUnmatched(missed);
    setBootstrapped(true);
  }, [factionData, bootstrapped, unitNames.length]);

  // ── Weapon exclusion helpers ────────────────────────────────────────────────
  const isWeaponExcluded = (deckId, type, name) =>
    weaponExclusions[deckId]?.[type]?.has(name) ?? false;

  const toggleWeapon = (deckId, type, name) => {
    setWeaponExclusions(prev => {
      const entry = prev[deckId] ?? { ranged: new Set(), melee: new Set() };
      const set = new Set(entry[type]);
      set.has(name) ? set.delete(name) : set.add(name);
      return { ...prev, [deckId]: { ...entry, [type]: set } };
    });
  };

  // Filter a unit's weapons based on current exclusions before card render
  const applyExclusions = (unit) => {
    const ex = weaponExclusions[unit._deckId];
    if (!ex) return unit;
    return {
      ...unit,
      rangedWeapons: (unit.rangedWeapons || []).filter(w => !ex.ranged?.has(weaponKey(w))),
      meleeWeapons: (unit.meleeWeapons || []).filter(w => !ex.melee?.has(weaponKey(w))),
    };
  };
  // ── Card style override helpers ─────────────────────────────────────────────
  const setOverrideProp = (deckId, key, value) =>
    setCardOverrides(prev => ({ ...prev, [deckId]: { ...(prev[deckId] || {}), [key]: value } }));

  const setOverrideNested = (deckId, topKey, subKey, value) =>
    setCardOverrides(prev => {
      const cur = prev[deckId] || {};
      return { ...prev, [deckId]: { ...cur, [topKey]: { ...(cur[topKey] || {}), [subKey]: value } } };
    });

  const getStyleVal = (deckId, key, defaultVal) => {
    const ov = cardOverrides[deckId];
    return ov?.[key] !== undefined ? ov[key] : defaultVal;
  };

  const getStyleNested = (deckId, topKey, subKey, defaultVal) => {
    const ov = cardOverrides[deckId];
    return ov?.[topKey]?.[subKey] !== undefined ? ov[topKey][subKey] : defaultVal;
  };

  const applyOverrides = (unit) => {
    const ov = cardOverrides[unit._deckId];
    if (!ov) return unit;
    const result = { ...unit };
    const flat = ['statsFontSize', 'weaponsFontSize', 'abilitiesFontSize', 'keywordsFontSize', 'factionsFontSize', 'showComposition', 'showLoadout', 'showWargear'];
    for (const k of flat) { if (ov[k] !== undefined) result[k] = ov[k]; }
    if (ov.abilityPositions) result.abilityPositions = { ...(unit.abilityPositions || {}), ...ov.abilityPositions };
    if (ov.showWeapons) result.showWeapons = { ...(unit.showWeapons || {}), ...ov.showWeapons };
    if (ov.showAbilities) result.showAbilities = { ...(unit.showAbilities || {}), ...ov.showAbilities };
    return result;
  };
  // ─────────────────────────────────────────────────────────────────────────────

  const filteredUnits = (factionData?.datasheets || [])
    .filter(u => u.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  const addUnit = (unit) => setDeck(prev => [...prev, { ...unit, _deckId: uuidv4() }]);
  const removeUnit = (deckId) => {
    setDeck(prev => prev.filter(u => u._deckId !== deckId));
    setWeaponExclusions(prev => { const n = { ...prev }; delete n[deckId]; return n; });
    setCardOverrides(prev => { const n = { ...prev }; delete n[deckId]; return n; });
    if (editingWeapons === deckId) setEditingWeapons(null);
    if (editingStyle === deckId) setEditingStyle(null);
  };
  const clearDeck = () => { setDeck([]); setWeaponExclusions({}); setCardOverrides({}); setEditingWeapons(null); setEditingStyle(null); };

  const enrichUnit = (unit) => ({ ...unit, headerColor, bannerColor, cardType: 'DataCard', source: '40k-10e' });

  const cs = {
    ...CARD_STYLE_BASE,
    '--header-colour': headerColor,
    '--banner-colour': bannerColor,
    '--stat-text-colour': headerColor,
    '--weapon-keyword-colour': headerColor,
  };

  const handleExportPdf = async () => {
    if (deck.length === 0 || exporting) return;
    setExporting(true);
    setExportStatus('Rendering cards…');
    await sleep(200);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'in', format: 'letter' });
      const pageW = doc.internal.pageSize.getWidth(), pageH = doc.internal.pageSize.getHeight();
      const cardW = 6.5, cardH = 4.5;
      const x = (pageW - cardW) / 2;
      const y1 = (pageH - cardH * 2) / 3, y2 = y1 * 2 + cardH;
      const ys = [y1, y2];
      const fronts = frontRefs.current.filter(Boolean);
      const backs = backRefs.current.filter(Boolean);
      for (let i = 0; i < fronts.length; i += 2) {
        if (i > 0) doc.addPage();
        setExportStatus(`Exporting card ${i + 1}/${fronts.length}…`);
        for (let j = 0; j < 2 && i + j < fronts.length; j++) {
          const blob = await toBlob(fronts[i + j], { cacheBust: false, pixelRatio: 2, type: 'image/jpeg', quality: 0.85 });
          doc.addImage(await blobToDataUrl(blob), 'JPEG', x, ys[j], cardW, cardH, undefined, 'FAST');
        }
        await sleep(50);
        doc.addPage();
        for (let j = 0; j < 2 && i + j < backs.length; j++) {
          const blob = await toBlob(backs[i + j], { cacheBust: false, pixelRatio: 2, type: 'image/jpeg', quality: 0.85 });
          doc.addImage(await blobToDataUrl(blob), 'JPEG', x, ys[j], cardW, cardH, undefined, 'FAST');
        }
        await sleep(50);
      }
      const name = factionData?.name || factionId;
      doc.save(`datacards_${name.toLowerCase().replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error('PDF export failed:', err);
      alert('PDF export failed — see console for details.');
    } finally {
      setExporting(false);
      setExportStatus('');
    }
  };

  const handleDownloadJson = () => {
    if (deck.length === 0) return;
    const payload = {
      category: { uuid: uuidv4(), name: factionData?.name || factionId, cards: deck.map(u => enrichUnit(applyExclusions(u))) },
      createdAt: new Date().toISOString(),
      version: '2.13.0',
      website: 'https://game-datacards.eu',
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `datacards_${(factionData?.name || factionId).toLowerCase().replace(/\s+/g, '_')}.json`;
    a.click();
  };

  return (
    <div className={styles.root}>
      {exporting && (
        <div className={styles.overlay}>
          <div className={styles.overlayBox}>
            <div className={styles.spinner} />
            <span>{exportStatus || 'Exporting…'}</span>
          </div>
        </div>
      )}

      {/* ── Sidebar ── */}
      <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <a href="/" className={styles.backLink}>← Home</a>
          <h2>Datacards</h2>
        </div>

        <div className={styles.sideSection}>
          <label className={styles.label}>Faction</label>
          <select className={styles.select} value={factionId}
            onChange={e => { setFactionId(e.target.value); setBootstrapped(true); setUnmatched([]); }}>
            {FACTIONS.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>

        <div className={styles.sideSection}>
          <label className={styles.label}>Theme Preset</label>
          <div className={styles.colorRow}>
            <select className={styles.select} style={{ flex: 1 }}
              onChange={e => {
                const t = FACTION_THEMES[e.target.value];
                if (t) { setHeaderColor(t.header); setBannerColor(t.banner); }
              }}
              defaultValue="">
              <option value="" disabled>Choose faction…</option>
              {FACTIONS.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            <button className={styles.presetMatchBtn}
              title="Apply this faction's default colors"
              onClick={() => {
                const t = FACTION_THEMES[factionId];
                if (t) { setHeaderColor(t.header); setBannerColor(t.banner); }
              }}>↺</button>
          </div>
          <label className={styles.label} style={{ marginTop: 8 }}>Header colour</label>
          <div className={styles.colorRow}>
            <input type="color" value={headerColor} onChange={e => setHeaderColor(e.target.value)} className={styles.colorPicker} />
            <input type="text" value={headerColor} onChange={e => setHeaderColor(e.target.value)} className={styles.colorHex} maxLength={7} />
          </div>
          <label className={styles.label} style={{ marginTop: 8 }}>Banner colour</label>
          <div className={styles.colorRow}>
            <input type="color" value={bannerColor} onChange={e => setBannerColor(e.target.value)} className={styles.colorPicker} />
            <input type="text" value={bannerColor} onChange={e => setBannerColor(e.target.value)} className={styles.colorHex} maxLength={7} />
          </div>
        </div>

        <div className={styles.sideSection} style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <input type="text" placeholder="Search units…" value={search}
            onChange={e => setSearch(e.target.value)} className={styles.searchInput} />
          {loadingFaction && <div className={styles.loadingText}>Loading faction data…</div>}
          {unmatched.length > 0 && (
            <div className={styles.unmatchedBox}>
              <div className={styles.unmatchedTitle}>Not found in {factionData?.name || factionId}:</div>
              {unmatched.map(n => <div key={n} className={styles.unmatchedItem}>• {n}</div>)}
            </div>
          )}
          <div className={styles.unitList}>
            {filteredUnits.map(unit => (
              <button key={unit.id || unit.name} className={styles.unitBtn} onClick={() => addUnit(unit)} title={`Add ${unit.name}`}>
                {unit.name}
                {unit.points?.[0]?.cost && <span className={styles.unitPts}>{unit.points[0].cost}pts</span>}
              </button>
            ))}
            {!loadingFaction && filteredUnits.length === 0 && <div className={styles.emptyText}>No units found</div>}
          </div>
        </div>

        <div className={styles.sideActions}>
          <button className={styles.actionBtn} onClick={handleExportPdf} disabled={deck.length === 0 || exporting}>
            Export PDF ({deck.length})
          </button>
          <button className={styles.actionBtn} onClick={() => window.print()} disabled={deck.length === 0}>Print</button>
          <button className={`${styles.actionBtn} ${styles.actionBtnSecondary}`} onClick={handleDownloadJson} disabled={deck.length === 0}>
            Download JSON
          </button>
          <button className={`${styles.actionBtn} ${styles.actionBtnDanger}`} onClick={clearDeck} disabled={deck.length === 0}>
            Clear Deck
          </button>
        </div>
      </div>

      {/* ── Main card area ── */}
      <div className={styles.mainArea}>
        {deck.length === 0 ? (
          <div className={styles.emptyDeck}>
            <p>{loadingFaction ? 'Loading faction data…' : 'Select units from the sidebar to build your deck.'}</p>
          </div>
        ) : (
          <div className={styles.cardDeck}>
            {deck.map((unit, i) => {
              const eu = applyOverrides(enrichUnit(applyExclusions(unit)));
              const isEditing = editingWeapons === unit._deckId;
              const isEditingStyleFor = editingStyle === unit._deckId;
              const hasRanged = (unit.rangedWeapons || []).length > 0;
              const hasMelee = (unit.meleeWeapons || []).length > 0;
              const excludedCount =
                (weaponExclusions[unit._deckId]?.ranged?.size ?? 0) +
                (weaponExclusions[unit._deckId]?.melee?.size ?? 0);

              return (
                <div key={unit._deckId} className={styles.cardPair}>
                  <div className={styles.cardPairHeader}>
                    <span className={styles.cardPairName}>{unit.name}</span>
                    <div className={styles.cardPairActions}>
                      {(hasRanged || hasMelee) && (
                        <button
                          className={`${styles.weaponEditBtn} ${isEditing ? styles.weaponEditBtnActive : ''}`}
                          onClick={() => setEditingWeapons(isEditing ? null : unit._deckId)}
                          title="Edit loadout">
                          ✏ Loadout{excludedCount > 0 ? ` (−${excludedCount})` : ''}
                        </button>
                      )}
                      <button
                        className={`${styles.styleEditBtn} ${isEditingStyleFor ? styles.styleEditBtnActive : ''}`}
                        onClick={() => setEditingStyle(isEditingStyleFor ? null : unit._deckId)}
                        title="Card styling">
                        🎨 Style{cardOverrides[unit._deckId] ? ' •' : ''}
                      </button>
                      <button className={styles.removeBtn} onClick={() => removeUnit(unit._deckId)}>✕</button>
                    </div>
                  </div>

                  {/* Weapon editor panel */}
                  {isEditing && (
                    <div className={styles.weaponEditor}>
                      {hasRanged && (
                        <div className={styles.weaponGroup}>
                          <div className={styles.weaponGroupTitle}>Ranged</div>
                          {unit.rangedWeapons.map(w => (
                            <label key={weaponKey(w)} className={styles.weaponToggle}>
                              <input
                                type="checkbox"
                                checked={!isWeaponExcluded(unit._deckId, 'ranged', weaponKey(w))}
                                onChange={() => toggleWeapon(unit._deckId, 'ranged', weaponKey(w))}
                              />
                              <span>{weaponKey(w)}</span>
                            </label>
                          ))}
                        </div>
                      )}
                      {hasMelee && (
                        <div className={styles.weaponGroup}>
                          <div className={styles.weaponGroupTitle}>Melee</div>
                          {unit.meleeWeapons.map(w => (
                            <label key={weaponKey(w)} className={styles.weaponToggle}>
                              <input
                                type="checkbox"
                                checked={!isWeaponExcluded(unit._deckId, 'melee', weaponKey(w))}
                                onChange={() => toggleWeapon(unit._deckId, 'melee', weaponKey(w))}
                              />
                              <span>{weaponKey(w)}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Style editor panel */}
                  {isEditingStyleFor && (
                    <div className={styles.styleEditor}>
                      <div className={styles.styleSection}>
                        <div className={styles.styleSectionTitle}>Font Sizes</div>
                        {[
                          { key: 'statsFontSize',      label: 'Stats',     min: 14, max: 36 },
                          { key: 'weaponsFontSize',    label: 'Weapons',   min: 8,  max: 24 },
                          { key: 'abilitiesFontSize',  label: 'Abilities', min: 6,  max: 20 },
                          { key: 'keywordsFontSize',   label: 'Keywords',  min: 8,  max: 24 },
                          { key: 'factionsFontSize',   label: 'Factions',  min: 8,  max: 28 },
                        ].map(({ key, label, min, max }) => {
                          const val = getStyleVal(unit._deckId, key, STYLE_DEFAULTS[key]);
                          return (
                            <div key={key} className={styles.styleRow}>
                              <span className={styles.styleRowLabel}>{label}</span>
                              <input type="range" min={min} max={max} value={val}
                                onChange={e => setOverrideProp(unit._deckId, key, Number(e.target.value))}
                                className={styles.styleRange} />
                              <span className={styles.styleRangeValue}>{val}px</span>
                            </div>
                          );
                        })}
                      </div>

                      <div className={styles.styleSection}>
                        <div className={styles.styleSectionTitle}>Visibility</div>
                        {hasRanged && (
                          <label className={styles.styleToggle}>
                            <input type="checkbox"
                              checked={getStyleNested(unit._deckId, 'showWeapons', 'rangedWeapons', true)}
                              onChange={e => setOverrideNested(unit._deckId, 'showWeapons', 'rangedWeapons', e.target.checked)} />
                            <span>Ranged weapons</span>
                          </label>
                        )}
                        {hasMelee && (
                          <label className={styles.styleToggle}>
                            <input type="checkbox"
                              checked={getStyleNested(unit._deckId, 'showWeapons', 'meleeWeapons', true)}
                              onChange={e => setOverrideNested(unit._deckId, 'showWeapons', 'meleeWeapons', e.target.checked)} />
                            <span>Melee weapons</span>
                          </label>
                        )}
                        {(unit.composition?.length > 0 || unit.loadout) && (
                          <label className={styles.styleToggle}>
                            <input type="checkbox"
                              checked={getStyleVal(unit._deckId, 'showComposition', true)}
                              onChange={e => setOverrideProp(unit._deckId, 'showComposition', e.target.checked)} />
                            <span>Unit Composition</span>
                          </label>
                        )}
                        {unit.loadout && (
                          <label className={styles.styleToggle}>
                            <input type="checkbox"
                              checked={getStyleVal(unit._deckId, 'showLoadout', true)}
                              onChange={e => setOverrideProp(unit._deckId, 'showLoadout', e.target.checked)} />
                            <span>Loadout</span>
                          </label>
                        )}
                        {unit.wargear?.length > 0 && (
                          <label className={styles.styleToggle}>
                            <input type="checkbox"
                              checked={getStyleVal(unit._deckId, 'showWargear', true)}
                              onChange={e => setOverrideProp(unit._deckId, 'showWargear', e.target.checked)} />
                            <span>Wargear Options</span>
                          </label>
                        )}
                      </div>

                      <div className={styles.styleSection}>
                        <div className={styles.styleSectionTitle}>Ability Placement</div>
                        {ABILITY_TYPES.map(({ key, label }) => (
                          <div key={key} className={styles.styleRow}>
                            <span className={styles.styleRowLabel}>{label}</span>
                            <select className={styles.styleSelect}
                              value={getStyleNested(unit._deckId, 'abilityPositions', key, 'front')}
                              onChange={e => setOverrideNested(unit._deckId, 'abilityPositions', key, e.target.value)}>
                              <option value="front">Front</option>
                              <option value="back">Back</option>
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className={styles.cardRow}>
                    <div className="data-40k-10e" ref={el => (frontRefs.current[i] = el)}>
                      <UnitCardFront unit={eu} cardStyle={cs} />
                    </div>
                    <div className="data-40k-10e" ref={el => (backRefs.current[i] = el)}>
                      <UnitCardBack unit={eu} cardStyle={cs} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
