import baseSizesData from './baseSizes.json';

export const baseSizes = baseSizesData;

export const commonBaseSizes = [
  '25mm', '28.5mm', '32mm', '40mm', '50mm', '60mm', '80mm', '90mm',
  '100mm', '130mm', '160mm', '60x35mm', '75x42mm', '90x52mm',
  '105x70mm', '120x92mm', '170x105mm'
];

function getCustomBaseSizes() {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem('tokenGen_customBaseSizes');
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

export function getBaseSize(unitName) {
  if (!unitName) return null;
  const customSizes = getCustomBaseSizes();
  if (customSizes[unitName]) return customSizes[unitName];
  if (baseSizes[unitName]) return baseSizes[unitName];
  if (unitName.endsWith('s') && baseSizes[unitName.slice(0, -1)]) return baseSizes[unitName.slice(0, -1)];
  const lower = unitName.toLowerCase();
  for (const key in baseSizes) { if (key.toLowerCase() === lower) return baseSizes[key]; }
  for (const key in customSizes) { if (key.toLowerCase() === lower) return customSizes[key]; }
  return null;
}

export function saveBaseSize(unitName, size) {
  if (!unitName || !size || typeof window === 'undefined') return;
  try {
    const customSizes = getCustomBaseSizes();
    customSizes[unitName] = size;
    localStorage.setItem('tokenGen_customBaseSizes', JSON.stringify(customSizes));
  } catch {
    // localStorage unavailable
  }
}
