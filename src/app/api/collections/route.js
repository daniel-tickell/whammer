import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const collections = await prisma.collection.findMany({
      include: { miniatures: true },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(collections);
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching collections' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { name, categoryId } = await request.json();
    const newCollection = await prisma.collection.create({
      data: { 
        name, 
        categoryId: parseInt(categoryId)
      },
    });
    return NextResponse.json(newCollection);
  } catch (error) {
    console.error("Error creating collection:", error);
    return NextResponse.json({ error: 'Error creating collection' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id'), 10);
    await prisma.collection.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Error deleting collection' }, { status: 500 });
  }
}
