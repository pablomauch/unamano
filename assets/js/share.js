// Link, código QR e imagen vertical (9:16) para compartir una causa
// en TikTok, Instagram o WhatsApp.

import qrcode from '../vendor/qrcode.mjs';
import { clp } from './data.js';
import { photoUrl } from './media.js';

// La app vive en /app/; el panel en /admin/ y la landing en la raíz.
export function causeUrl(c) {
  const here = location.pathname;
  const rel = /\/(app|admin)\/[^/]*$/.test(here) ? '../app/' : 'app/';
  return new URL(`${rel}#/h/${c.id}`, location.href).href;
}

export function qrSvg(text, size = 180, { dark = '#0F1E33', light = '#FFFFFF' } = {}) {
  const q = qrcode(0, 'M'); q.addData(text); q.make();
  const n = q.getModuleCount(), m = 2, total = n + m * 2;
  let d = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c + m},${r + m}h1v1h-1z`;
  return `<svg viewBox="0 0 ${total} ${total}" width="${size}" height="${size}" shape-rendering="crispEdges" role="img" aria-label="Código QR de la causa"><rect width="${total}" height="${total}" fill="${light}"/><path d="${d}" fill="${dark}"/></svg>`;
}

function drawQr(ctx, text, x, y, size) {
  const q = qrcode(0, 'M'); q.addData(text); q.make();
  const n = q.getModuleCount(), cell = size / (n + 4);
  ctx.fillStyle = '#fff'; roundRect(ctx, x, y, size, size, 28); ctx.fill();
  ctx.fillStyle = '#0F1E33';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) ctx.fillRect(Math.round(x + (c + 2) * cell), Math.round(y + (r + 2) * cell), Math.ceil(cell), Math.ceil(cell));
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

function wrap(ctx, text, x, y, maxW, lh, maxLines = 4) {
  const words = text.split(' '); let line = '', lines = [];
  for (const w of words) { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
  if (line) lines.push(line);
  lines = lines.slice(0, maxLines);
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lh));
  return y + lines.length * lh;
}

function loadImg(src) {
  return new Promise(res => {
    if (!src) return res(null);
    const img = new Image(); img.crossOrigin = 'anonymous';
    img.onload = () => res(img); img.onerror = () => res(null);
    img.src = src;
  });
}

// Imagen 1080×1920 para historias, con foto, avance y QR
export async function storyImage(c, st, { by } = {}) {
  await document.fonts?.ready;
  const W = 1080, H = 1920;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#0F1E33'; ctx.fillRect(0, 0, W, H);
  const img = await loadImg(photoUrl(c, 1200));
  if (img) {
    const ph = 1180, s = Math.max(W / img.width, ph / img.height);
    const iw = img.width * s, ih = img.height * s;
    ctx.drawImage(img, (W - iw) / 2, (ph - ih) / 2, iw, ih);
  }
  const g = ctx.createLinearGradient(0, 520, 0, 1250);
  g.addColorStop(0, 'rgba(15,30,51,0)'); g.addColorStop(1, 'rgba(15,30,51,1)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, 1250);
  const F = '"Atkinson", system-ui, sans-serif';
  // Marca
  ctx.fillStyle = '#fff'; ctx.font = `800 44px ${F}`; ctx.fillText('unamano', 80, 120);
  ctx.fillStyle = '#FFC23D'; roundRect(ctx, 80, 150, 330, 60, 30); ctx.fill();
  ctx.fillStyle = '#0F1E33'; ctx.font = `800 28px ${F}`; ctx.fillText('✓ Causa verificada', 104, 190);
  // Texto principal
  ctx.fillStyle = '#fff'; ctx.font = `800 96px ${F}`;
  let y = wrap(ctx, c.title, 80, 900, W - 160, 104, 3);
  ctx.fillStyle = '#C9D3E0'; ctx.font = `400 40px ${F}`;
  y = wrap(ctx, c.need || c.treatment, 80, y + 20, W - 160, 54, 3);
  // Avance
  const by0 = Math.max(y + 50, 1330);
  ctx.fillStyle = 'rgba(255,255,255,.15)'; roundRect(ctx, 80, by0, W - 160, 36, 18); ctx.fill();
  ctx.fillStyle = '#FFC23D'; roundRect(ctx, 80, by0, Math.max(40, (W - 160) * st.pct / 100), 36, 18); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = `800 52px ${F}`; ctx.fillText(`${Math.floor(st.pct)}% de la meta`, 80, by0 + 110);
  ctx.fillStyle = '#C9D3E0'; ctx.font = `400 36px ${F}`; ctx.fillText(`Faltan ${clp(st.missing)}`, 80, by0 + 165);
  // QR y llamado
  const qs = 330, qx = W - 80 - qs, qy = H - 80 - qs;
  drawQr(ctx, causeUrl(c), qx, qy, qs);
  ctx.fillStyle = '#fff'; ctx.font = `800 64px ${F}`;
  wrap(ctx, 'Escanea y aporta desde $1.000', 80, qy + 70, qx - 120, 74, 3);
  ctx.fillStyle = '#C9D3E0'; ctx.font = `400 32px ${F}`;
  ctx.fillText(by ? `${by} ya aportó. ¿Te sumas?` : 'El pago va directo al proveedor.', 80, H - 90);
  return new Promise(res => cv.toBlob(res, 'image/png'));
}

// Comparte la imagen (si el teléfono lo permite) o la descarga
export async function shareStory(c, st, opts = {}) {
  const blob = await storyImage(c, st, opts);
  if (!blob) throw new Error('No se pudo crear la imagen');
  const file = new File([blob], `unamano-${c.id}.png`, { type: 'image/png' });
  const text = `${c.title}. Aporta desde $1.000: ${causeUrl(c)}`;
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], text }); return 'shared'; } catch (e) { if (e.name === 'AbortError') return 'cancel'; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = file.name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  return 'downloaded';
}

export function whatsappUrl(c) {
  return `https://wa.me/?text=${encodeURIComponent(`${c.title}. Yo ya aporté. Con $1.000 también puedes ayudar: ${causeUrl(c)}`)}`;
}
