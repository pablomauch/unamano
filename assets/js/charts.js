// Gráficos livianos en SVG/HTML, sin librerías.
// Reglas: marcas finas, extremos redondeados de 4px anclados a la base,
// grilla tenue, etiquetas directas selectivas, leyenda siempre presente
// con más de una serie y tooltip en cada marca.

import { CATEGORIES, clp, clpShort } from './data.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

// Barra con esquinas superiores redondeadas (4px) y base recta
function barPath(x, y, w, h, r = 4) {
  if (h <= 0) return '';
  r = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

function niceMax(v) {
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

export function monthBars(months, { color = '#2a78d6', height = 210, width = 360 } = {}) {
  const W = width, H = height, padL = 40, padB = 26, padT = 12;
  const max = niceMax(Math.max(...months.map(m => m.raised)));
  const n = months.length;
  const slot = (W - padL) / n, bw = Math.min(W > 500 ? 40 : 18, slot * .58);
  const y = v => padT + (H - padT - padB) * (1 - v / max);
  let grid = '';
  for (let i = 0; i <= 2; i++) {
    const v = max * i / 2, yy = y(v);
    grid += `<line class="grid" x1="${padL}" x2="${W}" y1="${yy}" y2="${yy}"/><text class="axis" x="${padL - 6}" y="${yy + 4}" text-anchor="end">${v ? clpShort(v).replace('$', '') : '0'}</text>`;
  }
  const bars = months.map((m, i) => {
    const x = padL + i * slot + (slot - bw) / 2, yy = y(m.raised);
    const last = i === n - 1;
    return `<path class="mk" d="${barPath(x, yy, bw, H - padB - yy)}" fill="${color}" ${last ? '' : 'fill-opacity=".8"'} data-tip="<b>${clp(m.raised)}</b>${esc(m.label)} · ${m.causes} ${m.causes === 1 ? 'causa' : 'causas'}"/>
      ${W > 500 || i % 2 === n % 2 || last ? `<text class="axis" x="${x + bw / 2}" y="${H - 8}" text-anchor="middle">${esc(m.label)}</text>` : ''}`;
  }).join('');
  const lastM = months[n - 1];
  const lx = padL + (n - 1) * slot + slot / 2;
  return `<div class="viz"><svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Recaudación de los últimos ${n} meses">
    ${grid}${bars}
    <text x="${Math.min(lx, W - 4)}" y="${y(lastM.raised) - 8}" text-anchor="end" font-size="12.5" font-weight="800" fill="var(--ink)">${clpShort(lastM.raised)}</text>
  </svg></div>`;
}

export function donut(byCategory, { size = 190, label = 'Total' } = {}) {
  const entries = Object.keys(CATEGORIES).map(k => [k, byCategory[k] || 0]).filter(([, v]) => v > 0);
  const total = entries.reduce((a, [, v]) => a + v, 0);
  const R = 80, r = 54, cx = 100, cy = 100, gap = 0.012;
  let a0 = -Math.PI / 2;
  const segs = entries.map(([k, v]) => {
    const frac = v / total, a1 = a0 + frac * Math.PI * 2;
    const s = a0 + gap, e = a1 - gap, large = e - s > Math.PI ? 1 : 0;
    const p = (ang, rad) => `${cx + Math.cos(ang) * rad},${cy + Math.sin(ang) * rad}`;
    const d = `M${p(s, R)}A${R},${R} 0 ${large} 1 ${p(e, R)}L${p(e, r)}A${r},${r} 0 ${large} 0 ${p(s, r)}Z`;
    a0 = a1;
    const c = CATEGORIES[k];
    return `<path class="mk" d="${d}" fill="${c.color}" data-tip="<b>${c.label}</b>${clp(v)} · ${Math.round(frac * 100)}%"/>`;
  }).join('');
  const legend = entries.sort((a, b) => b[1] - a[1]).map(([k, v]) =>
    `<div><i style="background:${CATEGORIES[k].color}"></i><span>${CATEGORIES[k].label}</span><b>${Math.round(v / total * 100)}%</b></div>`).join('');
  return `<div class="donut-wrap">
    <div class="viz" style="width:${size}px;max-width:100%;flex-shrink:0"><svg viewBox="0 0 200 200" width="100%" role="img" aria-label="Recaudación por tipo de causa">
      ${segs}
      <text x="100" y="94" text-anchor="middle" font-size="12" fill="var(--ink-3)" font-weight="700">${esc(label)}</text>
      <text x="100" y="116" text-anchor="middle" font-size="19" fill="var(--ink)" font-weight="800">${clpShort(total)}</text>
    </svg></div>
    <div class="legend-l">${legend}</div>
  </div>`;
}

export function hbars(rows, { color = '#2a78d6' } = {}) {
  const max = Math.max(...rows.map(r => r.raised));
  return `<div class="hbars">${rows.map(r => `
    <div class="hb" data-tip="<b>${clp(r.raised)}</b>${esc(r.name)}">
      <span class="hb-l">${esc(r.name)}</span>
      <span class="hb-t"><i style="width:${Math.max(2, r.raised / max * 100)}%;background:${color}"></i></span>
      <b class="hb-v num">${clpShort(r.raised)}</b>
    </div>`).join('')}</div>`;
}

export function splitBar(split, { labels = ['Al objetivo de la causa', 'Premio', 'Verificación y operación'] } = {}) {
  const parts = [[split.treatment ?? split.goal, labels[0], 'var(--ok)', '#fff'], [split.prize, labels[1], 'var(--sun)', 'var(--ink)'], [split.ops, labels[2], '#5B6777', '#fff']].filter(p => p[0] > 0);
  return `<div class="split">
    <div class="split-bar" role="img" aria-label="${parts.map(p => `${p[1]} ${p[0]}%`).join(', ')}">${parts.map(p => `<div class="mk" style="flex:${p[0]};background:${p[2]};color:${p[3]}" data-tip="<b>${p[0]}%</b>${esc(p[1])}">${p[0]}%</div>`).join('')}</div>
    <div class="legend-l" style="margin-top:.9rem">${parts.map(p => `<div><i style="background:${p[2]}"></i><span>${esc(p[1])}</span><b>$${(p[0] * 10).toLocaleString('es-CL')}</b></div>`).join('')}</div>
    <p class="split-note">De cada $1.000</p>
  </div>`;
}

// Tooltip compartido para cualquier [data-tip] (mouse y toque)
let tip;
export function bindTooltips(root = document) {
  if (!tip) { tip = document.createElement('div'); tip.className = 'vtip'; tip.setAttribute('role', 'status'); document.body.append(tip); }
  const show = (el, x, y) => { tip.innerHTML = el.getAttribute('data-tip'); tip.style.left = x + 'px'; tip.style.top = y + 'px'; tip.classList.add('on'); };
  const hide = () => tip.classList.remove('on');
  root.addEventListener('pointermove', e => {
    const el = e.target.closest?.('[data-tip]');
    if (el && e.pointerType === 'mouse') show(el, e.clientX, e.clientY); else if (e.pointerType === 'mouse') hide();
  });
  root.addEventListener('pointerleave', hide);
  root.addEventListener('click', e => {
    const el = e.target.closest?.('[data-tip]');
    if (!el) return hide();
    const b = el.getBoundingClientRect();
    show(el, b.left + b.width / 2, b.top);
    clearTimeout(tip._t); tip._t = setTimeout(hide, 2500);
  });
  addEventListener('scroll', hide, { passive: true });
}

// Contador animado
export function countUp(el, to, fmt = v => Math.round(v).toLocaleString('es-CL'), ms = 1200) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = fmt(to); return; }
  const t0 = performance.now();
  const step = t => { const k = Math.min(1, (t - t0) / ms); el.textContent = fmt(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
