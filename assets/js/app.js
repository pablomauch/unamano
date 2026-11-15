// unamano — app (SPA con router por hash)
import * as db from './data.js';
import { CATEGORIES, CHECKS, ORG_TYPES, STORIES, clp, clpShort, pad, computePlan, OPS_PCT, catLabel } from './data.js';
import { photo, catTag, verifiedPill, seal } from './media.js';
import { icon, logo, wordmark } from './icons.js';
import { monthBars, donut, hbars, splitBar, bindTooltips, countUp } from './charts.js';
import { sha256, pickWinner } from './crypto.js';
import * as pwa from './pwa.js';

pwa.registerSW('../sw.js');

// ---------- utilidades ----------
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
const view = $('#view');
const ADMIN = document.body.classList.contains('admin-mode');
const HOME = ADMIN ? '#/admin' : '#/';
let cleanup = [];
const onLeave = fn => cleanup.push(fn);
const go = h => { location.hash = h; };
const fmtDate = ts => new Date(ts).toLocaleDateString('es-CL', { day: 'numeric', month: 'long' });
const fmtDateTime = ts => new Date(ts).toLocaleString('es-CL', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
const plural = (n, a, b) => `${n.toLocaleString('es-CL')} ${n === 1 ? a : b}`;
const who = c => c.beneficiary.age ? `${c.beneficiary.first}, ${c.beneficiary.age} años` : c.beneficiary.name;

// Tamaño de letra
const SIZES = ['m', 'l', 'xl'];
const applySize = () => { document.documentElement.dataset.size = db.prefs().size || 'm'; };
applySize();

function toast(msg, kind = '') {
  const t = document.createElement('div');
  t.className = 'toast ' + kind; t.textContent = msg; t.setAttribute('role', 'status');
  $('#toast-root').append(t);
  setTimeout(() => { t.style.transition = 'opacity .3s'; t.style.opacity = 0; setTimeout(() => t.remove(), 300); }, 3000);
}

function sheet(html, { onOpen } = {}) {
  const root = $('#sheet-root');
  root.innerHTML = `<div class="sheet-bg" data-close></div><div class="sheet" role="dialog" aria-modal="true">${html}</div>`;
  const prev = document.activeElement;
  const close = () => { root.innerHTML = ''; document.removeEventListener('keydown', onKey); prev?.focus?.(); };
  const onKey = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  root.onclick = e => { if (e.target.closest('[data-close]')) close(); };
  const s = $('.sheet', root);
  s.querySelector('button, a, input')?.focus({ preventScroll: true });
  onOpen?.(s, close);
  return close;
}

const cart = {
  get() { try { return JSON.parse(sessionStorage.getItem('unamano:cart')) || null; } catch { return null; } },
  set(v) { sessionStorage.setItem('unamano:cart', JSON.stringify(v)); },
  clear() { sessionStorage.removeItem('unamano:cart'); },
};

function confetti(el, n = 60) {
  const box = document.createElement('div'); box.className = 'confetti'; box.setAttribute('aria-hidden', 'true');
  const cols = ['#FFC23D', '#2a78d6', '#eb6834', '#1baf7a', '#e87ba4', '#0E7A5F'];
  for (let i = 0; i < n; i++) {
    const p = document.createElement('i');
    if (i % 3 === 0) p.className = 'ball';
    p.style.left = Math.random() * 100 + '%';
    p.style.background = cols[i % cols.length];
    p.style.setProperty('--dx', (Math.random() * 160 - 80) + 'px');
    p.style.setProperty('--r', (Math.random() * 900 - 450) + 'deg');
    p.style.animationDuration = 2.4 + Math.random() * 2.2 + 's';
    p.style.animationDelay = Math.random() * .5 + 's';
    box.append(p);
  }
  el.append(box);
  setTimeout(() => box.remove(), 6000);
}

const progress = (pct, color) => `<div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct)}" aria-label="Avance hacia la meta"><i style="--p:${Math.max(3, pct)}%;${color ? `--c:${color}` : ''}"></i></div>`;

function topbar(title = '') {
  return `<header class="topbar">
    <a class="brand" href="#/" aria-label="unamano, inicio">${logo(34)}${wordmark(23)}</a>
    ${title ? `<span class="topbar-t">${title}</span>` : ''}
    <div class="topbar-r">
      <button class="icon-btn" data-size-toggle aria-label="Cambiar tamaño de letra">${icon('textsize', 22)}</button>
      <button class="icon-btn" data-more aria-label="Más opciones">${icon('more', 22)}</button>
    </div>
  </header>`;
}

function subbar(back, small, title, right = '') {
  return `<header class="subbar"><a href="${back}" class="icon-btn" aria-label="Volver">${icon('back')}</a>
    <div class="subbar-t">${small ? `<small>${small}</small>` : ''}<h1>${title}</h1></div>${right}</header>`;
}

document.addEventListener('click', e => {
  if (e.target.closest('[data-install]')) { e.preventDefault(); doInstall(); }
  if (e.target.closest('[data-more]')) { e.preventDefault(); openMore(); }
  if (e.target.closest('[data-size-toggle]')) {
    const cur = db.prefs().size || 'm';
    const next = SIZES[(SIZES.indexOf(cur) + 1) % SIZES.length];
    db.setPref('size', next); applySize();
    toast(next === 'm' ? 'Letra normal' : next === 'l' ? 'Letra grande' : 'Letra muy grande');
  }
});

async function doInstall() {
  const r = await pwa.install();
  if (r === 'ios') {
    sheet(`<h2>Instala unamano en tu iPhone</h2>
      <p>Queda en tu pantalla de inicio, como cualquier aplicación.</p>
      <ol class="ios-steps">
        <li>Abre esta página en Safari.</li>
        <li>Toca el botón Compartir ${icon('share', 18)}.</li>
        <li>Elige «Agregar a pantalla de inicio».</li>
        <li>Toca «Agregar».</li>
      </ol>
      <button class="btn btn-block btn-l" data-close>Entendido</button>`);
  } else if (r === 'none') toast('Abre el menú del navegador y elige «Instalar app» o «Agregar a pantalla de inicio».');
}

function openMore() {
  const size = db.prefs().size || 'm';
  sheet(`<h2>Opciones</h2>
    <div class="size-pick" role="group" aria-label="Tamaño de letra">
      <span>Tamaño de letra</span>
      <div>${SIZES.map((s, i) => `<button data-sz="${s}" aria-pressed="${s === size}" style="font-size:${1 + i * .2}rem">A</button>`).join('')}</div>
    </div>
    <ul class="menu">
      ${pwa.canInstall() ? `<li><button data-install><span class="mi">${icon('download')}</span><span>Instalar la app<small>Queda en tu pantalla de inicio</small></span></button></li>` : ''}
      <li><a href="#/postular" data-go><span class="mi">${icon('hand')}</span><span>Mis postulaciones<small>Revisa en qué va tu causa</small></span></a></li>
      <li><a href="../" data-go><span class="mi">${icon('heart')}</span><span>Qué es unamano<small>Cómo funciona y preguntas frecuentes</small></span></a></li>
      <li><a href="../admin/" data-go><span class="mi">${icon('shield')}</span><span>Panel de administración<small>Para el equipo · PIN de prueba 1234</small></span></a></li>
      <li><button data-reset><span class="mi">${icon('refresh')}</span><span>Reiniciar la demostración<small>Borra compras y postulaciones de este teléfono</small></span></button></li>
    </ul>`, {
    onOpen: (s, close) => {
      $$('[data-sz]', s).forEach(b => b.addEventListener('click', () => { db.setPref('size', b.dataset.sz); applySize(); $$('[data-sz]', s).forEach(x => x.setAttribute('aria-pressed', x === b)); }));
      $('[data-reset]', s).addEventListener('click', () => { db.reset(); cart.clear(); close(); toast('Demostración reiniciada'); route(); });
      $$('[data-go]', s).forEach(a => a.addEventListener('click', () => setTimeout(close, 0)));
    },
  });
}

function shareCause(c) {
  const url = new URL(`#/causa/${c.id}`, location.href).href;
  const data = { title: c.title, text: `${c.title}. Rifa solidaria verificada en unamano.`, url };
  if (navigator.share) navigator.share(data).catch(() => {});
  else navigator.clipboard?.writeText(url).then(() => toast('Enlace copiado'), () => toast(url));
}

// =====================================================================
// INICIO: IMPACTO
// =====================================================================
function viewImpact() {
  const im = db.impact();
  const live = db.causes({ status: 'live' }).sort((a, b) => a.drawAt - b.drawAt);
  const done = db.causes({ status: 'drawn' });
  const feed = db.activity();
  const stories = [
    ...done.map(c => ({ title: c.title, category: c.category, amount: c.result.raised, provider: c.provider.name, when: fmtDate(c.result.at), people: c.beneficiary.people || 1, cause: c, outcome: c.outcome || 'Meta cumplida y pago realizado al proveedor.' })),
    ...STORIES,
  ];
  view.innerHTML = `
    ${topbar()}
    <section class="ih">
      <div class="ih-collage" aria-hidden="true">
        ${photo({ category: 'comunidad', photo: 'https://images.unsplash.com/photo-1768244016879-a0f41e01281c' }, { w: 700, cls: 'c1' })}
        ${photo({ category: 'educacion', photo: 'https://images.unsplash.com/photo-1473649085228-583485e6e4d7' }, { w: 500, cls: 'c2' })}
        ${photo({ category: 'salud', photo: 'https://images.unsplash.com/photo-1758686253896-e6c76b6f7aa1' }, { w: 500, cls: 'c3' })}
      </div>
      <span class="eyebrow">Lo que logramos juntos</span>
      <h1>Cada número <span class="mark">suma</span>.</h1>
      <p>Rifas solidarias organizadas por la comunidad, verificadas una por una. Aquí puedes ver en qué se convirtió cada aporte.</p>
      <span class="demo-tag">${icon('alert', 15)} Cifras de demostración</span>
    </section>

    <section class="kpis" aria-label="Resumen de impacto">
      <div class="kpi k1"><span class="kpi-ic">${icon('coins', 22)}</span><b class="num" data-count="${im.raised}" data-fmt="money">${clpShort(im.raised)}</b><span>reunidos para causas sociales</span></div>
      <div class="kpi k2"><span class="kpi-ic">${icon('check', 22, 2.6)}</span><b class="num" data-count="${im.completed}">${im.completed}</b><span>causas cumplidas</span></div>
      <div class="kpi k3"><span class="kpi-ic">${icon('users', 22)}</span><b class="num" data-count="${im.people}">${im.people.toLocaleString('es-CL')}</b><span>personas beneficiadas</span></div>
      <div class="kpi k4"><span class="kpi-ic">${icon('people', 22)}</span><b class="num" data-count="${im.orgs}">${im.orgs}</b><span>organizaciones de base</span></div>
    </section>

    <a class="live-cta" href="#/causas">
      <span class="pulse"></span>
      <div><b>${plural(im.live, 'causa necesita', 'causas necesitan')} apoyo hoy</b><span>Elige una y compra tu número</span></div>
      <span class="arr">${icon('arrow', 22)}</span>
    </a>

    <section class="panel">
      <div class="panel-h"><h2>Recaudación mes a mes</h2><span>Últimos 12 meses</span></div>
      ${monthBars(im.months)}
      <p class="panel-f">Toca una barra para ver el detalle del mes.</p>
    </section>

    <section class="panel">
      <div class="panel-h"><h2>En qué se usan los aportes</h2><span>Por tipo de causa</span></div>
      ${donut(im.byCategory, { label: 'Total' })}
    </section>

    <section class="panel">
      <div class="panel-h"><h2>A dónde va cada $1.000</h2><span>Promedio de todas las rifas</span></div>
      ${splitBar(im.split)}
      <p class="panel-f">El pago se hace directo al proveedor: la clínica, el colegio o la ferretería. Nunca a una cuenta personal.</p>
    </section>

    <section class="panel">
      <div class="panel-h"><h2>Dónde está el impacto</h2><span>Recaudación por región</span></div>
      ${hbars(im.byRegion)}
    </section>

    <section>
      <div class="sec-t"><h2>Causas cumplidas</h2><a href="#/causas">Ver causas activas</a></div>
      <div class="rail">${stories.map(storyCard).join('')}</div>
    </section>

    <section class="panel feed">
      <div class="panel-h"><h2>Ahora mismo</h2><span><i class="live-dot"></i> En vivo</span></div>
      <ul>${feed.map(f => `<li>
        <span class="fd-ic" style="background:${CATEGORIES[f.cause.category].tint};color:${CATEGORIES[f.cause.category].color}">${icon(CATEGORIES[f.cause.category].icon, 18)}</span>
        <div><b>${esc(f.who)}</b> ${f.mine ? 'compraste' : 'compró'} ${plural(f.n, 'número', 'números')} para <a href="#/causa/${f.cause.id}">${esc(f.cause.title)}</a><small>${f.mins < 1 ? 'recién' : `hace ${f.mins} min`}</small></div>
      </li>`).join('')}</ul>
    </section>

    <section class="trio">
      <div><span>${icon('shield', 22)}</span><b>Cada causa es verificada</b><p>Identidad, necesidad, respaldo profesional, presupuesto y organización.</p></div>
      <div><span>${icon('clinic', 22)}</span><b>Pago directo al proveedor</b><p>La plata no pasa por manos de particulares.</p></div>
      <div><span>${icon('refresh', 22)}</span><b>Si no se llega, se devuelve</b><p>El 100% vuelve a quien compró, automáticamente.</p></div>
    </section>

    <a class="apply-cta" href="#/postular">
      <div><b>¿Tu comunidad necesita apoyo?</b><span>Postula una causa junto a tu junta de vecinos, club o centro de padres.</span></div>
      <span class="arr">${icon('arrow', 22)}</span>
    </a>`;
  $$('[data-count]').forEach(el => {
    const to = +el.dataset.count;
    countUp(el, to, el.dataset.fmt === 'money' ? v => clpShort(v) : v => Math.round(v).toLocaleString('es-CL'));
  });
}

function storyCard(s) {
  const k = CATEGORIES[s.category];
  const inner = `
    <div style="position:relative">${photo({ category: s.category, photo: s.cause?.photo || s.photo, beneficiary: s.cause?.beneficiary }, { w: 600 })}
      <span class="done-badge">${icon('check', 14, 3)} Cumplida · ${esc(s.when)}</span></div>
    <div class="story-b">
      ${catTag(s.category)}
      <b>${esc(s.title)}</b>
      <p>${esc(s.outcome)}</p>
      <div class="story-m"><span><b class="num">${clp(s.amount)}</b> reunidos</span><span>${plural(s.people, 'persona', 'personas')}</span></div>
    </div>`;
  return s.cause ? `<a class="story" href="#/sorteo/${s.cause.id}" style="--k:${k.color}">${inner}</a>` : `<div class="story" style="--k:${k.color}">${inner}</div>`;
}

// =====================================================================
// CAUSAS
// =====================================================================
function viewCauses() {
  let cat = sessionStorage.getItem('unamano:cat') || 'all', q = '';
  view.innerHTML = `
    ${topbar()}
    <section class="page-head">
      <h1>Causas activas</h1>
      <p>Todas fueron revisadas por nuestro equipo antes de publicarse.</p>
    </section>
    <label class="search">${icon('search', 22)}<span class="sr-only">Buscar</span>
      <input type="search" id="q" placeholder="Buscar por nombre o comuna" autocomplete="off"></label>
    <div class="chips" role="group" aria-label="Filtrar por tipo de causa">
      <button aria-pressed="${cat === 'all'}" data-cat="all">Todas</button>
      ${Object.entries(CATEGORIES).map(([k, v]) => `<button aria-pressed="${cat === k}" data-cat="${k}"><i style="background:${v.color}">${icon(v.icon, 13, 2.4)}</i>${v.label}</button>`).join('')}
    </div>
    <div class="clist" id="list"></div>`;
  const render = () => {
    const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const items = db.causes({ status: 'live' })
      .filter(c => cat === 'all' || c.category === cat)
      .filter(c => !q || norm([c.title, c.treatment, c.beneficiary.comuna, c.beneficiary.first, c.organizer.name].join(' ')).includes(norm(q)))
      .sort((a, b) => a.drawAt - b.drawAt);
    $('#list').innerHTML = items.length ? items.map(causeCard).join('') : `<div class="empty"><span class="em-ic">${icon('search', 30)}</span><b>No hay causas con ese filtro</b><p>Prueba con otro tipo de causa.</p></div>`;
  };
  render();
  $('#q').addEventListener('input', e => { q = e.target.value.trim(); render(); });
  $$('.chips button').forEach(b => b.addEventListener('click', () => {
    cat = b.dataset.cat; sessionStorage.setItem('unamano:cat', cat);
    $$('.chips button').forEach(x => x.setAttribute('aria-pressed', x === b)); render();
  }));
}

function causeCard(c) {
  const s = db.stats(c);
  const hot = s.ms < 2 * 864e5;
  const k = CATEGORIES[c.category];
  return `<a class="ccard" href="#/causa/${c.id}">
    <div class="ccard-ph">${photo(c, { w: 800 })}
      <div class="ccard-top">${catTag(c.category)}<span class="time-pill ${hot ? 'hot' : ''}">${icon('clock', 15, 2.4)} ${hot ? 'Cierra en ' : ''}${db.timeLeft(s.ms)}</span></div></div>
    <div class="ccard-b">
      <b class="ccard-t">${esc(c.title)}</b>
      <span class="ccard-o">${esc(c.organizer.name)} · ${esc(c.beneficiary.comuna)}</span>
      ${progress(s.pct, k.color)}
      <div class="money-row"><span><b class="num">${clp(s.raised)}</b> de ${clp(c.goal)}</span><span class="pct num">${Math.floor(s.pct)}%</span></div>
    </div>
  </a>`;
}

function viewCause(id) {
  const c = db.cause(id);
  if (!c || !['live', 'drawn', 'refunded'].includes(c.status)) return notFound();
  const s = db.stats(c);
  const k = CATEGORIES[c.category];
  document.body.classList.add('no-tabbar');
  const remaining = s.pct >= 90 ? `Falta muy poco: ${clp(s.missing)} para cumplir la meta.` : `Faltan ${clp(s.missing)} para cumplir la meta.`;
  view.innerHTML = `
    <article>
      <div class="cause-hero">
        ${photo(c, { w: 1000 })}
        <div class="hero-top">
          <a href="${ADMIN ? '#/admin' : '#/causas'}" class="icon-btn float" aria-label="Volver">${icon('back')}</a>
          <button class="icon-btn float" data-share aria-label="Compartir">${icon('share')}</button>
        </div>
      </div>
      <div class="cause-sheet">
        ${seal(80)}
        <div class="cause-head">
          ${catTag(c.category)}
          <h1>${esc(c.title)}</h1>
          <p class="lead">${esc(c.treatment)}. ${esc(c.beneficiary.comuna)}.</p>
        </div>

        <div class="meter">
          <div class="meter-amt num">${clp(s.raised)}</div>
          <div class="meter-sub">reunidos de una meta de <b class="num">${clp(c.goal)}</b></div>
          ${progress(s.pct, k.color)}
          <div class="meter-row">
            <div><b class="num">${Math.floor(s.pct)}%</b><span>de la meta</span></div>
            <div><b class="num">${s.sold.toLocaleString('es-CL')}</b><span>números vendidos</span></div>
            <div><b data-countdown>${c.status === 'live' ? db.timeLeft(s.ms) : 'Cerrada'}</b><span>${c.status === 'live' ? 'para el sorteo' : fmtDate(c.drawAt)}</span></div>
          </div>
          ${c.status === 'live' ? `<p class="meter-note">${remaining}</p>` : ''}
        </div>

        <div class="facts">
          <div><span class="fi">${icon('users', 20)}</span><b>${plural(c.beneficiary.people || 1, 'persona', 'personas')}</b><span>recibe${(c.beneficiary.people || 1) > 1 ? 'n' : ''} el apoyo</span></div>
          <div><span class="fi">${icon('people', 20)}</span><b>${esc(c.organizer.name)}</b><span>organiza la rifa</span></div>
          <div><span class="fi">${icon('clinic', 20)}</span><b>${esc(c.provider.name)}</b><span>recibe el pago directo</span></div>
          <div><span class="fi">${icon('gift', 20)}</span><b>${esc(c.prize)}</b><span>${c.prizeMode === 'donado' ? 'premio donado' : `premio comprado con el ${c.split.prize}%`} · sorteo el ${fmtDate(c.drawAt)}</span></div>
        </div>

        <section class="block"><h2>La historia</h2><p>${esc(c.story)}</p></section>

        <section class="trust">
          <div class="trust-h"><span class="ti">${icon('shield', 22, 2.2)}</span>
            <div><h2>Qué verificamos</h2><p>Antes de publicar, nuestro equipo revisó cada punto.</p></div></div>
          <ul class="checks">
            ${CHECKS.map(ck => `<li><span class="ck ${c.checks[ck.key] ? '' : 'no'}">${icon(c.checks[ck.key] ? 'check' : 'clock', 15, 3)}</span><div><b>${ck.label}</b><span>${ck.how}${ck.key === 'respaldo' ? ` ${esc(c.backer.name)}, ${esc(c.backer.role)}.` : ''}${ck.key === 'proveedor' ? ` ${esc(c.provider.name)}: ${clp(c.provider.budget)}.` : ''}</span></div></li>`).join('')}
          </ul>
        </section>

        <section class="block"><h2>A dónde va tu aporte</h2>${splitBar(c.split)}</section>

        <div class="guarantee"><span class="gi">${icon('refresh')}</span><div><b>Si no se llega a la meta, te devolvemos todo</b><span>El ${fmtDate(c.drawAt)} se cierra la venta. Si no se alcanzó la meta, no hay sorteo y se devuelve el 100% al mismo medio de pago.</span></div></div>
      </div>
      <div class="buybar">
        ${c.status === 'live' ? `
          <div class="pr"><b class="num">${clp(c.price)}</b><span>cada número</span></div>
          <a class="btn btn-l" href="#/causa/${c.id}/comprar">${icon('ticket', 22)} Comprar números</a>` : `
          <div class="pr"><b>${c.status === 'drawn' ? 'Meta cumplida' : 'Devuelta'}</b><span>${c.status === 'drawn' ? 'Ya se hizo el sorteo' : 'No se llegó a la meta'}</span></div>
          <a class="btn btn-l" href="#/sorteo/${c.id}">Ver resultado ${icon('arrow', 20)}</a>`}
      </div>
    </article>`;
  $('[data-share]').addEventListener('click', () => shareCause(c));
  if (c.status === 'live') {
    const t = setInterval(() => { const el = $('[data-countdown]'); if (el) el.textContent = db.timeLeft(c.drawAt - Date.now()); }, 30_000);
    onLeave(() => clearInterval(t));
  }
}

// =====================================================================
// COMPRA: cantidad (simple) o elegir números
// =====================================================================
function viewBuy(id) {
  const c = db.cause(id);
  if (!c || c.status !== 'live') return notFound();
  document.body.classList.add('no-tabbar');
  let qty = 2;
  view.innerHTML = `
    ${subbar('#/causa/' + c.id, 'Paso 1 de 2', 'Comprar números')}
    <div class="buy">
      <div class="summary">${photo(c, { w: 300 })}<div class="summary-b"><span class="t">${esc(c.title)}</span><span class="s">${clp(c.price)} cada número</span></div></div>
      <h2 class="q">¿Cuántos números quieres?</h2>
      <div class="qty" role="group" aria-label="Cantidad de números">
        <button type="button" data-q="-1" aria-label="Uno menos">${icon('minus', 28, 2.6)}</button>
        <output id="qty" aria-live="polite">2</output>
        <button type="button" data-q="1" aria-label="Uno más">${icon('plus', 28, 2.6)}</button>
      </div>
      <div class="quick" role="group" aria-label="Cantidades rápidas">${[1, 2, 5, 10].map(n => `<button type="button" data-n="${n}" aria-pressed="${n === qty}">${n}</button>`).join('')}</div>
      <div class="total"><span>Total a pagar</span><b class="num" id="tot"></b></div>
      <button class="btn btn-l btn-block" id="go">Continuar ${icon('arrow', 20)}</button>
      <p class="hint-c">Te asignamos números al azar entre los disponibles. Todos tienen la misma probabilidad de salir.</p>
      <a class="btn btn-light btn-block" href="#/causa/${c.id}/numeros">${icon('grid', 20)} Prefiero elegir mis números</a>
    </div>`;
  const upd = () => {
    $('#qty').textContent = qty; $('#tot').textContent = clp(qty * c.price);
    $$('.quick button').forEach(b => b.setAttribute('aria-pressed', +b.dataset.n === qty));
  };
  upd();
  $$('[data-q]').forEach(b => b.addEventListener('click', () => { qty = Math.max(1, Math.min(50, qty + +b.dataset.q)); upd(); }));
  $$('.quick button').forEach(b => b.addEventListener('click', () => { qty = +b.dataset.n; upd(); }));
  $('#go').addEventListener('click', () => {
    const nums = db.randomFree(c, qty);
    if (nums.length < qty) return toast('No quedan tantos números disponibles', 'bad');
    cart.set({ causeId: c.id, numbers: nums, random: true });
    go('#/pago');
  });
}

function viewNumbers(id) {
  const c = db.cause(id);
  if (!c || c.status !== 'live') return notFound();
  document.body.classList.add('no-tabbar');
  const sold = db.soldSet(c);
  const prev = cart.get();
  const sel = new Set(prev && prev.causeId === id && !prev.random ? prev.numbers : []);
  const PAGE = 100, pages = Math.ceil(c.total / PAGE), MAX = 50;
  let page = 0;
  view.innerHTML = `
    ${subbar('#/causa/' + c.id + '/comprar', 'Paso 1 de 2', 'Elige tus números')}
    <div class="pages" role="group" aria-label="Rango de números" id="pages"></div>
    <div class="legend"><span><i style="background:#fff;border:1px solid var(--line)"></i>Disponible</span><span><i style="background:var(--ink)"></i>Elegido</span><span><i style="background:var(--surface-2)"></i>Vendido</span></div>
    <div class="ngrid" id="grid" role="group" aria-label="Números"></div>
    <div class="tray">
      <div class="tray-chips" id="chips"></div>
      <div class="tray-row"><div class="t"><span id="cnt"></span><b id="tot" class="num"></b></div><button class="btn btn-l" id="go">Continuar ${icon('arrow', 20)}</button></div>
    </div>`;
  const renderPages = () => {
    $('#pages').innerHTML = Array.from({ length: pages }, (_, i) => {
      const a = i * PAGE + 1, b = Math.min(c.total, (i + 1) * PAGE);
      const mine = [...sel].some(n => n >= a && n <= b);
      return `<button aria-pressed="${i === page}" data-p="${i}">${a}–${b}${mine ? '<span class="dot"></span>' : ''}</button>`;
    }).join('');
  };
  const renderGrid = () => {
    const a = page * PAGE + 1, b = Math.min(c.total, (page + 1) * PAGE);
    let h = '';
    for (let n = a; n <= b; n++) h += `<button data-n="${n}" ${sold.has(n) ? `disabled aria-label="${n}, vendido"` : ''} aria-pressed="${sel.has(n)}">${n}</button>`;
    $('#grid').innerHTML = h;
  };
  const renderTray = () => {
    const arr = [...sel].sort((x, y) => x - y);
    $('#chips').innerHTML = arr.length ? arr.map(n => `<span>${pad(n)}</span>`).join('') : `<em>Toca los números que quieras</em>`;
    $('#cnt').textContent = `${plural(arr.length, 'número', 'números')}`;
    $('#tot').textContent = clp(arr.length * c.price);
    $('#go').disabled = !arr.length;
    cart.set({ causeId: id, numbers: arr });
  };
  renderPages(); renderGrid(); renderTray();
  $('#pages').addEventListener('click', e => { const b = e.target.closest('[data-p]'); if (!b) return; page = +b.dataset.p; renderPages(); renderGrid(); });
  $('#grid').addEventListener('click', e => {
    const b = e.target.closest('[data-n]'); if (!b || b.disabled) return;
    const n = +b.dataset.n;
    if (sel.has(n)) sel.delete(n); else { if (sel.size >= MAX) return toast(`Puedes elegir hasta ${MAX} números por compra`, 'bad'); sel.add(n); navigator.vibrate?.(8); }
    b.setAttribute('aria-pressed', sel.has(n)); renderTray(); renderPages();
  });
  $('#go').addEventListener('click', () => { if (sel.size) go('#/pago'); });
}

function viewCheckout() {
  const k = cart.get();
  const c = k && db.cause(k.causeId);
  if (!c || !k.numbers?.length) return go('#/causas');
  document.body.classList.add('no-tabbar');
  const prof = db.profile();
  const total = k.numbers.length * c.price;
  view.innerHTML = `
    ${subbar(k.random ? `#/causa/${c.id}/comprar` : `#/causa/${c.id}/numeros`, 'Paso 2 de 2', 'Tus datos y pago')}
    <div class="summary" style="margin:1.25rem 1.25rem 0">${photo(c, { w: 300 })}
      <div class="summary-b"><span class="t">${esc(c.title)}</span><div class="nums">${k.numbers.map(n => `<span>${pad(n)}</span>`).join('')}</div></div></div>
    <div class="total" style="margin:0 1.25rem"><span>${plural(k.numbers.length, 'número', 'números')} × ${clp(c.price)}</span><b class="num">${clp(total)}</b></div>
    <form class="form" id="f" novalidate>
      <div class="field"><label for="n">Tu nombre</label><input id="n" name="name" autocomplete="name" required value="${esc(prof.name || '')}"></div>
      <div class="field"><label for="e">Tu correo</label><input id="e" name="email" type="email" inputmode="email" autocomplete="email" required value="${esc(prof.email || '')}"><span class="hint">Te enviamos tus números y el resultado del sorteo.</span></div>
      <div class="field"><label for="t">Tu celular</label><input id="t" name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+56 9 1234 5678" required value="${esc(prof.phone || '')}"></div>
      <fieldset class="field" style="border:0;padding:0;margin:0"><legend class="lbl">¿Cómo quieres pagar?</legend>
        <div class="opts">
          <label class="opt"><input type="radio" name="method" value="Webpay" checked><span class="radio"></span><div><b>Tarjeta de débito o crédito</b><span>Con Webpay</span></div></label>
          <label class="opt"><input type="radio" name="method" value="Mercado Pago"><span class="radio"></span><div><b>Mercado Pago</b><span>Con tu cuenta</span></div></label>
          <label class="opt"><input type="radio" name="method" value="Transferencia"><span class="radio"></span><div><b>Transferencia bancaria</b><span>Desde tu banco</span></div></label>
        </div>
      </fieldset>
      <label class="checkline"><input type="checkbox" name="terms" required><span>Acepto las <button type="button" class="linkish" id="bases">bases de la rifa</button>.</span></label>
      <button class="btn btn-l btn-block" type="submit">${icon('lock', 20)} Pagar ${clp(total)}</button>
      <p class="secure">${icon('alert', 16)} Esta es una demostración: no se cobra dinero real.</p>
    </form>`;
  $('#bases').addEventListener('click', () => sheet(`
    <h2>Bases de la rifa</h2>
    <dl class="kv" style="margin-top:.75rem">
      <dt>Organiza</dt><dd>${esc(c.organizer.name)} (${esc(c.organizer.type)}), con fines benéficos.</dd>
      <dt>A favor de</dt><dd>${esc(c.beneficiary.name)}</dd>
      <dt>Números</dt><dd>Del 1 al ${c.total.toLocaleString('es-CL')}, a ${clp(c.price)} cada uno.</dd>
      <dt>Meta</dt><dd>${clp(c.goal)}. El ${c.split.treatment}% se paga directo a ${esc(c.provider.name)}.</dd>
      <dt>Premio</dt><dd>${esc(c.prize)}</dd>
      <dt>Sorteo</dt><dd>${fmtDateTime(c.drawAt)}. El resultado se puede verificar públicamente.</dd>
      <dt>Devolución</dt><dd>Si no se llega a la meta, se devuelve el 100% de cada compra.</dd>
    </dl>
    <button class="btn btn-block btn-l" data-close style="margin-top:1.25rem">Cerrar</button>`));
  $('#f').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target;
    let ok = true;
    $$('.field', f).forEach(x => { x.classList.remove('err'); $('.errmsg', x)?.remove(); });
    const bad = (input, msg) => { ok = false; const fl = input.closest('.field'); fl.classList.add('err'); fl.insertAdjacentHTML('beforeend', `<span class="errmsg">${msg}</span>`); };
    if (f.name.value.trim().length < 3) bad(f.name, 'Escribe tu nombre.');
    if (!/^\S+@\S+\.\S+$/.test(f.email.value)) bad(f.email, 'Revisa que el correo esté bien escrito.');
    if (f.phone.value.replace(/\D/g, '').length < 8) bad(f.phone, 'Revisa el número de celular.');
    if (ok && !f.terms.checked) { ok = false; toast('Para continuar, acepta las bases de la rifa', 'bad'); }
    if (!ok) { $('.err input', f)?.focus(); return; }
    const method = f.method.value;
    const ov = document.createElement('div'); ov.className = 'paying'; ov.setAttribute('role', 'alert');
    ov.innerHTML = `<div><div class="spin"></div><h2>Procesando el pago</h2><p>Conectando con ${esc(method)}…</p></div>`;
    document.body.append(ov);
    setTimeout(() => {
      try {
        const p = db.buy(c.id, k.numbers, { name: f.name.value.trim(), email: f.email.value.trim(), phone: f.phone.value.trim() }, method);
        cart.clear(); ov.remove(); go('#/gracias/' + p.id);
      } catch (err) { ov.remove(); toast(err.message, 'bad'); }
    }, 1500);
  });
}

function viewThanks(pid) {
  const p = db.purchases().find(x => x.id === pid);
  if (!p) return go('#/mis-numeros');
  const c = db.cause(p.causeId);
  const s = db.stats(c);
  document.body.classList.add('no-tabbar');
  view.innerHTML = `
    <section class="thanks">
      <a href="#/" class="icon-btn" aria-label="Cerrar">${icon('close')}</a>
      <div class="big-ic">${icon('check', 48, 3)}</div>
      <h1>Gracias, ${esc(p.buyer.name.split(' ')[0])}.</h1>
      <p class="lead">Tu aporte de <b>${clp(p.amount)}</b> ya es parte de esta causa. Con él, la meta va en <b>${Math.floor(s.pct)}%</b>.</p>
      ${progress(s.pct, CATEGORIES[c.category].color)}
      <h2 class="h-s" style="margin-top:.5rem">Tus números</h2>
      <div class="tix">
        ${p.numbers.slice(0, 6).map((n, i) => `<div class="tix-one" style="--i:${i}"><span class="n mono">${pad(n)}</span><span class="m">Sorteo<br>${fmtDate(c.drawAt)}</span></div>`).join('')}
        ${p.numbers.length > 6 ? `<p style="margin:0;font-weight:700">y ${p.numbers.length - 6} más en Mis números</p>` : ''}
      </div>
      <p class="muted">También te los enviamos a ${esc(p.buyer.email)}.</p>
      <button class="btn btn-l btn-block btn-sun" data-share>${icon('share', 20)} Invitar a otras personas</button>
      <a class="btn btn-l btn-block btn-light" href="#/mis-numeros">Ver mis números</a>
    </section>`;
  $('[data-share]').addEventListener('click', () => shareCause(c));
  confetti($('.thanks'));
}

function viewMine() {
  const ps = db.purchases();
  view.innerHTML = `
    ${topbar()}
    <section class="page-head"><h1>Mis números</h1><p>Tus compras, cuándo es cada sorteo y el resultado.</p></section>
    ${ps.length ? `<div class="mine">${ps.map(p => {
      const c = db.cause(p.causeId);
      let chip, sub;
      if (p.status === 'refunded') { chip = `<span class="chip chip-sun">Devuelto: ${clp(p.amount)}</span>`; sub = 'No se llegó a la meta y te devolvimos todo.'; }
      else if (c.status === 'drawn' && p.won) { chip = `<span class="chip chip-ok">${icon('gift', 14)} Tu número salió sorteado</span>`; sub = `Salió el ${pad(c.result.number)}. Te contactaremos para entregarte el premio.`; }
      else if (c.status === 'drawn') { chip = `<span class="chip chip-ok">${icon('check', 14, 3)} Causa cumplida</span>`; sub = `Salió el ${pad(c.result.number)}. Gracias por ser parte.`; }
      else { chip = `<span class="chip">${icon('clock', 14)} Sorteo el ${fmtDate(c.drawAt)}</span>`; sub = `Faltan ${db.timeLeft(c.drawAt - Date.now())}.`; }
      return `<a class="mtk ${p.won ? 'won' : ''}" href="${c.status === 'live' ? `#/causa/${c.id}` : `#/sorteo/${c.id}`}">
        ${photo(c, { w: 200 })}
        <div class="mtk-b">${chip}<span class="t">${esc(c.title)}</span>
          <div class="nums">${p.numbers.map(n => `<span>${pad(n)}</span>`).join('')}</div><span class="s">${sub}</span></div></a>`;
    }).join('')}</div>` : `
      <div class="empty"><span class="em-ic">${icon('ticket', 32)}</span><b>Todavía no tienes números</b>
        <p>Cuando compres, aquí verás tus números, la fecha del sorteo y el resultado.</p>
        <a class="btn btn-l" href="#/causas">Ver causas activas</a></div>`}`;
}

// =====================================================================
// POSTULAR
// =====================================================================
const DRAFT = 'unamano:draft';
const STAGES = [
  { t: 'Postulación recibida', s: 'Tenemos los datos y documentos.', keys: [] },
  { t: 'Identidad y necesidad', s: 'Revisamos la identidad y los documentos que respaldan la necesidad.', keys: ['identidad', 'necesidad'] },
  { t: 'Respaldo y presupuesto', s: 'Confirmamos al profesional que respalda y el presupuesto con el proveedor.', keys: ['respaldo', 'proveedor'] },
  { t: 'Organización', s: 'Validamos la personalidad jurídica y la directiva.', keys: ['organizacion'] },
  { t: 'Entrevista', s: 'Conversamos por videollamada.', keys: ['entrevista'] },
  { t: 'Rifa publicada', s: 'Se publica con el sello de verificación y comienza la venta.', keys: ['__live'] },
];
const stageDone = (c, st) => st.keys.every(k => k === '__live' ? ['live', 'drawn', 'refunded'].includes(c.status) : c.checks[k]);

function viewApplyHome() {
  const mine = db.causes().filter(c => c.mine).sort((a, b) => b.createdAt - a.createdAt);
  let draft = null; try { draft = JSON.parse(sessionStorage.getItem(DRAFT)); } catch { /* */ }
  view.innerHTML = `
    ${topbar()}
    <section class="apply-hero">
      ${photo({ category: 'comunidad', photo: 'https://images.unsplash.com/photo-1730875648117-ff32ae9b98c3' }, { w: 800, cls: 'ah-ph' })}
      <div class="ah-b">
        <span class="eyebrow">Para organizaciones</span>
        <h1>Postula una causa de tu comunidad</h1>
        <p>Juntas de vecinos, clubes, centros de padres y sindicatos pueden organizar una rifa solidaria. Nosotros verificamos, operamos la venta y pagamos directo al proveedor.</p>
        <a class="btn btn-l btn-block" href="#/postular/nueva">${icon('hand', 22)} ${draft?.beneficiary?.name ? 'Continuar mi postulación' : 'Comenzar postulación'}</a>
        <span class="ah-note">Postular no tiene costo. Toma unos 10 minutos.</span>
      </div>
    </section>
    ${mine.length ? `<div class="sec-t"><h2>Tus postulaciones</h2></div>
      <div class="list">${mine.map(c => {
        const done = STAGES.filter(st => stageDone(c, st)).length;
        const chip = c.status === 'pending' ? `<span class="chip chip-sun">En revisión: ${done} de ${STAGES.length}</span>` : c.status === 'live' ? '<span class="chip chip-ok">Publicada</span>' : c.status === 'rejected' ? '<span class="chip chip-bad">No aprobada</span>' : '<span class="chip">Cerrada</span>';
        return `<a class="row" href="#/postulacion/${c.id}">${photo(c, { w: 300 })}<div class="row-b">${chip}<span class="row-t">${esc(c.title)}</span><span class="row-s">Enviada el ${fmtDate(c.createdAt)}</span></div></a>`;
      }).join('')}</div>` : ''}
    <div class="sec-t"><h2>Qué tipo de causas</h2></div>
    <div class="catgrid">${Object.entries(CATEGORIES).map(([, v]) => `<div style="--k:${v.color};background:${v.tint}"><i style="background:${v.color}">${icon(v.icon, 18, 2.2)}</i><b>${v.label}</b></div>`).join('')}</div>
    <div class="sec-t"><h2>Qué vas a necesitar</h2></div>
    <ul class="need card">
      ${[['user', 'Datos de quien recibe el apoyo', 'Persona, familia o grupo, con su historia.'], ['doc', 'Documento que respalde la necesidad', 'Informe médico, social, escolar o de emergencia.'], ['clinic', 'Presupuesto del proveedor', 'Con nombre y teléfono del proveedor.'], ['id', 'Certificado de personalidad jurídica', 'Vigente, de la organización que organiza.'], ['gift', 'Un premio', 'Donado, o comprado con una parte de lo reunido.']]
        .map(([i, t, d]) => `<li><span class="vi">${icon(i, 20)}</span><div><b>${t}</b><span>${d}</span></div></li>`).join('')}
    </ul>
    <div class="sec-t"><h2>Cómo sigue</h2></div>
    <ol class="timeline card">${STAGES.map((st, i) => `<li><span class="tn">${i + 1}</span><div><b>${st.t}</b><span>${st.s}</span></div></li>`).join('')}</ol>
    <div class="guarantee" style="margin:1.25rem"><span class="gi">${icon('coins')}</span><div><b>Cuánto cuesta</b><span>Postular es gratis. De lo reunido, un ${OPS_PCT}% financia la verificación de casos, los pagos y la plataforma. Siempre se informa en cada rifa.</span></div></div>`;
}

function viewApply() {
  let step = 0, d;
  try { d = JSON.parse(sessionStorage.getItem(DRAFT)) || {}; } catch { d = {}; }
  d = Object.assign({ beneficiary: {}, organizer: {}, backer: {}, price: 2000, prizeMode: 'donado', prizePct: 10, category: 'salud', documents: [], region: 'Metropolitana' }, d);
  const saveDraft = () => { try { sessionStorage.setItem(DRAFT, JSON.stringify(d)); } catch { /* foto grande */ } };
  const minDate = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);
  const maxDate = new Date(Date.now() + 90 * 864e5).toISOString().slice(0, 10);
  if (!d.drawDate) d.drawDate = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
  const REGIONS = ['Arica y Parinacota', 'Tarapacá', 'Antofagasta', 'Atacama', 'Coquimbo', 'Valparaíso', 'Metropolitana', "O'Higgins", 'Maule', 'Ñuble', 'Biobío', 'La Araucanía', 'Los Ríos', 'Los Lagos', 'Aysén', 'Magallanes'];

  const STEPS = [
    { t: '¿Qué necesita tu comunidad?', p: 'Elige el tipo de causa y cuéntanos la historia con palabras simples.' },
    { t: '¿Quién recibe el apoyo?', p: 'Puede ser una persona, una familia o un grupo.' },
    { t: 'Respaldo y presupuesto', p: 'Quién respalda la necesidad y a quién le pagamos directamente.' },
    { t: 'La organización', p: 'La rifa la organiza una organización con personalidad jurídica.' },
    { t: 'La rifa', p: 'Precio, premio y fecha. Calculamos la meta para cubrir el objetivo completo.' },
    { t: 'Documentos', p: 'Con esto comienza la verificación.' },
  ];
  const field = (id, label, val, attrs = '', hint = '') =>
    `<div class="field"><label for="${id}">${label}</label><input id="${id}" value="${esc(val ?? '')}" ${attrs}>${hint ? `<span class="hint">${hint}</span>` : ''}</div>`;

  const bodies = [
    () => `<div class="form">
        <fieldset class="field" style="border:0;padding:0;margin:0"><legend class="lbl">Tipo de causa</legend>
          <div class="catpick">${Object.entries(CATEGORIES).map(([k, v]) => `<label><input type="radio" name="cat" value="${k}" ${d.category === k ? 'checked' : ''}><span><i style="background:${v.color}">${icon(v.icon, 18, 2.2)}</i>${v.label}</span></label>`).join('')}</div></fieldset>
        ${field('b-title', 'Título de la causa', d.title, 'required data-k="title" maxlength="70" placeholder="Ej: Que Rosa vuelva a caminar sin dolor"', 'Describe el resultado que buscan, en una frase.')}
        ${field('tr', 'Qué se va a financiar', d.treatment, 'required data-k="treatment" placeholder="Ej: Cirugía de cadera, computadores, materiales"')}
        <div class="field"><label for="b-story">La historia</label><textarea id="b-story" required data-k="story" minlength="80" placeholder="Quiénes son, qué pasó y por qué lo necesitan ahora.">${esc(d.story || '')}</textarea><span class="hint">Mínimo 80 caracteres. Con respeto y sin exagerar: la gente confía en lo concreto.</span></div>
      </div>`,
    () => `<div class="form">
        ${field('b-name', 'Nombre de la persona, familia o grupo', d.beneficiary.name, 'required data-k="beneficiary.name"')}
        <div class="row2">
          ${field('b-first', 'Nombre corto', d.beneficiary.first, 'required data-k="beneficiary.first" maxlength="18"', 'Cómo aparecerá en la app')}
          ${field('b-people', 'Personas beneficiadas', d.beneficiary.people, 'required type="number" inputmode="numeric" min="1" data-k="beneficiary.people"')}
        </div>
        <div class="row2">
          ${field('b-comuna', 'Comuna', d.beneficiary.comuna, 'required data-k="beneficiary.comuna"')}
          <div class="field"><label for="reg">Región</label><select id="reg" data-k="region">${REGIONS.map(r => `<option ${d.region === r ? 'selected' : ''}>${r}</option>`).join('')}</select></div>
        </div>
        <label class="file-btn ${d.cover ? 'ok' : ''}"><span class="fi">${icon(d.cover ? 'check' : 'upload')}</span><div><b>${d.cover ? 'Foto cargada' : 'Subir una foto'}</b><span>Con autorización de quienes aparecen.</span></div><input type="file" accept="image/*" id="cover"></label>
      </div>`,
    () => `<div class="form">
        <div class="row2">
          ${field('bkn', 'Quién respalda la necesidad', d.backer.name, 'required data-k="backer.name" placeholder="Nombre del profesional o institución"')}
          ${field('bkn-r', 'Cargo o especialidad', d.backer.role, 'required data-k="backer.role" placeholder="Ej: Médico, directora, asistente social"')}
        </div>
        ${field('pv', 'Proveedor que recibe el pago', d.providerName, 'required data-k="providerName"', 'La clínica, el colegio, la ferretería o quien entregue lo que se necesita.')}
        ${field('bud', 'Presupuesto total (en pesos)', d.budget, 'required type="number" inputmode="numeric" min="100000" step="1000" data-k="budget" placeholder="3600000"')}
        <div class="infobox">${icon('shield', 20)}<span>Llamamos al proveedor a su número oficial para confirmar el presupuesto. El pago se hace contra factura.</span></div>
      </div>`,
    () => `<div class="form">
        <div class="field"><label for="ot">Tipo de organización</label><select id="ot" data-k="organizer.type">${ORG_TYPES.map(t => `<option ${d.organizer.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
        ${field('on', 'Nombre de la organización', d.organizer.name, 'required data-k="organizer.name"')}
        ${field('orut', 'RUT de la organización', d.organizer.rut, 'required data-k="organizer.rut" placeholder="65.123.456-7"')}
        <div class="row2">
          ${field('oc', 'Persona de contacto', d.organizer.contact, 'required data-k="organizer.contact" placeholder="Nombre y cargo"')}
          ${field('ophone', 'Celular', d.organizer.phone, 'required type="tel" inputmode="tel" data-k="organizer.phone"')}
        </div>
        ${field('omail', 'Correo', d.organizer.email, 'required type="email" inputmode="email" data-k="organizer.email"')}
        <div class="infobox">${icon('people', 20)}<span>Las rifas benéficas las organizan entidades con personalidad jurídica, a favor de un tercero (Ley 20.851). No se puede postular a título personal.</span></div>
      </div>`,
    () => {
      const plan = d.budget ? computePlan({ budget: +d.budget, price: +d.price, prizeMode: d.prizeMode, prizePct: +d.prizePct }) : null;
      return `<div class="form">
        <fieldset class="field" style="border:0;padding:0;margin:0"><legend class="lbl">Precio de cada número</legend>
          <div class="pills">${[1000, 2000, 3000, 5000].map(v => `<label><input type="radio" name="price" value="${v}" ${+d.price === v ? 'checked' : ''}><span>${clp(v)}</span></label>`).join('')}</div></fieldset>
        <fieldset class="field" style="border:0;padding:0;margin:0"><legend class="lbl">¿Quién pone el premio?</legend>
          <div class="opts">
            <label class="opt"><input type="radio" name="pm" value="donado" ${d.prizeMode === 'donado' ? 'checked' : ''}><span class="radio"></span><div><b>Alguien lo dona</b><span>Todo lo reunido va a la causa.</span></div></label>
            <label class="opt"><input type="radio" name="pm" value="porcentaje" ${d.prizeMode === 'porcentaje' ? 'checked' : ''}><span class="radio"></span><div><b>Se compra con lo reunido</b><span>Una parte paga el premio.</span></div></label>
          </div></fieldset>
        ${d.prizeMode === 'porcentaje' ? `<div class="field"><label for="pp-r">Parte para el premio: <b id="pp-v">${d.prizePct}%</b></label><input id="pp-r" type="range" min="5" max="20" step="1" value="${d.prizePct}" style="min-height:auto;padding:0;border:0;accent-color:var(--ink)"></div>` : ''}
        ${field('pz', 'Premio', d.prize, 'required data-k="prize" placeholder="Ej: Bicicleta, canasta familiar"')}
        ${field('dd', 'Fecha del sorteo', d.drawDate, `required type="date" min="${minDate}" max="${maxDate}" data-k="drawDate"`, 'Entre 2 semanas y 3 meses desde hoy. El sorteo es a las 20:00.')}
        ${plan ? `<div class="plan"><span class="eyebrow">Meta de la rifa</span><span class="goal num">${clp(plan.goal)}</span>
          <span class="meta">Se emiten ${plan.total.toLocaleString('es-CL')} números de ${clp(d.price)}. Hay que vender ${Math.ceil(plan.goal / d.price).toLocaleString('es-CL')} para cumplir la meta.</span>
          ${splitBar(plan.split)}</div>` : `<div class="infobox">${icon('alert', 20)}<span>Completa el presupuesto en el paso 3 para calcular la meta.</span></div>`}
      </div>`;
    },
    () => `<div class="form">
        ${[['necesidad', 'Documento que respalda la necesidad'], ['presupuesto', 'Presupuesto del proveedor'], ['pj', 'Certificado de personalidad jurídica']].map(([k, l]) => {
          const doc = d.documents.find(x => x.k === k);
          return `<label class="file-btn ${doc ? 'ok' : ''}"><span class="fi">${icon(doc ? 'check' : 'doc')}</span><div><b>${l}</b><span>${doc ? esc(doc.name) : 'PDF o foto'}</span></div><input type="file" accept="image/*,application/pdf" data-doc="${k}" data-label="${l}"></label>`;
        }).join('')}
        <label class="checkline"><input type="checkbox" id="c1" ${d.c1 ? 'checked' : ''}><span>La información es verdadera y la organización aprobó hacer esta rifa.</span></label>
        <label class="checkline"><input type="checkbox" id="c2" ${d.c2 ? 'checked' : ''}><span>Autorizo revisar estos datos solo para verificar la causa. Los datos de salud son sensibles y no se publican sin permiso.</span></label>
        <label class="checkline"><input type="checkbox" id="c3" ${d.c3 ? 'checked' : ''}><span>Entiendo que el pago se hace directo al proveedor y no a una persona.</span></label>
      </div>`,
  ];

  const render = () => {
    document.body.classList.add('no-tabbar');
    view.innerHTML = `
      ${subbar(step === 0 ? '#/postular' : '#', `Paso ${step + 1} de ${STEPS.length}`, 'Postular una causa').replace('class="icon-btn"', 'class="icon-btn" id="bk"')}
      <div class="steps" aria-hidden="true">${STEPS.map((_, i) => `<i class="${i < step ? 'done' : i === step ? 'on' : ''}"></i>`).join('')}</div>
      <div class="step-head"><h2>${STEPS[step].t}</h2><p>${STEPS[step].p}</p></div>
      ${bodies[step]()}
      <div class="form-nav">
        ${step > 0 ? `<button class="btn btn-l btn-light" id="prev">${icon('back', 20)} Atrás</button>` : ''}
        <button class="btn btn-l" id="next">${step === STEPS.length - 1 ? 'Enviar postulación' : 'Siguiente'} ${icon('arrow', 20)}</button>
      </div>`;
    bind(); window.scrollTo(0, 0);
  };
  const setK = (k, v) => { const [a, b] = k.split('.'); if (b) d[a][b] = v; else d[a] = v; saveDraft(); };
  const bind = () => {
    $('#bk').addEventListener('click', e => { if (step > 0) { e.preventDefault(); step--; render(); } });
    $$('[data-k]').forEach(el => el.addEventListener('input', () => setK(el.dataset.k, el.value)));
    $$('input[name="cat"]').forEach(r => r.addEventListener('change', () => { d.category = r.value; saveDraft(); }));
    $('#cover')?.addEventListener('change', async e => {
      const file = e.target.files[0]; if (!file) return;
      try { d.cover = await shrink(file, 900); saveDraft(); render(); toast('Foto cargada'); } catch { toast('No pudimos leer esa imagen', 'bad'); }
    });
    $$('input[name="price"]').forEach(r => r.addEventListener('change', () => { d.price = +r.value; saveDraft(); render(); }));
    $$('input[name="pm"]').forEach(r => r.addEventListener('change', () => { d.prizeMode = r.value; saveDraft(); render(); }));
    $('#pp-r')?.addEventListener('input', e => { d.prizePct = +e.target.value; $('#pp-v').textContent = d.prizePct + '%'; saveDraft(); });
    $('#pp-r')?.addEventListener('change', () => render());
    $$('[data-doc]').forEach(inp => inp.addEventListener('change', () => {
      const f = inp.files[0]; if (!f) return;
      d.documents = d.documents.filter(x => x.k !== inp.dataset.doc).concat({ k: inp.dataset.doc, label: inp.dataset.label, name: f.name, size: f.size });
      saveDraft(); render();
    }));
    ['c1', 'c2', 'c3'].forEach(k => $('#' + k)?.addEventListener('change', e => { d[k] = e.target.checked; saveDraft(); }));
    $('#prev')?.addEventListener('click', () => { step--; render(); });
    $('#next').addEventListener('click', () => { if (!validate()) return; if (step < STEPS.length - 1) { step++; render(); } else submit(); });
  };
  const validate = () => {
    let ok = true;
    $$('.field').forEach(x => { x.classList.remove('err'); $('.errmsg', x)?.remove(); });
    $$('[required]', view).forEach(el => {
      const v = el.value.trim(); let msg = '';
      if (!v) msg = 'Completa este campo.';
      else if (el.minLength > 0 && v.length < el.minLength) msg = `Faltan ${el.minLength - v.length} caracteres.`;
      else if (el.type === 'email' && !/^\S+@\S+\.\S+$/.test(v)) msg = 'Revisa el correo.';
      else if (el.type === 'number' && el.min && +v < +el.min) msg = `El mínimo es ${el.min.length > 4 ? clp(el.min) : el.min}.`;
      else if (el.type === 'date' && (v < el.min || v > el.max)) msg = 'Elige una fecha dentro del rango.';
      if (msg) { ok = false; const fl = el.closest('.field'); fl.classList.add('err'); fl.insertAdjacentHTML('beforeend', `<span class="errmsg">${msg}</span>`); }
    });
    if (step === 4 && !d.budget) { ok = false; toast('Falta el presupuesto del paso 3', 'bad'); }
    if (step === 5) {
      if (d.documents.length < 3) { ok = false; toast('Sube los tres documentos', 'bad'); }
      else if (!(d.c1 && d.c2 && d.c3)) { ok = false; toast('Marca las tres confirmaciones', 'bad'); }
    }
    if (!ok) $('.err input, .err textarea, .err select')?.focus();
    return ok;
  };
  const submit = () => {
    const c = db.submitCause({
      title: d.title, treatment: d.treatment, category: d.category, story: d.story, region: d.region,
      beneficiary: { ...d.beneficiary, people: +d.beneficiary.people || 1 },
      organizer: d.organizer, backer: d.backer, providerName: d.providerName, budget: +d.budget,
      price: +d.price, prizeMode: d.prizeMode, prizePct: d.prizeMode === 'porcentaje' ? +d.prizePct : 0, prize: d.prize,
      drawDate: d.drawDate, cover: d.cover, documents: d.documents,
    });
    sessionStorage.removeItem(DRAFT);
    view.innerHTML = `
      <section class="thanks">
        <a href="#/postular" class="icon-btn" aria-label="Cerrar">${icon('close')}</a>
        <div class="big-ic">${icon('check', 48, 3)}</div>
        <h1>Postulación recibida</h1>
        <p class="lead">La causa <b>${esc(c.title)}</b> quedó en revisión con el número <b class="mono">#${esc(c.id.slice(-5).toUpperCase())}</b>. Te escribiremos a ${esc(c.organizer.email)} en cada etapa.</p>
        <ol class="timeline card" style="position:relative;z-index:2">${STAGES.slice(1).map((st, i) => `<li><span class="tn">${i + 1}</span><div><b>${st.t}</b><span>${st.s}</span></div></li>`).join('')}</ol>
        <a class="btn btn-l btn-block" href="#/postulacion/${c.id}">Ver el estado de mi postulación</a>
      </section>`;
    confetti($('.thanks'), 40);
  };
  render();
}

function viewMyCase(id) {
  const c = db.cause(id);
  if (!c) return notFound();
  document.body.classList.add('no-tabbar');
  const firstPending = STAGES.findIndex(st => !stageDone(c, st));
  const kit = `${c.title}\nRifa solidaria verificada en unamano. Número a ${clp(c.price)}, sorteo el ${fmtDate(c.drawAt)}.\n${new URL('#/causa/' + c.id, location.href).href}`;
  view.innerHTML = `
    ${subbar('#/postular', `Postulación #${esc(c.id.slice(-5).toUpperCase())}`, esc(c.title))}
    <div class="stack">
      <div class="status-h">${photo(c, { w: 300, style: 'width:5.5rem;height:5.5rem;border-radius:1.25rem;flex-shrink:0' })}
        <div><span class="eyebrow">Estado</span><h2 class="h-m">${c.status === 'pending' ? 'En revisión' : c.status === 'live' ? 'Publicada' : c.status === 'rejected' ? 'No aprobada' : 'Cerrada'}</h2>
        <p class="muted" style="margin:.25rem 0 0">${c.status === 'pending' ? `Etapa actual: ${STAGES[firstPending]?.t.toLowerCase()}.` : c.status === 'live' ? `Venta abierta hasta el ${fmtDate(c.drawAt)}.` : c.status === 'rejected' ? esc(c.rejectReason) : ''}</p></div></div>
      ${c.status === 'rejected' ? '' : `<ol class="timeline card">${STAGES.map((st, i) => {
        const ok = stageDone(c, st), now = i === firstPending;
        return `<li><span class="tn ${ok ? 'ok' : now ? 'now' : ''}">${ok ? icon('check', 16, 3) : i + 1}</span><div><b>${st.t}</b><span>${now && c.status === 'pending' ? 'En curso. ' : ''}${st.s}</span></div></li>`;
      }).join('')}</ol>`}
      ${c.status === 'live' ? `
        <div class="kit"><h3>Para difundir</h3><p>Compártelo en los grupos de tu comunidad.</p><pre>${esc(kit)}</pre>
          <div style="display:flex;gap:.6rem;flex-wrap:wrap"><a class="btn" href="https://wa.me/?text=${encodeURIComponent(kit)}" target="_blank" rel="noopener">Enviar por WhatsApp</a><button class="btn btn-light" id="cp">Copiar texto</button></div></div>
        <a class="btn btn-l btn-block" href="#/causa/${c.id}">Ver la rifa publicada</a>` : ''}
      ${['drawn', 'refunded'].includes(c.status) ? `<a class="btn btn-l btn-block" href="#/sorteo/${c.id}">Ver resultado</a>` : ''}
      ${c.status === 'pending' ? `<a class="btn btn-light btn-block" href="../admin/#/admin/${c.id}">${icon('shield', 18)} Ver cómo la revisa el equipo (demostración)</a>` : ''}
    </div>`;
  $('#cp')?.addEventListener('click', () => navigator.clipboard?.writeText(kit).then(() => toast('Texto copiado')));
}

function shrink(file, max) {
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const cv = document.createElement('canvas'); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); URL.revokeObjectURL(url);
      res(cv.toDataURL('image/jpeg', .72));
    };
    img.onerror = rej; img.src = url;
  });
}

// =====================================================================
// PANEL DE ADMINISTRACIÓN
// =====================================================================
function adminGate(next) {
  if (db.load().adminOk) return next();
  document.body.classList.add('no-tabbar');
  view.innerHTML = `
    ${subbar(ADMIN ? '../' : '#/', 'Equipo unamano', 'Panel de administración')}
    <form class="stack" id="pin" style="padding-top:2.5rem">
      ${logo(64)}
      <h2 class="h-m">Acceso para el equipo de verificación</h2>
      <div class="field"><label for="pinv">PIN</label><input id="pinv" inputmode="numeric" maxlength="4" autocomplete="one-time-code" style="font-size:1.75rem;letter-spacing:.4em;text-align:center"><span class="hint">PIN de prueba: 1234</span></div>
      <button class="btn btn-block btn-l">Entrar</button>
    </form>`;
  $('#pinv').focus();
  $('#pin').addEventListener('submit', e => {
    e.preventDefault();
    if ($('#pinv').value === '1234') { db.setAdmin(true); next(); } else { toast('PIN incorrecto', 'bad'); $('#pinv').value = ''; }
  });
}

function viewAdmin() {
  adminGate(() => {
    document.body.classList.add('no-tabbar');
    let tab = sessionStorage.getItem('unamano:admtab') || 'pending';
    const all = db.causes();
    const live = all.filter(c => c.status === 'live');
    const pend = all.filter(c => c.status === 'pending');
    const done = all.filter(c => ['drawn', 'refunded', 'rejected'].includes(c.status));
    const raised = live.reduce((a, c) => a + db.stats(c).raised, 0);
    view.innerHTML = `
      ${subbar(ADMIN ? '../' : '#/', 'Equipo unamano', 'Panel de administración', '<button class="btn btn-s btn-ghost" id="logout" style="margin-left:auto">Salir</button>')}
      <div class="akpis">
        <div class="akpi hl"><b>${pend.length}</b><span>por verificar</span></div>
        <div class="akpi"><b>${live.length}</b><span>rifas activas</span></div>
        <div class="akpi"><b class="num">${clpShort(raised)}</b><span>en recaudación</span></div>
      </div>
      <div class="tabs" role="tablist">
        <button role="tab" data-t="pending" aria-selected="${tab === 'pending'}">Por verificar</button>
        <button role="tab" data-t="live" aria-selected="${tab === 'live'}">Activas</button>
        <button role="tab" data-t="done" aria-selected="${tab === 'done'}">Cerradas</button>
      </div>
      <div class="list" id="alist" style="padding-top:.75rem;padding-bottom:2rem"></div>`;
    const render = () => {
      const items = tab === 'pending' ? pend : tab === 'live' ? live : done;
      $('#alist').innerHTML = items.length ? items.map(c => {
        const sc = db.trustScore(c), st = db.stats(c);
        const chip = c.status === 'pending' ? (c.flags?.length ? '<span class="chip chip-bad">Con alerta</span>' : `<span class="chip chip-sun">Verificación: ${sc}%</span>`)
          : c.status === 'live' ? `<span class="chip">${Math.floor(st.pct)}% de la meta</span>`
          : c.status === 'drawn' ? '<span class="chip chip-ok">Cumplida</span>' : c.status === 'refunded' ? '<span class="chip chip-sun">Devuelta</span>' : '<span class="chip">Rechazada</span>';
        return `<a class="row" href="#/admin/${c.id}">${photo(c, { w: 300 })}<div class="row-b">${chip}<span class="row-t">${esc(c.title)}</span><span class="row-s">${esc(c.organizer.name)} · ${catLabel(c.category)}</span></div></a>`;
      }).join('') : `<p class="empty-list">No hay casos en esta lista.</p>`;
    };
    render();
    $$('.tabs button').forEach(b => b.addEventListener('click', () => {
      tab = b.dataset.t; sessionStorage.setItem('unamano:admtab', tab);
      $$('.tabs button').forEach(x => x.setAttribute('aria-selected', x === b)); render();
    }));
    $('#logout').addEventListener('click', () => { db.setAdmin(false); route(); });
  });
}

function viewAdminCase(id) {
  adminGate(() => {
    const c = db.cause(id);
    if (!c) return notFound();
    document.body.classList.add('no-tabbar');
    const st = db.stats(c), sc = db.trustScore(c);
    const allOk = CHECKS.every(k => c.checks[k.key]);
    const statusTxt = { pending: 'Por verificar', live: 'Activa', drawn: 'Cumplida', refunded: 'Devuelta', rejected: 'Rechazada' }[c.status];
    view.innerHTML = `
      ${subbar('#/admin', `Caso #${esc(c.id.slice(-5).toUpperCase())} · ${statusTxt}`, esc(c.title))}
      <div class="stack">
        <div class="full status-h">${photo(c, { w: 300, style: 'width:5rem;height:5rem;border-radius:1.1rem;flex-shrink:0' })}
          <div style="flex:1;min-width:0">${catTag(c.category)}<b style="display:block;font-size:1.125rem;margin-top:.35rem">${esc(c.beneficiary.name)}</b><span class="muted">${esc(c.treatment)} · ${esc(c.beneficiary.comuna)}</span></div>
          <div class="score" style="--s:${sc}" aria-label="Verificación ${sc}%"><b>${sc}%</b></div></div>
        ${(c.flags || []).map(f => `<div class="flag full">${icon('alert', 20)}<div><b>Alerta automática</b><br>${esc(f)}<br><button class="linkish" data-unflag>Marcar como revisada</button></div></div>`).join('')}
        ${c.status === 'pending' ? `
        <div class="card pad"><h3>Verificación</h3>
          <ul class="vlist">${CHECKS.map(k => `
            <li><span class="vi">${icon(k.icon, 20)}</span>
              <div class="vt"><b>${k.label}</b><span>${k.how}</span>
                ${k.key === 'respaldo' ? `<span>${esc(c.backer.name)} · ${esc(c.backer.role)}</span>${c.category === 'salud' ? '<a href="https://rnpi.superdesalud.gob.cl/" target="_blank" rel="noopener">Consultar registro de prestadores de salud</a>' : ''}` : ''}
                ${k.key === 'proveedor' ? `<span>${esc(c.provider.name)} · ${clp(c.provider.budget)}</span>` : ''}
                ${k.key === 'organizacion' ? `<span>${esc(c.organizer.name)}${c.organizer.rut ? ' · RUT ' + esc(c.organizer.rut) : ''}</span>` : ''}
              </div>
              <button class="switch" role="switch" aria-checked="${!!c.checks[k.key]}" aria-label="${k.label} verificado" data-check="${k.key}"></button>
            </li>`).join('')}</ul></div>` : ''}
        <div class="card pad"><h3>Datos del caso</h3>
          <dl class="kv">
            <dt>Organiza</dt><dd>${esc(c.organizer.name)} (${esc(c.organizer.type)})${c.organizer.contact ? '<br>' + esc(c.organizer.contact) : ''}${c.organizer.email ? '<br>' + esc(c.organizer.email) : ''}</dd>
            <dt>Beneficiados</dt><dd>${plural(c.beneficiary.people || 1, 'persona', 'personas')}</dd>
            <dt>Pago a</dt><dd>${esc(c.provider.name)} · ${clp(c.provider.budget)}</dd>
            <dt>Meta</dt><dd>${clp(c.goal)} · ${c.total.toLocaleString('es-CL')} números de ${clp(c.price)}</dd>
            <dt>Reparto</dt><dd>${c.split.treatment}% causa · ${c.split.prize}% premio · ${c.split.ops}% operación</dd>
            <dt>Premio</dt><dd>${esc(c.prize)}</dd>
            <dt>Sorteo</dt><dd>${fmtDateTime(c.drawAt)}</dd>
            ${c.documents?.length ? `<dt>Documentos</dt><dd>${c.documents.map(x => esc(x.label) + ': ' + esc(x.name)).join('<br>')}</dd>` : ''}
            ${c.rejectReason ? `<dt>Motivo</dt><dd>${esc(c.rejectReason)}</dd>` : ''}
          </dl>
          <p class="muted" style="font-size:.9375rem;margin:.75rem 0 0">${esc(c.story)}</p></div>
        ${c.status === 'live' ? `
        <div class="card pad"><h3>Recaudación</h3>
          <div class="num" style="font-size:2.25rem;font-weight:800;letter-spacing:-.03em">${clp(st.raised)}</div>
          <p class="muted" style="margin:.25rem 0 .75rem">de ${clp(c.goal)} · ${st.sold.toLocaleString('es-CL')} números · cierra el ${fmtDateTime(c.drawAt)}</p>
          ${progress(st.pct, CATEGORIES[c.category].color)}
          <p class="hash-line">${icon('hash', 16)}<span>Huella publicada: <code class="mono">${c.seedHash}</code></span></p></div>
        <div class="card pad"><h3>Herramientas de demostración</h3>
          <div style="display:flex;flex-direction:column;gap:.6rem">
            <button class="btn btn-light btn-block" id="sim">${icon('users', 20)} Simular ventas (+${plural(Math.ceil(c.goal / c.price * .15), 'número', 'números')})</button>
            <button class="btn btn-light btn-block" id="closenow">${icon('clock', 20)} Cerrar la venta ahora</button>
            <button class="btn btn-block" id="draw">${icon('dice', 20)} Ejecutar sorteo</button>
          </div>
          <p class="muted" style="font-size:.875rem;margin:.6rem 0 0">Si no se llegó a la meta, se devuelven todas las compras automáticamente.</p></div>` : ''}
        ${['drawn', 'refunded'].includes(c.status) ? `<a class="btn btn-l btn-block full" href="#/sorteo/${c.id}">Ver resultado público</a>` : ''}
      </div>
      ${c.status === 'pending' ? `
      <div class="buybar" style="flex-wrap:wrap">
        <button class="btn btn-danger btn-l" id="rej" style="flex:1">Rechazar</button>
        <button class="btn btn-l btn-ok" id="ok" style="flex:2" ${allOk && !c.flags?.length ? '' : 'disabled'}>${icon('shield', 20)} Aprobar y publicar</button>
        ${allOk && !c.flags?.length ? '' : `<span class="buy-note">${c.flags?.length ? 'Revisa la alerta y completa' : 'Completa'} las ${CHECKS.length} verificaciones para publicar.</span>`}
      </div>` : ''}`;
    $$('[data-check]').forEach(b => b.addEventListener('click', () => { db.setCheck(c.id, b.dataset.check, b.getAttribute('aria-checked') !== 'true'); viewAdminCase(id); }));
    $('[data-unflag]')?.addEventListener('click', () => { db.clearFlags(c.id); viewAdminCase(id); });
    $('#ok')?.addEventListener('click', () => { try { db.approve(c.id); toast('Causa publicada con el sello de verificación'); viewAdminCase(id); } catch (e) { toast(e.message, 'bad'); } });
    $('#rej')?.addEventListener('click', () => sheet(`
      <h2>Rechazar caso</h2><p>Se le informará a la organización con el motivo.</p>
      <div class="field"><label for="why">Motivo</label><textarea id="why" placeholder="Ej: el proveedor no confirmó el presupuesto"></textarea></div>
      <div style="display:flex;gap:.6rem;margin-top:1rem"><button class="btn btn-light btn-l" data-close style="flex:1">Cancelar</button><button class="btn btn-danger btn-l" id="dorej" style="flex:1">Rechazar</button></div>`, {
      onOpen: (s, close) => $('#dorej', s).addEventListener('click', () => { db.reject(c.id, $('#why', s).value.trim() || 'Sin motivo'); close(); toast('Caso rechazado'); viewAdminCase(id); }),
    }));
    $('#sim')?.addEventListener('click', () => { db.simulateSales(c.id, Math.ceil(c.goal / c.price * .15)); toast('Ventas simuladas'); viewAdminCase(id); });
    $('#closenow')?.addEventListener('click', () => { db.closeNow(c.id); toast('Venta cerrada'); viewAdminCase(id); });
    $('#draw')?.addEventListener('click', () => {
      const s2 = db.stats(c);
      sheet(`<h2>¿Ejecutar el sorteo?</h2>
        <p>${s2.reached ? `Se cumplió la meta (${clp(s2.raised)} de ${clp(c.goal)}). Se revela la semilla y se calcula el número ganador entre los ${s2.sold.toLocaleString('es-CL')} vendidos.`
          : `<b>No se cumplió la meta</b> (${clp(s2.raised)} de ${clp(c.goal)}). No hay sorteo: se devuelve el 100% a cada comprador.`}</p>
        <div style="display:flex;gap:.6rem;margin-top:1rem"><button class="btn btn-light btn-l" data-close style="flex:1">Cancelar</button><button class="btn btn-l" id="dodraw" style="flex:1">${s2.reached ? 'Sortear' : 'Devolver todo'}</button></div>`, {
        onOpen: (s, close) => $('#dodraw', s).addEventListener('click', () => { db.runDraw(c.id); close(); go('#/sorteo/' + c.id + '?vivo'); }),
      });
    });
  });
}

// =====================================================================
// RESULTADO
// =====================================================================
function viewDraw(id, live) {
  const c = db.cause(id);
  if (!c) return notFound();
  if (c.status === 'live') return go('#/causa/' + id);
  document.body.classList.add('no-tabbar');
  const r = c.result;
  const mine = db.purchases().filter(p => p.causeId === c.id);
  const iWon = mine.some(p => p.won);
  const myRefund = mine.filter(p => p.status === 'refunded').reduce((a, p) => a + p.amount, 0);
  const back = ADMIN ? '#/admin/' + c.id : '#/';
  if (c.status === 'refunded') {
    view.innerHTML = `
      ${subbar(back, esc(c.title), 'Resultado')}
      <section class="result">
        <div class="res-ic" style="background:var(--sun-50);color:#7A5200">${icon('refresh', 44, 2.2)}</div>
        <h1>No se cumplió la meta</h1>
        <p class="lead">Se reunieron ${clp(r.raised)} de ${clp(c.goal)}. Como no se alcanzó, no hubo sorteo y cada compra se devolvió al mismo medio de pago.</p>
        <div class="card pad"><dl class="kv"><dt>Reunido</dt><dd>${clp(r.raised)}</dd><dt>Devuelto en este teléfono</dt><dd>${clp(r.refunded)}</dd>${myRefund ? `<dt>Te devolvimos</dt><dd>${clp(myRefund)}</dd>` : ''}</dl></div>
      </section>`;
    return;
  }
  view.innerHTML = `
    <section class="draw">
      ${subbar(back, esc(c.title), 'Resultado del sorteo')}
      <div class="draw-hero">
        <span class="eyebrow">Número sorteado · ${fmtDateTime(r.at)}</span>
        <div class="ball ${live ? 'rolling' : ''}" id="ball"><div class="inner"><span class="digits mono" id="dg">${live ? '0000' : pad(r.number)}</span></div></div>
        <div id="after" style="${live ? 'opacity:0' : ''};transition:opacity .4s">
          <h1>${iWon ? 'Tu número salió sorteado' : 'Meta cumplida'}</h1>
          <p>${iWon ? `Te contactaremos para entregarte el premio: ${esc(c.prize)}.` : `El número ${pad(r.number)} gana ${esc(c.prize)}. Ya avisamos a quien lo compró.`}</p>
        </div>
      </div>
      <div class="impact">
        <span class="eyebrow">El resultado de la causa</span>
        ${c.outcome ? `<p class="outcome">${esc(c.outcome)}</p>` : ''}
        <div class="line"><span>Reunido</span><b class="num">${clp(r.raised)}</b></div>
        <div class="line"><span>Pagado a ${esc(c.provider.name)}</span><b class="num">${clp(r.paid)}</b></div>
        <div class="line"><span>Personas beneficiadas</span><b class="num">${(c.beneficiary.people || 1).toLocaleString('es-CL')}</b></div>
        <div class="line"><span>Números vendidos</span><b class="num">${r.soldCount.toLocaleString('es-CL')}</b></div>
        <button class="btn btn-block btn-light" id="receipt">${icon('doc', 20)} Ver comprobante de pago</button>
      </div>
      <details class="verify">
        <summary>${icon('shield', 20)} Cómo saber que el sorteo fue limpio</summary>
        <p>Antes de vender el primer número publicamos una huella digital de una clave secreta. Hoy revelamos la clave. Si la huella coincide, nadie pudo cambiarla después.</p>
        <span class="lbl">Huella publicada antes de vender</span><code class="mono">${c.seedHash}</code>
        <span class="lbl">Clave revelada</span><code class="mono">${c.seed}</code>
        <span class="small">Ganador = números vendidos ordenados [ sha256(clave:${esc(c.id)}:${r.soldCount}) mod ${r.soldCount} ], posición ${r.idx}.</span>
        <div id="vres"></div>
        <button class="btn btn-sun btn-block" id="verify">${icon('check', 20, 2.6)} Comprobar en mi teléfono</button>
      </details>
    </section>`;
  $('#verify').addEventListener('click', () => {
    const okHash = sha256(c.seed) === c.seedHash;
    const sold = [...db.soldSet(c)].sort((a, b) => a - b);
    const w = pickWinner(c.seed, c.id, sold);
    const ok = okHash && w.number === r.number;
    $('#vres').innerHTML = `<div class="ok ${ok ? '' : 'ko'}">${icon(ok ? 'check' : 'alert', 20, 3)} ${ok ? `Todo coincide: la huella es correcta y el número sorteado es el ${pad(w.number)}.` : 'Algo no coincide. Contáctanos.'}</div>`;
  });
  $('#receipt').addEventListener('click', () => sheet(`
    <h2>Comprobante de pago</h2>
    <div class="card pad" style="margin-top:.75rem"><dl class="kv">
      <dt>Pagado a</dt><dd>${esc(c.provider.name)}</dd><dt>Monto</dt><dd>${clp(r.paid)}</dd>
      <dt>Concepto</dt><dd>${esc(c.treatment)}</dd><dt>A favor de</dt><dd>${esc(c.beneficiary.name)}</dd>
      <dt>Fecha</dt><dd>${fmtDate(r.at)}</dd><dt>Organizó</dt><dd>${esc(c.organizer.name)}</dd></dl></div>
    <p class="muted" style="font-size:.9375rem">En la versión final aquí se adjunta la factura emitida por el proveedor.</p>
    <button class="btn btn-block btn-l" data-close>Cerrar</button>`));
  if (live) {
    const dg = $('#dg'), t0 = performance.now(), target = pad(r.number);
    let raf;
    const tick = now => {
      const k = (now - t0) / 2600;
      if (k >= 1) {
        dg.textContent = target; $('#ball').classList.remove('rolling'); $('#after').style.opacity = 1;
        navigator.vibrate?.([30, 40, 60]); confetti($('.draw'), iWon ? 100 : 50);
        history.replaceState(null, '', '#/sorteo/' + id); return;
      }
      const fixed = Math.floor(k * 5);
      dg.textContent = target.split('').map((ch, i) => i < fixed ? ch : Math.floor(Math.random() * 10)).join('');
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    onLeave(() => cancelAnimationFrame(raf));
  }
}

function notFound() {
  view.innerHTML = `${topbar()}<div class="empty" style="margin-top:3rem"><b>No encontramos esa página</b><a class="btn btn-l" href="#/">Volver al inicio</a></div>`;
}


// =====================================================================
// INTRO: transición al abrir la app (una vez por sesión)
// =====================================================================
const INTRO = [
  { photo: 'photo-1768244016879-a0f41e01281c', html: 'Cuando una comunidad <span class="mark">se organiza</span>…' },
  { photo: 'photo-1473649085228-583485e6e4d7', html: '…un curso entero <span class="mark">aprende</span> con lo que necesita,' },
  { photo: 'photo-1664441342319-ac6034edead5', html: 'una familia <span class="mark">vuelve</span> a su casa,' },
  { photo: 'photo-1758686253896-e6c76b6f7aa1', html: 'y alguien vuelve a caminar <span class="mark">sin dolor</span>.' },
  { type: 'ticket', dur: 5200 },
  { type: 'dots', dur: 5600 },
  { type: 'final', dur: 4200 },
];
const SCENE_MS = 4200;

function introScene(s) {
  if (s.type === 'ticket') return `<div class="scene g-scene" aria-hidden="true">
      <div class="g-in">
        <div class="i-ticket"><span class="lbl">Tu número</span><span class="n mono">0847</span><span class="p">$2.000</span></div>
        <p class="g-t">Tu número puede ser parte de…</p>
        <ul class="i-uses">
          <li style="--d:.9s"><i style="background:#2a78d6">${icon('steth', 20, 2.2)}</i>una cirugía</li>
          <li style="--d:1.6s"><i style="background:#eb6834">${icon('book', 20, 2.2)}</i>una sala temperada</li>
          <li style="--d:2.3s"><i style="background:#1baf7a">${icon('home', 20, 2.2)}</i>un techo nuevo</li>
        </ul>
      </div></div>`;
  if (s.type === 'dots') return `<div class="scene g-scene" aria-hidden="true">
      <div class="g-in">
        <div class="i-dots">${Array.from({ length: 100 }, (_, k) => `<i style="--d:${(k * 0.03).toFixed(2)}s"></i>`).join('')}</div>
        <b class="i-count num" data-to="2000000">$0</b>
        <p class="g-t">Mil personas, un número cada una.<br><span class="mark">Juntas hacen posible lo que nadie lograría solo.</span></p>
      </div></div>`;
  if (s.type === 'final') return `<div class="scene final"><div class="final-in">${logo(72)}
      <h1>Cada número <span class="mark">suma</span>.</h1>
      <p>Rifas solidarias que cambian la vida de las personas.</p></div></div>`;
  return `<div class="scene" aria-hidden="true">
      <img src="https://images.unsplash.com/${s.photo}?auto=format&fit=crop&w=1000&q=70" alt="" onerror="this.remove()">
      <p class="scene-t">${s.html}</p></div>`;
}

function playIntro() {
  return new Promise(resolve => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const el = document.createElement('div');
    el.className = 'intro'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Bienvenida a unamano');
    el.innerHTML = `
      <div class="intro-bars" aria-hidden="true">${INTRO.map(() => '<i><b></b></i>').join('')}</div>
      <button class="intro-skip" type="button">Saltar</button>
      ${INTRO.map(introScene).join('')}
      <span class="intro-hint" aria-hidden="true">Toca para avanzar</span>`;
    document.body.append(el);
    const scenes = $$('.scene', el), bars = $$('.intro-bars b', el);
    let i = -1, timer, done = false;
    const finish = () => {
      if (done) return; done = true; clearTimeout(timer);
      el.classList.add('out');
      sessionStorage.setItem('unamano:intro', '1');
      setTimeout(() => { el.remove(); resolve(); }, 800);
    };
    const next = () => {
      i++;
      if (i >= scenes.length) return finish();
      scenes.forEach((sc, k) => sc.classList.toggle('on', k === i));
      bars.forEach((b, k) => { b.style.transition = 'none'; b.style.width = k < i ? '100%' : '0%'; });
      const dur = reduce ? 3000 : (INTRO[i].dur || SCENE_MS);
      requestAnimationFrame(() => requestAnimationFrame(() => { bars[i].style.transition = `width ${dur}ms linear`; bars[i].style.width = '100%'; }));
      const cnt = scenes[i].querySelector('[data-to]');
      if (cnt) setTimeout(() => countUp(cnt, +cnt.dataset.to, v => clp(v), 3000), 300);
      timer = setTimeout(next, dur);
    };
    if (reduce) i = scenes.length - 2;
    $('.intro-skip', el).addEventListener('click', e => { e.stopPropagation(); finish(); });
    el.addEventListener('click', () => { clearTimeout(timer); next(); });
    document.addEventListener('keydown', function k(e) { if (e.key === 'Escape') { document.removeEventListener('keydown', k); finish(); } });
    next();
  });
}

// ---------- router ----------
const routes = [
  [/^#?\/?$/, viewImpact, 'home'],
  [/^#\/causas$/, viewCauses, 'causes'],
  [/^#\/causa\/([\w-]+)$/, viewCause, 'causes'],
  [/^#\/causa\/([\w-]+)\/comprar$/, viewBuy, 'causes'],
  [/^#\/causa\/([\w-]+)\/numeros$/, viewNumbers, 'causes'],
  [/^#\/pago$/, viewCheckout, 'causes'],
  [/^#\/gracias\/([\w-]+)$/, viewThanks, 'mine'],
  [/^#\/mis-numeros$/, viewMine, 'mine'],
  [/^#\/postular$/, viewApplyHome, 'apply'],
  [/^#\/postular\/nueva$/, viewApply, 'apply'],
  [/^#\/postulacion\/([\w-]+)$/, viewMyCase, 'apply'],
  [/^#\/admin$/, viewAdmin, ''],
  [/^#\/admin\/([\w-]+)$/, viewAdminCase, ''],
  [/^#\/sorteo\/([\w-]+)(\?vivo)?$/, (id, live) => viewDraw(id, !!live), 'home'],
];

function route() {
  cleanup.forEach(f => { try { f(); } catch { /* */ } });
  cleanup = [];
  $('#sheet-root').innerHTML = '';
  let h = location.hash || HOME;
  if (ADMIN && !/^#\/(admin|sorteo|causa\/[\w-]+$)/.test(h)) { history.replaceState(null, '', '#/admin'); h = '#/admin'; }
  for (const [re, fn, tab] of routes) {
    const m = h.match(re);
    if (!m) continue;
    const run = () => {
      document.body.classList.toggle('no-tabbar', ADMIN);
      $$('.tabbar [data-tab]').forEach(a => { const on = a.dataset.tab === tab; a.classList.toggle('on', on); on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'); });
      fn(...m.slice(1));
      window.scrollTo(0, 0);
    };
    if (document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const t = document.startViewTransition(run); t.ready.catch(() => {}); t.finished.catch(() => {});
    } else run();
    return;
  }
  go(HOME);
}

db.load();
bindTooltips(document);
window.addEventListener('hashchange', route);
const atHome = !location.hash || location.hash === '#/' || location.hash === '#';
if (!ADMIN && atHome && !sessionStorage.getItem('unamano:intro') && !new URLSearchParams(location.search).has('sinintro')) {
  route();
  playIntro();
} else route();
