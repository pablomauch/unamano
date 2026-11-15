import * as db from './data.js';
import { clp } from './data.js';
import { photo, verifiedPill, seal } from './media.js';
import { icon, logo, wordmark } from './icons.js';
import * as pwa from './pwa.js';

pwa.registerSW('sw.js');

const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

// Piezas SVG
$$('[data-icon]').forEach(el => {
  let svg = icon(el.dataset.icon, +el.dataset.size || 22, +el.dataset.sw || 2);
  if ('fill' in el.dataset) svg = svg.replace('fill="none"', 'fill="currentColor"');
  el.innerHTML = svg;
});
$$('[data-logo]').forEach(el => { el.innerHTML = logo(+el.dataset.logo); });
$$('[data-wordmark]').forEach(el => { el.outerHTML = wordmark(+el.dataset.wordmark); });
$$('[data-vpill]').forEach(el => { el.outerHTML = verifiedPill(); });
$$('[data-seal]').forEach(el => { el.outerHTML = seal(64); });

// Fotos estáticas, con respaldo si no cargan
$$('[data-photo]').forEach(el => {
  el.innerHTML = `<span class="ph-fb" style="background:var(--brand-50);color:var(--brand)"><span>${esc(el.dataset.fb || '')}</span></span>
    <img src="${el.dataset.photo}?auto=format&fit=crop&w=900&q=70" alt="" loading="lazy" decoding="async" onerror="this.remove()">`;
});

// Causas reales del store (las mismas que ve la app)
const live = db.causes({ status: 'live' }).sort((a, b) => a.drawAt - b.drawAt).slice(0, 4);
document.getElementById('cgrid').innerHTML = live.map((c, i) => {
  const s = db.stats(c);
  return `<a class="cc" href="app/#/causa/${c.id}" data-reveal style="--dl:${i * .08}s">
    <div style="position:relative">${photo(c, { w: 600 })}<div class="cc-top">${verifiedPill()}<span class="cc-time">${db.timeLeft(s.ms)}</span></div></div>
    <div class="cc-b">
      <span class="cc-t">${esc(c.title)}</span>
      <span class="cc-o">${esc(c.organizer.name)}</span>
      <div class="bar"><i style="--p:${Math.max(3, s.pct)}%"></i></div>
      <div class="cc-m"><span><b>${clp(s.raised)}</b> de ${clp(c.goal)}</span><span class="pc">${Math.floor(s.pct)}%</span></div>
    </div>
  </a>`;
}).join('');

// Nav con borde al hacer scroll
const nav = document.getElementById('nav');
addEventListener('scroll', () => nav.classList.toggle('scrolled', scrollY > 10), { passive: true });

// Revelado al hacer scroll
const io = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
}, { threshold: .15 });
$$('[data-reveal]').forEach(el => io.observe(el));

// Barra de la plata
const mbar = document.getElementById('mbar');
new IntersectionObserver(([e], o) => {
  if (!e.isIntersecting) return;
  $$('[data-w]', mbar).forEach(d => { d.style.width = d.dataset.w + '%'; });
  o.disconnect();
}, { threshold: .4 }).observe(mbar);

// Instalar
document.getElementById('installBtn').addEventListener('click', async () => {
  const r = await pwa.install();
  if (r === 'ios') note('En tu iPhone: abre esta página en Safari, toca Compartir y elige «Agregar a pantalla de inicio».');
  else if (r === 'none') note(pwa.isStandalone() ? 'Ya tienes unamano instalada.' : 'Abre el menú de tu navegador y elige «Instalar app» o «Agregar a pantalla de inicio».');
});

function note(msg) {
  const d = document.createElement('div');
  d.setAttribute('role', 'status');
  d.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:100;max-width:min(460px,calc(100% - 28px));background:var(--ink);color:#fff;padding:14px 18px;border-radius:16px;font-weight:600;box-shadow:var(--sh-2)';
  d.textContent = msg;
  document.body.append(d);
  setTimeout(() => d.remove(), 6000);
}
