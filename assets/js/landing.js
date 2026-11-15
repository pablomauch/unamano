import * as db from './data.js';
import { clp } from './data.js';
import { poster } from './poster.js';
import { icon, logo, wordmark, stamp } from './icons.js';
import * as pwa from './pwa.js';

pwa.registerSW('sw.js');

const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

// Piezas SVG
$$('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon, +el.dataset.size || 22, +el.dataset.sw || 2); });
$$('[data-logo]').forEach(el => { el.innerHTML = logo(+el.dataset.logo); });
$$('[data-wordmark]').forEach(el => { el.outerHTML = wordmark(+el.dataset.wordmark, el.dataset.color || 'currentColor'); });
$$('[data-stamp]').forEach(el => { el.innerHTML = stamp({ size: 400 }); });
$$('[data-thunk]').forEach(el => el.classList.add('thunk'));

// Marquesina
const words = ['Causa verificada', 'Pago directo a la clínica', 'Devolución garantizada', 'Sorteo auditable', 'Hecho en Chile'];
const star = icon('star', 26, 2.6).replace('fill="none"', 'fill="currentColor"');
const chunk = words.map(w => `<span>${w} ${star}</span>`).join('');
document.getElementById('marquee').innerHTML = chunk + chunk + chunk + chunk;

// Causas reales del store (las mismas que ve la app)
const live = db.causes({ status: 'live' }).sort((a, b) => a.drawAt - b.drawAt).slice(0, 4);
document.getElementById('cgrid').innerHTML = live.map((c, i) => {
  const s = db.stats(c);
  return `<a class="cc" href="app/#/causa/${c.id}" data-reveal style="--dl:${i * .08}s">
    <div class="cc-art">${poster(c)}<span class="st2">${stamp({ size: 90 }).replace('<svg', '<svg class="stamp"')}</span></div>
    <div class="cc-stub">
      <span class="cc-t">${esc(c.title)}</span>
      <div class="bar"><i style="--p:${Math.max(3, s.pct)}%;--bar:var(--blue)"></i></div>
      <div class="cc-m"><span><b>${clp(s.raised)}</b> de ${clp(c.goal)}</span><span>${db.timeLeft(s.ms)}</span></div>
    </div>
  </a>`;
}).join('');

// Revelado al hacer scroll
const io = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    if (e.target.matches('.big-stamp')) e.target.querySelector('.stamp').classList.add('thunk');
    io.unobserve(e.target);
  });
}, { threshold: .18 });
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
  if (r === 'ios') alertBox('En tu iPhone: abre esta página en Safari, toca Compartir y elige «Agregar a pantalla de inicio».');
  else if (r === 'none') {
    if (pwa.isStandalone()) alertBox('Ya tienes unamano instalada.');
    else alertBox('Abre el menú de tu navegador y elige «Instalar app» o «Agregar a pantalla de inicio». En computador, busca el ícono de instalar en la barra de direcciones.');
  }
});

function alertBox(msg) {
  const d = document.createElement('div');
  d.setAttribute('role', 'status');
  d.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:100;max-width:min(460px,calc(100% - 28px));background:var(--ink);color:#fff;padding:16px 18px;border-radius:16px;font-weight:600;box-shadow:5px 5px 0 var(--yellow)';
  d.textContent = msg;
  document.body.append(d);
  setTimeout(() => d.remove(), 6000);
}
