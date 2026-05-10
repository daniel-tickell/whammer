import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

const FILE = path.join(process.cwd(), 'models.json');

function readFile() {
  const raw = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  let changed = false;

  const data = raw.data.map((entry, i) => {
    if (entry._id) return entry;
    changed = true;
    return {
      _id: `m_${Date.now()}_${i}`,
      faction: entry['Faction'] ?? entry.faction ?? '',
      unitName: entry['Unit Name'] ?? entry.unitName ?? '',
      qty: parseInt(entry['Quantity'] ?? entry.qty ?? 1),
      baseSize: entry['Base Size'] ?? entry.baseSize ?? null,
      gameSystem: entry.gameSystem ?? null,
      unitType: entry.unitType ?? null,
      tags: entry.tags ?? [],
      unassembled: entry.unassembled ?? parseInt(entry['Quantity'] ?? entry.qty ?? 1),
      assembled: entry.assembled ?? 0,
      primed: entry.primed ?? 0,
      painted: entry.painted ?? 0,
      finished: entry.finished ?? 0,
    };
  });

  if (changed) fs.writeFileSync(FILE, JSON.stringify({ data }, null, 2));
  return data;
}

function writeFile(data) {
  fs.writeFileSync(FILE, JSON.stringify({ data }, null, 2));
}

export async function GET() {
  try {
    return NextResponse.json(readFile());
  } catch (err) {
    return NextResponse.json({ error: 'Failed to read models' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const data = readFile();
    const qty = parseInt(body.qty) || 1;
    const entry = {
      _id: `m_${Date.now()}`,
      faction: body.faction ?? '',
      unitName: body.unitName ?? '',
      qty,
      baseSize: body.baseSize ?? null,
      gameSystem: body.gameSystem ?? null,
      unitType: body.unitType ?? null,
      tags: body.tags ?? [],
      unassembled: qty,
      assembled: 0,
      primed: 0,
      painted: 0,
      finished: 0,
    };
    data.push(entry);
    writeFile(data);
    return NextResponse.json(entry);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to add model' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { _id, direction, ...updates } = body;
    const data = readFile();
    const idx = data.findIndex(e => e._id === _id);
    if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const STATE_KEYS = ['unassembled', 'assembled', 'primed', 'painted', 'finished'];

    if (direction) {
      const entry = data[idx];
      let fromKey, toKey;
      if (direction === 'next') {
        for (let i = 0; i < STATE_KEYS.length - 1; i++) {
          if (entry[STATE_KEYS[i]] > 0) { fromKey = STATE_KEYS[i]; toKey = STATE_KEYS[i + 1]; break; }
        }
      } else if (direction === 'prev') {
        for (let i = STATE_KEYS.length - 1; i > 0; i--) {
          if (entry[STATE_KEYS[i]] > 0) { fromKey = STATE_KEYS[i]; toKey = STATE_KEYS[i - 1]; break; }
        }
      }
      if (fromKey && toKey) { data[idx][toKey] += data[idx][fromKey]; data[idx][fromKey] = 0; }
    } else {
      const allowed = ['faction', 'unitName', 'qty', 'baseSize', 'gameSystem', 'unitType', 'tags'];
      for (const key of allowed) {
        if (key in updates) data[idx][key] = updates[key];
      }
      // If qty changed, adjust unassembled to keep totals consistent
      if ('qty' in updates) {
        const newQty = parseInt(updates.qty) || 1;
        const total = STATE_KEYS.reduce((s, k) => s + data[idx][k], 0);
        const diff = newQty - total;
        if (diff > 0) data[idx].unassembled += diff;
        else if (diff < 0) {
          // Trim from the most-progressed states first
          let toRemove = -diff;
          for (let i = STATE_KEYS.length - 1; i >= 0 && toRemove > 0; i--) {
            const cut = Math.min(data[idx][STATE_KEYS[i]], toRemove);
            data[idx][STATE_KEYS[i]] -= cut;
            toRemove -= cut;
          }
        }
      }
    }

    writeFile(data);
    return NextResponse.json(data[idx]);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update model' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const _id = searchParams.get('id');
    const data = readFile();
    const filtered = data.filter(e => e._id !== _id);
    if (filtered.length === data.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    writeFile(filtered);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to delete model' }, { status: 500 });
  }
}
