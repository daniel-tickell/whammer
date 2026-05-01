import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { kitName, qty, armyCategory, state } = await request.json();
    
    const prompt = `You are a Warhammer 40k expert. List the exact miniature units and their quantities inside the kit: '${kitName}'. Return ONLY a JSON object with a single key "units" containing an array of objects. Each object must have "kitName" (string) and "qty" (integer). Example: {"units": [{"kitName": "Intercessors", "qty": 5}, {"kitName": "Impulsor", "qty": 1}]}`;

    const ollamaRes = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.1:8b',
        prompt: prompt,
        stream: false,
        format: 'json'
      }),
    });

    if (ollamaRes.ok) {
      const ollamaData = await ollamaRes.json();
      let parsed = {};
      try {
        parsed = JSON.parse(ollamaData.response);
      } catch (e) {
        console.error("JSON parse error:", e);
      }
      
      let contents = parsed.units || [];
      if (!Array.isArray(contents) && parsed.kitName) {
         contents = [parsed];
      }

      if (Array.isArray(contents) && contents.length > 0) {
        const boxQty = parseInt(qty) || 1;
        const previewItems = contents.map((item, index) => ({
          id: `preview-${Date.now()}-${index}`, // temporary ID for the frontend
          kitName: item.kitName || 'Unknown Unit',
          qty: (parseInt(item.qty) || 1) * boxQty,
          armyCategory: armyCategory,
          state: state || 'Unassembled'
        }));

        return NextResponse.json({ success: true, items: previewItems });
      }
    }
    
    // If Ollama fails to return valid array
    return NextResponse.json({ error: 'Failed to parse kit contents' }, { status: 400 });

  } catch (error) {
    console.error("Expand error:", error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
