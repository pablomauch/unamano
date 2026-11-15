// Afiches generativos estilo risografía: cada causa tiene el suyo,
// determinista por id. Si la causa trae foto, se imprime en duotono.

import { prng } from './crypto.js';
import { CATEGORIES } from './data.js';

export const PALETTES = [
  { bg: '#2F3BFF', a: '#FFCF1F', b: '#FF4A2D', fg: '#FFFFFF', ink: '#16150F' },
  { bg: '#FF4A2D', a: '#FFCF1F', b: '#2F3BFF', fg: '#16150F', ink: '#16150F' },
  { bg: '#FFCF1F', a: '#FF4A2D', b: '#2F3BFF', fg: '#16150F', ink: '#16150F' },
  { bg: '#00A86B', a: '#FFCF1F', b: '#FF8FB8', fg: '#16150F', ink: '#16150F' },
  { bg: '#FF8FB8', a: '#2F3BFF', b: '#FFCF1F', fg: '#16150F', ink: '#16150F' },
];

export const pal = c => PALETTES[(c.palette ?? 0) % PALETTES.length];

const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

export function poster(c, { label = true, name = true, ratio = 'tall' } = {}) {
  const p = pal(c);
  const light = p.bg === '#FFCF1F' || p.bg === '#FF8FB8';
  const mb = light ? 'mix-blend-mode:multiply' : '';
  const r = prng(c.id + 'poster');
  const W = 300, H = ratio === 'wide' ? 220 : ratio === 'square' ? 300 : 380;
  const id = 'p' + c.id.replace(/[^a-z0-9]/gi, '') + Math.floor(r() * 1e6);
  const comp = Math.floor(r() * 4);
  const cx = 60 + r() * 180, cy = 70 + r() * (H - 170);
  const R = 90 + r() * 60;
  const rot = Math.floor(r() * 40 - 20);
  const first = esc(c.beneficiary?.first || '');
  const fs = first.length > 6 ? 70 : first.length > 4 ? 84 : 100;

  let shapes = '';
  if (comp === 0) {
    // Sol con rayos + círculo semitono
    let rays = '';
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      rays += `<line x1="${cx + Math.cos(a) * (R * .62)}" y1="${cy + Math.sin(a) * (R * .62)}" x2="${cx + Math.cos(a) * (R * 1.05)}" y2="${cy + Math.sin(a) * (R * 1.05)}"/>`;
    }
    shapes = `
      <circle cx="${cx}" cy="${cy}" r="${R * .5}" fill="${p.a}" style="${mb}"/>
      <g stroke="${p.a}" stroke-width="9" stroke-linecap="round" style="${mb}">${rays}</g>
      <circle cx="${W - cx}" cy="${H - cy}" r="${R * .7}" fill="url(#${id}h)" />`;
  } else if (comp === 1) {
    // Arcos apilados
    let arcs = '';
    for (let i = 0; i < 5; i++) {
      const rr = R * (1.1 - i * .2);
      arcs += `<path d="M ${cx - rr} ${H * .62} A ${rr} ${rr} 0 0 1 ${cx + rr} ${H * .62}" fill="none" stroke="${i % 2 ? p.b : p.a}" stroke-width="16"/>`;
    }
    shapes = `<g style="${mb}">${arcs}</g>
      <rect x="${W * .55}" y="${H * .08}" width="${W * .5}" height="${W * .5}" rx="${W * .25}" fill="url(#${id}h)" transform="rotate(${rot} ${W * .8} ${H * .2})"/>`;
  } else if (comp === 2) {
    // Corazón grande que se sale del cuadro
    const s = 1.6 + r() * .6;
    shapes = `
      <g transform="translate(${cx - 80 * s} ${cy - 70 * s}) scale(${s})" style="${mb}">
        <path d="M80 140S10 100 10 52A35 35 0 0 1 80 34a35 35 0 0 1 70 18c0 48-70 88-70 88z" fill="${p.a}"/>
      </g>
      <circle cx="${W - cx * .6}" cy="${cy * .6 + 20}" r="${R * .55}" fill="url(#${id}h)"/>
      <circle cx="${cx * .4 + 20}" cy="${H - 90}" r="${R * .35}" fill="${p.b}" style="${mb}"/>`;
  } else {
    // Bolas de tómbola
    let balls = '';
    for (let i = 0; i < 6; i++) {
      const bx = 30 + r() * (W - 60), by = 30 + r() * (H - 150), br = 22 + r() * 34;
      balls += `<circle cx="${bx}" cy="${by}" r="${br}" fill="${i % 2 ? p.a : p.b}" style="${mb}"/>`;
    }
    shapes = `${balls}<rect x="-20" y="${H * .55}" width="${W + 40}" height="${H * .2}" fill="url(#${id}h)" transform="rotate(${rot / 2} ${W / 2} ${H * .65})"/>`;
  }

  const photo = c.cover ? `
    <image href="${esc(c.cover)}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice" filter="url(#${id}g)" style="mix-blend-mode:multiply"/>
    <rect width="${W}" height="${H}" fill="url(#${id}h2)" opacity=".5"/>` : '';

  const nameBlock = name ? `
    <g font-family="Fraunces, Georgia, serif" font-style="italic" font-weight="900" font-size="${fs}" letter-spacing="-4" style="font-variation-settings:'SOFT' 100,'WONK' 1,'opsz' 144">
      <text x="18" y="${H - 26}" fill="${p.b}" style="${mb}" transform="translate(4 4)">${first}</text>
      <text x="18" y="${H - 26}" fill="${p.fg}">${first}</text>
    </g>` : '';

  const labelBlock = label ? `
    <g font-family="Archivo, sans-serif" font-weight="800" font-size="11" letter-spacing="1.6" fill="${p.fg}" style="font-variation-settings:'wdth' 110">
      <text x="18" y="30">${esc((CATEGORIES[c.category] || '').toUpperCase())}</text>
      <text x="${W - 18}" y="30" text-anchor="end">${c.beneficiary?.age ? esc(c.beneficiary.age) + ' AÑOS' : ''}</text>
    </g>` : '';

  return `<svg class="poster" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Afiche de la causa de ${first}">
    <defs>
      <pattern id="${id}h" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(${rot})">
        <circle cx="4.5" cy="4.5" r="2.6" fill="${p.b}"/>
      </pattern>
      <pattern id="${id}h2" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <circle cx="3" cy="3" r="1.1" fill="${p.bg}"/>
      </pattern>
      <filter id="${id}g"><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncR type="linear" slope="1.35" intercept="-.12"/><feFuncG type="linear" slope="1.35" intercept="-.12"/><feFuncB type="linear" slope="1.35" intercept="-.12"/></feComponentTransfer></filter>
    </defs>
    <rect width="${W}" height="${H}" fill="${p.bg}"/>
    ${c.cover ? photo : shapes}
    ${labelBlock}
    ${nameBlock}
  </svg>`;
}
