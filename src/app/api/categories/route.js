import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      include: {
        collections: {
          include: {
            miniatures: true
          }
        }
      },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json({ error: 'Error fetching categories' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { name } = await request.json();
    const newCategory = await prisma.category.create({
      data: { name },
    });
    return NextResponse.json(newCategory);
  } catch (error) {
    console.error("Error creating category:", error);
    return NextResponse.json({ error: 'Error creating category' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id'), 10);
    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Error deleting category' }, { status: 500 });
  }
}
