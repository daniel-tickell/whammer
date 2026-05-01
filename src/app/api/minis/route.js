import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const minis = await prisma.miniature.findMany({
      include: { collection: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(minis);
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching minis' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    if (Array.isArray(body)) {
      // Bulk insert
      const recordsToInsert = body.map(item => ({
        kitName: item.kitName,
        qty: parseInt(item.qty) || 1,
        collectionId: parseInt(item.collectionId),
        state: item.state || 'Unassembled'
      }));

      await prisma.miniature.createMany({
        data: recordsToInsert
      });

      return NextResponse.json({ success: true, message: 'Bulk items added' });
    } else {
      // Single insert
      const { kitName, qty, collectionId, state } = body;
      const newMini = await prisma.miniature.create({
        data: { 
          kitName, 
          qty: parseInt(qty) || 1, 
          collectionId: parseInt(collectionId), 
          state: state || 'Unassembled' 
        },
      });
      return NextResponse.json(newMini);
    }
  } catch (error) {
    console.error("Error creating mini:", error);
    return NextResponse.json({ error: 'Error creating mini' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { id, kitName, qty, collectionId, state } = await request.json();
    const updatedMini = await prisma.miniature.update({
      where: { id },
      data: { 
        kitName, 
        qty: parseInt(qty) || 1, 
        collectionId: collectionId ? parseInt(collectionId) : undefined, 
        state 
      },
    });
    return NextResponse.json(updatedMini);
  } catch (error) {
    console.error("Error updating mini:", error);
    return NextResponse.json({ error: 'Error updating mini' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id'), 10);
    await prisma.miniature.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Error deleting mini' }, { status: 500 });
  }
}
