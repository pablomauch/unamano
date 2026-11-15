// Fotos de las causas (con respaldo elegante si la imagen no carga)
// y sellos de verificación.

import { icon } from './icons.js';

const TINTS = [
  { bg: '#E8F5EF', fg: '#0A5E49' },
  { bg: '#FFF4D6', fg: '#8A5A00' },
  { bg: '#FFECE8', fg: '#B23A26' },
  { bg: '#EAF0FF', fg: '#2B45B8' },
];

const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

export function photoUrl(c, w = 900) {
  if (c.cover) return c.cover;
  if (!c.photo) return '';
  return `${c.photo}?auto=format&fit=crop&w=${w}&q=70`;
}

// Devuelve un bloque con la foto. Si no hay foto o falla, muestra la inicial.
export function photo(c, { w = 900, cls = '', alt } = {}) {
  const t = TINTS[(c.palette ?? 0) % TINTS.length];
  const first = esc(c.beneficiary?.first || '');
  const src = photoUrl(c, w);
  const fallback = `<span class="ph-fb" style="background:${t.bg};color:${t.fg}"><span>${first.charAt(0)}</span></span>`;
  return `<div class="ph ${cls}">${fallback}${src ? `<img src="${esc(src)}" alt="${esc(alt ?? 'Foto de ' + (c.beneficiary?.first || 'la causa'))}" loading="lazy" decoding="async" onerror="this.remove()">` : ''}</div>`;
}

export function verifiedPill(text = 'Verificada') {
  return `<span class="vpill">${icon('shield', 15, 2.4)}${text}</span>`;
}

// Sello circular sobrio para momentos de confianza
export function seal(size = 96) {
  const id = 'sl' + Math.random().toString(36).slice(2, 7);
  return `<svg class="seal" width="${size}" height="${size}" viewBox="0 0 120 120" role="img" aria-label="Causa verificada por unamano">
    <defs><path id="${id}" d="M60,60 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0"/></defs>
    <circle cx="60" cy="60" r="58" fill="#0E7A5F"/>
    <circle cx="60" cy="60" r="31" fill="#FFFFFF"/>
    <text font-family="Plus Jakarta Sans, sans-serif" font-size="10.5" font-weight="800" letter-spacing="2.6" fill="#FFFFFF">
      <textPath href="#${id}" startOffset="0">CAUSA VERIFICADA · UNAMANO · CAUSA VERIFICADA ·</textPath>
    </text>
    <path d="m47 61 9 9 18-20" fill="none" stroke="#0E7A5F" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}
