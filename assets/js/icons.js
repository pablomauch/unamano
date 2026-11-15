// Íconos de trazo propios + logo + timbre. Todo SVG inline.

const P = {
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5M8 7h7M8 11h5"/>',
  access: '<circle cx="12" cy="4.5" r="2"/><path d="M5 8.5 12 10l7-1.5M12 10v5l-3 6M12 15l3 6"/>',
  textsize: '<path d="M3 19 8 6l5 13M4.8 14.5h6.4M14 19l3.5-9 3.5 9M15.2 16h4.6"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.6"/><path d="M16 14.2a5 5 0 0 1 6 4.8"/>',
  coins: '<ellipse cx="9" cy="7" rx="6" ry="3"/><path d="M3 7v5c0 1.7 2.7 3 6 3s6-1.3 6-3V7"/><path d="M9 15v2c0 1.7 2.7 3 6 3s6-1.3 6-3v-5c0-1.7-2.7-3-6-3"/>',
  back: '<path d="m15 18-6-6 6-6"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  share: '<path d="M12 3v13M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  ticket: '<path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4z"/><path d="M14 6v12" stroke-dasharray="2 2.6"/>',
  heart: '<path d="M12 20s-7.5-4.4-7.5-10A4.2 4.2 0 0 1 12 7.6 4.2 4.2 0 0 1 19.5 10c0 5.6-7.5 10-7.5 10z"/>',
  home: '<path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  more: '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
  grid: '<rect x="4" y="4" width="6" height="6" rx="1.5"/><rect x="14" y="4" width="6" height="6" rx="1.5"/><rect x="4" y="14" width="6" height="6" rx="1.5"/><rect x="14" y="14" width="6" height="6" rx="1.5"/>',
  shield: '<path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5z"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
  check: '<path d="m5 12 5 5 9-10"/>',
  clinic: '<path d="M3 21h18M5 21V9l7-5 7 5v12"/><path d="M12 10v6M9 13h6"/>',
  dice: '<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8.5" cy="8.5" r="1.2" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  gift: '<rect x="3" y="8" width="18" height="13" rx="2"/><path d="M12 8v13M3 12h18M7.5 8a2.5 2.5 0 1 1 4.5-1.5A2.5 2.5 0 1 1 16.5 8"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5M5 20h14"/>',
  phone: '<rect x="7" y="2" width="10" height="20" rx="2.5"/><path d="M11 18h2"/>',
  video: '<rect x="2" y="6" width="14" height="12" rx="2"/><path d="m16 10 6-3v10l-6-3"/>',
  doc: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>',
  id: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2.2"/><path d="M5.5 16.5a3.6 3.6 0 0 1 7 0M14 10h4M14 13.5h3"/>',
  steth: '<path d="M6 3v6a5 5 0 0 0 10 0V3"/><path d="M11 14v2a4 4 0 0 0 8 0v-2"/><circle cx="19" cy="12" r="2"/>',
  people: '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M17 4a4 4 0 0 1 0 8M22 21a7 7 0 0 0-4-6.3"/>',
  refresh: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  spark: '<path d="M12 2v6M12 16v6M2 12h6M16 12h6M5 5l3.5 3.5M15.5 15.5 19 19M19 5l-3.5 3.5M8.5 15.5 5 19"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  alert: '<path d="M12 3 2 21h20z"/><path d="M12 10v4M12 17.5v.5"/>',
  hash: '<path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18"/>',
  star: '<path d="m12 3 2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/>',
  hand: '<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11M11 10V4.5a1.5 1.5 0 0 1 3 0V11M14 10.5V6a1.5 1.5 0 0 1 3 0v7c0 4.4-2.8 8-7 8-2.6 0-4.2-1.3-5.6-3.4L2.8 15a1.6 1.6 0 0 1 2.6-1.8L8 15"/>',
};

export function icon(name, size = 22, sw = 2) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${P[name] || ''}</svg>`;
}

// Logo: ticket verde con corazón; el corazón lleva un punto de sol.
export function logo(size = 36) {
  const id = 'lg' + Math.random().toString(36).slice(2, 7);
  return `<svg width="${size}" height="${size}" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
    <defs><mask id="${id}"><rect width="48" height="48" fill="#fff"/><circle cx="2" cy="24" r="5" fill="#000"/><circle cx="46" cy="24" r="5" fill="#000"/></mask></defs>
    <rect x="2" y="6" width="44" height="36" rx="11" fill="#0E7A5F" mask="url(#${id})"/>
    <path d="M24 34.5s-9-5.2-9-11.3a4.8 4.8 0 0 1 9-2.4 4.8 4.8 0 0 1 9 2.4c0 6.1-9 11.3-9 11.3z" fill="#fff"/>
    <circle cx="35.5" cy="13.5" r="3.6" fill="#FFC845"/>
  </svg>`;
}

export function wordmark(size = 22, color = 'currentColor') {
  return `<span class="wordmark" style="font-family:var(--f-sans);font-weight:800;font-size:${size}px;letter-spacing:-.03em;color:${color};line-height:1">una<span style="color:#0E7A5F">mano</span></span>`;
}

// Timbre de goma con borde irregular. Texto en arco arriba y abajo.
export function stamp({ top = 'CAUSA VERIFICADA', bottom = '· UNAMANO ·', center = 'OK', size = 140 } = {}) {
  const id = 's' + Math.random().toString(36).slice(2, 8);
  return `<svg viewBox="0 0 200 200" width="${size}" height="${size}" role="img" aria-label="${top}">
    <defs>
      <filter id="${id}f" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency=".06" numOctaves="2" seed="7" result="t"/>
        <feDisplacementMap in="SourceGraphic" in2="t" scale="4"/>
        <feComponentTransfer><feFuncA type="discrete" tableValues="0 1 1 1 1 1 1 0.85 1"/></feComponentTransfer>
      </filter>
      <path id="${id}a" d="M 100,100 m -72,0 a 72,72 0 1,1 144,0"/>
      <path id="${id}b" d="M 100,100 m -80,0 a 80,80 0 0,0 160,0"/>
    </defs>
    <g filter="url(#${id}f)" fill="none" stroke="currentColor">
      <circle cx="100" cy="100" r="94" stroke-width="7"/>
      <circle cx="100" cy="100" r="58" stroke-width="3"/>
      <text font-family="Archivo, sans-serif" font-weight="900" font-size="15.5" letter-spacing="2.2" fill="currentColor" stroke="none" style="font-variation-settings:'wdth' 110">
        <textPath href="#${id}a" startOffset="50%" text-anchor="middle">${top}</textPath>
      </text>
      <text font-family="Archivo, sans-serif" font-weight="800" font-size="14" letter-spacing="3" fill="currentColor" stroke="none">
        <textPath href="#${id}b" startOffset="50%" text-anchor="middle">${bottom}</textPath>
      </text>
      <path d="m72 102 18 18 38-42" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
  </svg>`;
}
