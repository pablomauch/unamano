// Fotos de las causas (con respaldo si la imagen no carga), etiquetas
// de tipo de causa y sello de verificación.

import { icon } from './icons.js';
import { CATEGORIES } from './data.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

export function photoUrl(c, w = 900) {
  if (c.cover) return c.cover;
  if (!c.photo) return '';
  return `${c.photo}?auto=format&fit=crop&w=${w}&q=70`;
}

// Bloque con la foto. Si no hay foto o falla, muestra el ícono del tipo de causa.
export function photo(c, { w = 900, cls = '', style = '' } = {}) {
  const k = CATEGORIES[c.category] || CATEGORIES.comunidad;
  const src = photoUrl(c, w);
  const fallback = `<span class="ph-fb" style="background:${k.tint};color:${k.color}">${icon(k.icon, 48, 1.6)}</span>`;
  const alt = c.beneficiary?.first ? `Foto: ${c.beneficiary.first}` : 'Foto de la causa';
  return `<div class="ph ${cls}" style="${style}">${fallback}${src ? `<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy" decoding="async" onerror="this.remove()">` : ''}</div>`;
}

export function catTag(key) {
  const k = CATEGORIES[key]; if (!k) return '';
  return `<span class="cat"><i style="background:${k.color}">${icon(k.icon, 13, 2.4)}</i>${k.label}</span>`;
}

export function verifiedPill(text = 'Verificada') {
  return `<span class="vpill">${icon('shield', 15, 2.4)}${text}</span>`;
}

export function seal(size = 96) {
  const id = 'sl' + Math.random().toString(36).slice(2, 7);
  return `<svg class="seal" width="${size}" height="${size}" viewBox="0 0 120 120" role="img" aria-label="Causa verificada por unamano">
    <defs><path id="${id}" d="M60,60 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0"/></defs>
    <circle cx="60" cy="60" r="58" fill="#0E7A5F"/>
    <circle cx="60" cy="60" r="31" fill="#FFFFFF"/>
    <text font-family="Atkinson, sans-serif" font-size="10.5" font-weight="800" letter-spacing="2.4" fill="#FFFFFF">
      <textPath href="#${id}" startOffset="0">CAUSA VERIFICADA · UNAMANO · CAUSA VERIFICADA ·</textPath>
    </text>
    <path d="m47 61 9 9 18-20" fill="none" stroke="#0E7A5F" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}
