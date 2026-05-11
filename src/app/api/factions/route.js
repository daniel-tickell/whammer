import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

const FILE = path.join(process.cwd(), 'models.json');

function readStore() {
  const raw = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  return { factions: raw.factions ?? [], ...raw };
}

function writeFactions(factions) {
  const raw = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  fs.writeFileSync(FILE, JSON.stringify({ ...raw, factions }, null, 2));
}

export async function GET() {
  try {
    const { factions } = readStore();
    return NextResponse.json(factions);
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(request) {
  try {
    const { name, category } = await request.json();
    if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });
    const { factions } = readStore();
    const trimmed = name.trim();
    if (!factions.find(f => f.name === trimmed)) {
      writeFactions([...factions, { name: trimmed, category: category ?? null }]);
    }
    return NextResponse.json({ name: trimmed, category });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Called when dragging a faction to a new category — update stored faction's category too
export async function PATCH(request) {
  try {
    const { name, category } = await request.json();
    const { factions } = readStore();
    writeFactions(factions.map(f => f.name === name ? { ...f, category } : f));
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { oldName, newName } = await request.json();
    if (!newName?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });
    const trimmed = newName.trim();
    const raw = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    const factions = (raw.factions ?? []).map(f => f.name === oldName ? { ...f, name: trimmed } : f);
    const data = (raw.data ?? []).map(e => e.faction === oldName ? { ...e, faction: trimmed } : e);
    fs.writeFileSync(FILE, JSON.stringify({ ...raw, factions, data }, null, 2));
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');
    const { factions } = readStore();
    writeFactions(factions.filter(f => f.name !== name));
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
