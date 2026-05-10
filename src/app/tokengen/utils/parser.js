export function parseList(text) {
  const lines = text.split(/\n/);
  const units = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('+') || trimmed.startsWith('Configuration') || trimmed.includes('Detachment')) continue;

    const parenIndex = trimmed.indexOf('(');
    let namePart = parenIndex !== -1 ? trimmed.substring(0, parenIndex).trim() : trimmed;

    let name = namePart;
    let quantity = 1;

    const prefixMatch = namePart.match(/^(\d+)x?\s+(.+)/i);
    if (prefixMatch) {
      quantity = parseInt(prefixMatch[1], 10);
      name = prefixMatch[2];
    } else {
      const suffixMatch = namePart.match(/(.+)\s+x?(\d+)$/i);
      if (suffixMatch) {
        name = suffixMatch[1];
        quantity = parseInt(suffixMatch[2], 10);
      }
    }

    name = name.replace(/\[.*?\]/g, '').replace(/:$/, '').trim();
    if (name.length < 2 || name.startsWith('-') || name.startsWith('.')) continue;

    if (name) {
      units.push({ id: generateUUID(), name, quantity, original: trimmed });
    }
  }

  return units;
}

function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
