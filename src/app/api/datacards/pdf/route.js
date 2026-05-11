import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import puppeteer from 'puppeteer';

const DATASOURCE_URL = 'https://raw.githubusercontent.com/game-datacards/datasources/develop/10th/gdc';

const FACTION_ID_MAP = {
  spacemarines: 'space_marines', ultramarines: 'space_marines',
  chaosspacemarines: 'chaos_spacemarines', csm: 'chaos_spacemarines',
  deathguard: 'deathguard', thousandsons: 'thousandsons', worldeaters: 'worldeaters',
  darkangels: 'darkangels', bloodangels: 'bloodangels', spacewolves: 'spacewolves',
  blacktemplar: 'blacktemplar', blacktemplars: 'blacktemplar', greyknights: 'greyknights',
  adeptasororitas: 'adeptasororitas', sistersofbattle: 'adeptasororitas',
  adeptusmechanicus: 'adeptusmechanicus', admech: 'adeptusmechanicus',
  adeptuscustodes: 'adeptuscustodes', custodes: 'adeptuscustodes',
  imperialknights: 'imperialknights', chaosknights: 'chaosknights',
  chaosdaemons: 'chaosdaemons', astramilitarum: 'astramilitarum', imperialguard: 'astramilitarum',
  tyranids: 'tyranids', necrons: 'necrons', orks: 'orks',
  tau: 'tau', tauempire: 'tau', aeldari: 'aeldari', eldar: 'aeldari',
  drukhari: 'drukhari', darkeldar: 'drukhari', genestealercults: 'gsc',
  leaguesofvotann: 'votann', votann: 'votann', agents: 'agents',
  deathwatch: 'deathwatch', emperorschildren: 'emperors_children',
};

function normId(name) {
  const key = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  return FACTION_ID_MAP[key] || key;
}

