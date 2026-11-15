import * as db from './data.js';
import { CATEGORIES, STORIES, clp, clpShort } from './data.js';
import { photo, catTag, verifiedPill, seal } from './media.js';
import { icon, logo, wordmark } from './icons.js';
import { monthBars, donut, hbars, splitBar, bindTooltips, countUp } from './charts.js';
import * as pwa from './pwa.js';

pwa.registerSW('sw.js');

const $ = s => document.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
const plural = (n, a, b) => `${n.toLocaleString('es-CL')} ${n === 1 ? a : b}`;

$$('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon, +el.dataset.size || 22, +el.dataset.sw || 2); });
$$('[data-logo]').forEach(el => { el.innerHTML = logo(+el.dataset.logo); });
$$('[data-wordmark]').forEach(el => { el.outerHTML = wordmark(+el.dataset.wordmark); });
$$('[data-seal]').forEach(el => { el.outerHTML = seal(54); });
$$('[data-photo]').forEach(el => {
  const tmp = document.createElement('div');
  tmp.innerHTML = photo({ category: el.dataset.cat, photo: el.dataset.photo }, { w: 900, cls: el.className.replace(/\bph\b/, '').trim() });
  const node = tmp.firstElementChild;
  if (el.hasAttribute('data-reveal')) node.setAttribute('data-reveal', '');
  el.replaceWith(node);
});

const im = db.impact();

// Hero: total + mini barras
countUp($('#heroTotal'), im.raised, v => clpShort(v), 1600);
$('#heroSpark').innerHTML = `<div class="spark">${im.months.map((m, i) => `<i style="height:${Math.max(8, m.raised / Math.max(...im.months.map(x => x.raised)) * 100)}%;opacity:${.45 + i / im.months.length * .55}"></i>`).join('')}</div>`;

// KPIs
$('#kpis').innerHTML = [
  ['coins', im.raised, 'reunidos para causas sociales', v => clpShort(v)],
  ['check', im.completed, 'causas cumplidas'],
  ['users', im.people, 'personas beneficiadas'],
  ['people', im.orgs, 'organizaciones de base'],
].map(([ic, v, l]) => `<div class="bk"><span class="ic">${icon(ic, 22, ic === 'check' ? 2.6 : 2)}</span><b class="num" data-to="${v}">0</b><span>${l}</span></div>`).join('');
const fmts = [v => clpShort(v), v => Math.round(v).toLocaleString('es-CL'), v => Math.round(v).toLocaleString('es-CL'), v => Math.round(v).toLocaleString('es-CL')];
new IntersectionObserver(([e], o) => {
  if (!e.isIntersecting) return;
  $$('#kpis [data-to]').forEach((el, i) => countUp(el, +el.dataset.to, fmts[i]));
  o.disconnect();
}, { threshold: .3 }).observe($('#kpis'));

// Gráficos
$('#chMonths').innerHTML = monthBars(im.months, { width: 1000, height: 280 });
$('#chCats').innerHTML = donut(im.byCategory, { label: 'Total' });
$('#chSplit').innerHTML = splitBar(im.split);
$('#chRegions').innerHTML = hbars(im.byRegion);
bindTooltips(document);

// Tipos de causa
const EXAMPLES = {
  salud: ['Cirugías, tratamientos y ayudas médicas que no pueden esperar.', 'Ej: una prótesis de rodilla'],
  educacion: ['Equipamiento, becas y mejoras para escuelas y estudiantes.', 'Ej: computadores para un curso'],
  vivienda: ['Reparaciones y mejoras para que una familia viva con dignidad.', 'Ej: un techo nuevo'],
  emergencia: ['Respuesta rápida después de incendios, temporales y otras catástrofes.', 'Ej: materiales para reconstruir'],
  inclusion: ['Ayudas técnicas y accesibilidad para personas con discapacidad.', 'Ej: una silla de ruedas a medida'],
  comunidad: ['Espacios y proyectos que mejoran la vida del barrio.', 'Ej: luz para la cancha'],
};
$('#catgrid').innerHTML = Object.entries(CATEGORIES).map(([k, v], i) => `
  <div class="ct" style="background:${v.tint};--dl:${i * .05}s" data-reveal>
    <i style="background:${v.color}">${icon(v.icon, 22, 2.2)}</i>
    <b>${v.label}</b><p>${EXAMPLES[k][0]}</p><small>${EXAMPLES[k][1]}</small>
  </div>`).join('');

// Historias cumplidas
const done = db.causes({ status: 'drawn' }).map(c => ({ title: c.title, category: c.category, amount: c.result.raised, when: new Date(c.result.at).toLocaleDateString('es-CL', { day: 'numeric', month: 'long' }), people: c.beneficiary.people || 1, photo: c.photo, outcome: c.outcome || 'Meta cumplida y pago realizado al proveedor.', href: 'app/#/sorteo/' + c.id }));
$('#sgrid').innerHTML = [...done, ...STORIES].slice(0, 4).map(s => `
  <${s.href ? `a href="${s.href}"` : 'div'} class="story" data-reveal>
    <div style="position:relative">${photo({ category: s.category, photo: s.photo }, { w: 600 })}<span class="done-badge">${icon('check', 14, 3)} Cumplida · ${esc(s.when)}</span></div>
    <div class="story-b">${catTag(s.category)}<b>${esc(s.title)}</b><p>${esc(s.outcome)}</p>
      <div class="story-m"><span><b class="num">${clp(s.amount)}</b> reunidos</span><span>${plural(s.people, 'persona', 'personas')}</span></div></div>
  </${s.href ? 'a' : 'div'}>`).join('');

// Causas activas
const live = db.causes({ status: 'live' }).sort((a, b) => a.drawAt - b.drawAt).slice(0, 3);
$('#cgrid').innerHTML = live.map((c, i) => {
  const s = db.stats(c);
  const k = CATEGORIES[c.category];
  return `<a class="cc" href="app/#/causa/${c.id}" data-reveal style="--dl:${i * .08}s">
    <div style="position:relative">${photo(c, { w: 700 })}<div class="cc-top">${catTag(c.category)}<span class="cc-time">${db.timeLeft(s.ms)}</span></div></div>
    <div class="cc-b"><span class="cc-t">${esc(c.title)}</span><span class="cc-o">${esc(c.organizer.name)} · ${esc(c.beneficiary.comuna)}</span>
      <div class="bar"><i style="--p:${Math.max(3, s.pct)}%;--c:${k.color}"></i></div>
      <div class="cc-m"><span><b class="num">${clp(s.raised)}</b> de ${clp(c.goal)}</span><b class="num">${Math.floor(s.pct)}%</b></div></div>
  </a>`;
}).join('');

// Nav y revelado
const nav = $('#nav');
addEventListener('scroll', () => nav.classList.toggle('scrolled', scrollY > 10), { passive: true });
const io = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 });
$$('[data-reveal]').forEach(el => io.observe(el));

// Instalar
$('#installBtn').addEventListener('click', async () => {
  const r = await pwa.install();
  if (r === 'ios') note('En tu iPhone: abre esta página en Safari, toca Compartir y elige «Agregar a pantalla de inicio».');
  else if (r === 'none') note(pwa.isStandalone() ? 'Ya tienes unamano instalada.' : 'Abre el menú de tu navegador y elige «Instalar app» o «Agregar a pantalla de inicio».');
});
function note(msg) {
  const d = document.createElement('div');
  d.setAttribute('role', 'status');
  d.style.cssText = 'position:fixed;left:50%;bottom:1.5rem;transform:translateX(-50%);z-index:100;max-width:min(30rem,calc(100% - 2rem));background:var(--ink);color:#fff;padding:.9rem 1.1rem;border-radius:1rem;font-weight:700;box-shadow:var(--sh-2)';
  d.textContent = msg; document.body.append(d); setTimeout(() => d.remove(), 6000);
}
