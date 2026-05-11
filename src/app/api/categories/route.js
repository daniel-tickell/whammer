import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

const FILE = path.join(process.cwd(), 'models.json');

function readStore() {
  const raw = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  return { categories: raw.categories ?? [], data: raw.data ?? [] };
}

function writeCategories(categories) {
  const raw = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  fs.writeFileSync(FILE, JSON.stringify({ ...raw, categories }, null, 2));
}

export async function GET() {
  try {
    const { categories } = readStore();
    return NextResponse.json(categories);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(request) {
  try {
    const { name } = await request.json();
    if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });
    const { categories } = readStore();
    const trimmed = name.trim();
    if (!categories.includes(trimmed)) {
      writeCategories([...categories, trimmed]);
    }
    return NextResponse.json({ name: trimmed });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const { oldName, newName } = await request.json();
    if (!newName?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });
    const trimmed = newName.trim();
    const raw = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    const categories = (raw.categories ?? []).map(c => c === oldName ? trimmed : c);
    const data = (raw.data ?? []).map(e => e.category === oldName ? { ...e, category: trimmed } : e);
    const factions = (raw.factions ?? []).map(f => f.category === oldName ? { ...f, category: trimmed } : f);
    fs.writeFileSync(FILE, JSON.stringify({ ...raw, categories, data, factions }, null, 2));
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');
    const { categories } = readStore();
    writeCategories(categories.filter(c => c !== name));
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
