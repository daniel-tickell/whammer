import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

const DATASOURCE_URL = 'https://raw.githubusercontent.com/game-datacards/datasources/develop/10th/gdc';

const FACTION_ID_MAP = {
  spacemarines: 'space_marines',
  spacemar: 'space_marines',
  ultramarines: 'space_marines',
  chaosspacemarines: 'chaos_spacemarines',
  csm: 'chaos_spacemarines',
  deathguard: 'deathguard',
  thousandsons: 'thousandsons',
  worldeaters: 'worldeaters',
  darkangels: 'darkangels',
  bloodangels: 'bloodangels',
  spacewolves: 'spacewolves',
  blacktemplar: 'blacktemplar',
  blacktemplars: 'blacktemplar',
  greyknights: 'greyknights',
  adeptasororitas: 'adeptasororitas',
  sistersofbattle: 'adeptasororitas',
  sistersbattle: 'adeptasororitas',
  adeptusmechanicus: 'adeptusmechanicus',
  admech: 'adeptusmechanicus',
  adeptuscustodes: 'adeptuscustodes',
  custodes: 'adeptuscustodes',
  imperialknights: 'imperialknights',
  chaosknights: 'chaosknights',
  chaosdaemons: 'chaosdaemons',
  daemons: 'chaosdaemons',
  astramilitarum: 'astramilitarum',
  imperialguard: 'astramilitarum',
  tyranids: 'tyranids',
  necrons: 'necrons',
  orks: 'orks',
  tau: 'tau',
  tauempire: 'tau',
  aeldari: 'aeldari',
  eldar: 'aeldari',
  drukhari: 'drukhari',
  darkeldar: 'drukhari',
  genestealercults: 'gsc',
  gsc: 'gsc',
  leaguesofvotann: 'votann',
  votann: 'votann',
  agentsoftheimperium: 'agents',
  agents: 'agents',
  deathwatch: 'deathwatch',
  emperorschildren: 'emperors_children',
};

function guessFactonId(name) {
  const key = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  return FACTION_ID_MAP[key] || key;
}

function stubCard(unitName, factionId, headerColor, bannerColor) {
  return {
    uuid: randomUUID(),
    id: unitName.toLowerCase().replace(/\s+/g, '-'),
    name: unitName,
    subname: '',
    faction_id: factionId,
    source: '40k-10e',
    cardType: 'DataCard',
    variant: 'full',
    isCustom: true,
    points: [],
    stats: [],
    rangedWeapons: [],
    meleeWeapons: [],
    abilities: {
      core: [], faction: [], other: [], wargear: [], special: [],
      invul: { showInvulnerableSave: false, value: '', description: '', showAtTop: false },
    },
    keywords: [],
    factions: [],
    headerColor,
    bannerColor,
  };
}

export async function POST(request) {
  try {
    const { factionId: rawId, units, headerColor = '#13151A', bannerColor = '#C0392B', categoryName = 'My Cards' } = await request.json();

    if (!rawId) return NextResponse.json({ error: 'factionId required' }, { status: 400 });
    if (!units?.length) return NextResponse.json({ error: 'units required' }, { status: 400 });

    const factionId = guessFactonId(rawId) || rawId;

    let datasheets = [];
    try {
      const res = await fetch(`${DATASOURCE_URL}/${factionId}.json`);
      if (res.ok) {
        const json = await res.json();
        datasheets = json.datasheets || [];
      }
    } catch {
      // network error — fall through to stubs
    }

    const cards = units.map(unit => {
      const name = unit.unitName;
      const sheet = datasheets.find(d => d.name.toLowerCase() === name.toLowerCase())
        || datasheets.find(d => d.name.toLowerCase().includes(name.toLowerCase()))
        || datasheets.find(d => name.toLowerCase().includes(d.name.toLowerCase()));

      if (sheet) {
        return { ...sheet, uuid: randomUUID(), headerColor, bannerColor, isCustom: false };
      }
      return stubCard(name, factionId, headerColor, bannerColor);
    });

    const exportData = {
      category: { uuid: randomUUID(), name: categoryName, closed: false, cards },
      createdAt: new Date().toISOString(),
      version: '2.13.0',
      website: 'https://game-datacards.eu',
    };

    const filename = `${categoryName.replace(/[^a-z0-9]/gi, '_')}-${Date.now()}.json`;
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
