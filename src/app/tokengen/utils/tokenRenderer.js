export const PIXELS_PER_MM = 20;

export function drawTokenToCanvas(canvas, unit, options = {}) {
  if (!canvas || !unit) return;

  const { baseColor = '#333333', textColor = '#ffd700', hasRing = false } = options;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const sizeStr = unit.baseSize || '32mm';
  let widthMm = 32, depthMm = 32;
  let isRect = sizeStr.toLowerCase().includes('rect');
  const match = sizeStr.match(/(\d+)(?:x(\d+))?/);
  if (match) {
    widthMm = parseInt(match[1]);
    depthMm = match[2] ? parseInt(match[2]) : widthMm;
  }
  const isOval = !isRect && (widthMm !== depthMm || sizeStr.toLowerCase().includes('oval'));

  const widthPx = widthMm * PIXELS_PER_MM;
  const heightPx = depthMm * PIXELS_PER_MM;
  canvas.width = widthPx;
  canvas.height = heightPx;

  ctx.fillStyle = baseColor;
  if (isRect) {
    ctx.fillRect(0, 0, widthPx, heightPx);
  } else if (isOval) {
    ctx.beginPath();
    ctx.ellipse(widthPx / 2, heightPx / 2, widthPx / 2, heightPx / 2, 0, 0, 2 * Math.PI);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(widthPx / 2, heightPx / 2, widthPx / 2, 0, 2 * Math.PI);
    ctx.fill();
  }

  if (hasRing) {
    ctx.lineWidth = 2 * PIXELS_PER_MM;
    ctx.strokeStyle = textColor;
    const inset = ctx.lineWidth / 2;
    if (isRect) {
      ctx.strokeRect(inset, inset, widthPx - inset * 2, heightPx - inset * 2);
    } else if (isOval) {
      ctx.beginPath();
      ctx.ellipse(widthPx / 2, heightPx / 2, widthPx / 2 - inset, heightPx / 2 - inset, 0, 0, 2 * Math.PI);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(widthPx / 2, heightPx / 2, widthPx / 2 - inset, 0, 2 * Math.PI);
      ctx.stroke();
    }
  }

  const text = (unit.name || 'Unit Name').trim();
  if (!text) return;

  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const minDim = Math.min(widthPx, heightPx);
  let fontSize = minDim * 0.3 * (unit.scaleAdjustment || 1.0);
  ctx.font = `bold ${fontSize}px sans-serif`;

  const words = text.split(/\s+/).filter(w => w.length > 0);
  const lineHeight = fontSize * 1.2;
  const margin = minDim * 0.1;
  const maxW = widthPx - (hasRing ? 4 * PIXELS_PER_MM : margin * 2);
  const maxH = heightPx - (hasRing ? 4 * PIXELS_PER_MM : margin * 2);

  let maxWidth = 0;
  words.forEach(word => { const w = ctx.measureText(word).width; if (w > maxWidth) maxWidth = w; });

  let scale = 1;
  if (maxWidth > maxW) scale = Math.min(scale, maxW / maxWidth);
  if (words.length * lineHeight > maxH) scale = Math.min(scale, maxH / (words.length * lineHeight));

  fontSize *= scale;
  ctx.font = `bold ${fontSize}px sans-serif`;
  const finalLineHeight = fontSize * 1.2;
  const startY = (heightPx - (words.length * finalLineHeight)) / 2 + (finalLineHeight / 2);
  words.forEach((word, i) => ctx.fillText(word, widthPx / 2, startY + (i * finalLineHeight)));
}