function esc(v) {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderWeaponTable(weapons, label, skillLabel) {
  const profiles = weapons
    .filter(w => w.active !== false)
    .flatMap(w => (w.profiles || []).filter(p => p.active !== false));
  if (!profiles.length) return '';
  return `
    <table class="wtbl">
      <thead>
        <tr class="wt-head"><td colspan="7">${label}</td></tr>
        <tr class="wt-cols">
          <td>WEAPON</td><td>RANGE</td><td>A</td><td>${skillLabel}</td><td>S</td><td>AP</td><td>D</td>
        </tr>
      </thead>
      <tbody>
        ${profiles.map((p, i) => `
          <tr class="wt-row ${i % 2 === 1 ? 'wt-alt' : ''}">
            <td class="w-name">${esc(p.name)}${p.keywords?.length ? `<div class="w-kw">${p.keywords.map(esc).join(' • ')}</div>` : ''}</td>
            <td>${esc(p.range ?? 'Melee')}</td>
            <td>${esc(p.attacks)}</td>
            <td>${esc(p.skill)}</td>
            <td>${esc(p.strength)}</td>
            <td>${esc(p.ap)}</td>
            <td>${esc(p.damage)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;
}

function renderCard(unit, headerColor, bannerColor) {
  const stats = (unit.stats || []).filter(s => s.active !== false);
  const ab = unit.abilities || {};
  const core = (ab.core || []);
  const faction = (ab.faction || []);
  const other = (ab.other || []).filter(a => a.showAbility !== false);
  const wargear = (ab.wargear || []).filter(a => a.showAbility !== false);
  const invul = ab.invul || {};
  const pts = (unit.points || []).map(p => `${p.cost}pts`).join(' / ');

  const statsHtml = stats.map(s => `
    <div class="stat-row">
      <div class="stat-model">${s.showName ? esc(s.name) : ''}</div>
      <div class="sv">${esc(s.m)}</div><div class="sv">${esc(s.t)}</div>
      <div class="sv">${esc(s.sv)}</div><div class="sv">${esc(s.w)}</div>
      <div class="sv">${esc(s.ld)}</div><div class="sv">${esc(s.oc)}</div>
    </div>`).join('');

  const abHtml = `
    ${core.length || faction.length ? `
      <div class="ab-inline">
        ${core.length ? `<span class="ab-tag">CORE</span> ${core.map(esc).join(', ')}` : ''}
        ${faction.length ? `<span class="ab-tag">FACTION</span> ${faction.map(esc).join(', ')}` : ''}
      </div>` : ''}
    ${other.map(a => `
      <div class="ab-block">
        <span class="ab-name">${esc(a.name)} –</span>
        ${a.showDescription !== false && a.description ? `<span class="ab-desc">${esc(a.description)}</span>` : ''}
      </div>`).join('')}
    ${wargear.length ? `<div class="ab-section-title">WARGEAR ABILITIES</div>
      ${wargear.map(a => `
        <div class="ab-block">
          <span class="ab-name">${esc(a.name)} –</span>
          ${a.description ? `<span class="ab-desc">${esc(a.description)}</span>` : ''}
        </div>`).join('')}` : ''}
    ${invul.showInvulnerableSave ? `
      <div class="invul-box" style="border-color:${headerColor}">
        <span class="invul-val" style="color:${headerColor}">${esc(invul.value)}</span>
        <span class="invul-label">INVULNERABLE SAVE</span>
      </div>` : ''}`;

  return `
    <div class="card" style="--hc:${headerColor};--bc:${bannerColor}">
      <div class="card-top">
        <div class="banner"></div>
        <div class="header">
          <div class="h-name">
            <div class="unit-name">${esc(unit.name)}</div>
            ${unit.subname ? `<div class="unit-sub">${esc(unit.subname)}</div>` : ''}
          </div>
          ${pts ? `<div class="pts">${pts}</div>` : ''}
        </div>
        <div class="stats-bar">
          <div class="stats-hdr">
            <div class="stat-model"></div>
            <div>M</div><div>T</div><div>SV</div><div>W</div><div>LD</div><div>OC</div>
          </div>
          ${statsHtml}
        </div>
      </div>
      <div class="card-body">
        <div class="weapons-col">
          ${renderWeaponTable(unit.rangedWeapons || [], 'RANGED WEAPONS', 'BS')}
          ${renderWeaponTable(unit.meleeWeapons || [], 'MELEE WEAPONS', 'WS')}
        </div>
        <div class="abilities-col">
          <div class="ab-heading" style="background:var(--hc);color:#fff">ABILITIES</div>
          ${abHtml}
        </div>
      </div>
      <div class="card-footer">
        ${unit.keywords?.length ? `<div class="fkw"><span class="fkw-lbl">KEYWORDS</span>${unit.keywords.map(esc).join(' • ')}</div>` : ''}
        ${unit.factions?.length ? `<div class="fkw"><span class="fkw-lbl">FACTION</span>${unit.factions.map(esc).join(', ')}</div>` : ''}
      </div>
    </div>`;
}

function buildHtml(cards, headerColor, bannerColor) {
  const cardHtml = cards.map(c => `
    <div class="page">
      ${renderCard(c, headerColor, bannerColor)}
    </div>`).join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #f0f0f0; font-family: 'Segoe UI', system-ui, Arial, sans-serif; }

.page { width: 1082px; padding: 10px 15px; page-break-after: always; }
.page:last-child { page-break-after: auto; }

.card {
  --hc: #13151a;
  --bc: #c0392b;
  width: 1052px;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.25);
  background: #fff;
  display: flex;
  flex-direction: column;
}

/* TOP: banner + header + stats */
.card-top { background: var(--hc); }
.banner { height: 8px; background: var(--bc); }
.header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 16px 6px; color: #fff;
}
.unit-name { font-size: 22px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.03em; line-height: 1.1; }
.unit-sub { font-size: 11px; font-style: italic; opacity: 0.75; margin-top: 2px; }
.pts { background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.4); border-radius: 4px; padding: 4px 10px; font-size: 12px; font-weight: 700; color: #fff; white-space: nowrap; }

.stats-bar { background: #dfe0e2; padding: 4px 16px 6px; }
.stats-hdr, .stat-row { display: grid; grid-template-columns: 140px repeat(6, 1fr); gap: 2px; align-items: center; }
.stats-hdr { font-size: 10px; font-weight: 800; color: var(--hc); text-align: center; padding-bottom: 2px; }
.stats-hdr > div:first-child { text-align: left; }
.stat-row { padding: 2px 0; }
.stat-model { font-size: 10px; font-weight: 600; color: var(--hc); }
.sv { text-align: center; font-size: 14px; font-weight: 700; color: #1a1a1a; }

/* BODY */
.card-body { display: flex; flex: 1; min-height: 260px; }
.weapons-col { flex: 2.2; border-right: 1px solid #e0e0e0; overflow: hidden; }
.abilities-col { flex: 1; overflow: hidden; display: flex; flex-direction: column; }

.wtbl { width: 100%; border-collapse: collapse; font-size: 10.5px; }
.wt-head td { background: var(--hc); color: #fff; font-weight: 700; font-size: 9px; letter-spacing: 0.08em; padding: 3px 8px; }
.wt-cols td { background: #dfe0e2; font-size: 9px; font-weight: 700; color: var(--hc); padding: 2px 4px; text-align: center; }
.wt-cols td:first-child { text-align: left; padding-left: 8px; }
.wt-row td { padding: 3px 4px; vertical-align: top; border-bottom: 0.5px solid #e8e8e8; text-align: center; }
.wt-row td:first-child { text-align: left; padding-left: 8px; }
.wt-alt td { background: #f0f0f1; }
.w-name { font-weight: 600; }
.w-kw { font-size: 8px; color: var(--hc); font-style: italic; margin-top: 1px; }

.ab-heading { font-size: 9px; font-weight: 800; letter-spacing: 0.08em; padding: 3px 8px; }
.abilities-col-inner { padding: 5px 8px; overflow: hidden; font-size: 9px; flex: 1; }
.ab-inline { margin-bottom: 5px; font-size: 8.5px; color: #333; }
.ab-tag { background: var(--hc); color: #fff; font-size: 7px; font-weight: 700; padding: 1px 4px; border-radius: 2px; margin-right: 3px; }
.ab-block { margin-bottom: 4px; line-height: 1.35; color: #222; }
.ab-name { font-weight: 700; font-size: 8.5px; }
.ab-desc { font-size: 8px; color: #333; }
.ab-section-title { font-size: 8px; font-weight: 800; color: var(--hc); text-transform: uppercase; margin: 5px 0 3px; border-top: 0.5px solid var(--hc); padding-top: 3px; }
.invul-box { border: 1.5px solid; border-radius: 4px; padding: 3px 6px; margin-top: 5px; display: flex; align-items: center; gap: 6px; }
.invul-val { font-size: 18px; font-weight: 800; }
.invul-label { font-size: 7.5px; font-weight: 700; text-transform: uppercase; line-height: 1.2; }

/* FOOTER */
.card-footer { background: #1a1a1a; color: #fff; padding: 5px 16px; display: flex; flex-direction: column; gap: 2px; }
.fkw { font-size: 9px; line-height: 1.4; }
.fkw-lbl { color: var(--bc); font-weight: 800; font-size: 8px; text-transform: uppercase; letter-spacing: 0.06em; margin-right: 5px; }

@media print {
  .page { page-break-after: always; }
}
</style>
</head>
<body>
${cardHtml}
<script>
// Wrap abilities col inner content after render
document.querySelectorAll('.abilities-col').forEach(col => {
  const heading = col.querySelector('.ab-heading');
  const rest = document.createElement('div');
  rest.className = 'abilities-col-inner';
  while (col.childNodes.length > 1) rest.appendChild(col.childNodes[1]);
  col.appendChild(rest);
});
</script>
</body>
</html>`;
}

export async function POST(request) {
  let browser;
  try {
    const { factionId: rawId, units, headerColor = '#13151A', bannerColor = '#C0392B', categoryName = 'Cards' } = await request.json();
    if (!rawId || !units?.length) return NextResponse.json({ error: 'factionId and units required' }, { status: 400 });

    const factionId = normId(rawId);

    let datasheets = [];
    try {
      const res = await fetch(`${DATASOURCE_URL}/${factionId}.json`);
      if (res.ok) datasheets = (await res.json()).datasheets || [];
    } catch { /* fall through to stubs */ }

    const cards = units.map(unit => {
      const name = unit.unitName;
      const sheet = datasheets.find(d => d.name.toLowerCase() === name.toLowerCase())
        || datasheets.find(d => d.name.toLowerCase().includes(name.toLowerCase()))
        || datasheets.find(d => name.toLowerCase().includes(d.name.toLowerCase()));
      return sheet || {
        name, subname: '', faction_id: factionId, source: '40k-10e', cardType: 'DataCard',
        stats: [], rangedWeapons: [], meleeWeapons: [],
        abilities: { core: [], faction: [], other: [], wargear: [], invul: { showInvulnerableSave: false } },
        keywords: [], factions: [], points: [],
      };
    });

    const html = buildHtml(cards, headerColor, bannerColor);

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1112, height: 794, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdf = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: { top: '10px', right: '15px', bottom: '10px', left: '15px' },
    });

    const filename = `${categoryName.replace(/[^a-z0-9]/gi, '_')}-datacards.pdf`;
    return new NextResponse(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error('PDF generation error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    await browser?.close();
  }
}
