import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const STATE_KEYS = ['unassembled', 'assembled', 'primed', 'painted', 'finished'];
const DISPLAY_TO_KEY = {
  'Unassembled': 'unassembled',
  'Assembled': 'assembled',
  'Primed': 'primed',
  'Painted': 'painted',
  'Finished': 'finished'
};

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
      const recordsToInsert = body.map(item => {
        const qty = parseInt(item.qty) || 1;
        const initialState = item.state || 'Unassembled';
        const initialKey = DISPLAY_TO_KEY[initialState] || 'unassembled';
        
        return {
          kitName: item.kitName,
          qty: qty,
          collectionId: parseInt(item.collectionId),
          state: initialState,
          [initialKey]: qty
        };
      });

      await prisma.miniature.createMany({
        data: recordsToInsert
      });

      return NextResponse.json({ success: true, message: 'Bulk items added' });
    } else {
      // Single insert
      const { kitName, qty, collectionId, state } = body;
      const parsedQty = parseInt(qty) || 1;
      const initialState = state || 'Unassembled';
      const initialKey = DISPLAY_TO_KEY[initialState] || 'unassembled';

      const newMini = await prisma.miniature.create({
        data: { 
          kitName, 
          qty: parsedQty, 
          collectionId: parseInt(collectionId), 
          state: initialState,
          [initialKey]: parsedQty
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
    const { id, direction } = await request.json();
    
    if (direction) {
      // Granular move
      const mini = await prisma.miniature.findUnique({ where: { id } });
      if (!mini) return NextResponse.json({ error: 'Not found' }, { status: 404 });

      let fromKey, toKey;

      if (direction === 'next') {
        // Move from the first non-zero state to the next
        for (let i = 0; i < STATE_KEYS.length - 1; i++) {
          if (mini[STATE_KEYS[i]] > 0) {
            fromKey = STATE_KEYS[i];
            toKey = STATE_KEYS[i + 1];
            break;
          }
        }
      } else if (direction === 'prev') {
        // Move from the last non-zero state to the previous
        for (let i = STATE_KEYS.length - 1; i > 0; i--) {
          if (mini[STATE_KEYS[i]] > 0) {
            fromKey = STATE_KEYS[i];
            toKey = STATE_KEYS[i - 1];
            break;
          }
        }
      }

      if (fromKey && toKey) {
        const updatedMini = await prisma.miniature.update({
          where: { id },
          data: {
            [fromKey]: mini[fromKey] - 1,
            [toKey]: mini[toKey] + 1
          }
        });
        return NextResponse.json(updatedMini);
      }
      
      return NextResponse.json(mini);
    } else {
      // Legacy whole-unit update (if still used)
      const { kitName, qty, collectionId, state } = await request.json();
      const updatedMini = await prisma.miniature.update({
        where: { id },
        data: { 
          kitName, 
          qty: qty ? parseInt(qty) : undefined, 
          collectionId: collectionId ? parseInt(collectionId) : undefined, 
          state 
        },
      });
      return NextResponse.json(updatedMini);
    }
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
