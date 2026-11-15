// unamano — app (SPA con router por hash)
import * as db from './data.js';
import { CATEGORIES, CHECKS, ORG_TYPES, clp, pad, computePlan, OPS_PCT } from './data.js';
import { photo, verifiedPill, seal } from './media.js';
import { icon, logo, wordmark } from './icons.js';
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

function toast(msg, kind = '') {
  const t = document.createElement('div');
  t.className = 'toast ' + kind; t.textContent = msg; t.setAttribute('role', 'status');
  $('#toast-root').append(t);
  setTimeout(() => { t.style.transition = 'opacity .3s'; t.style.opacity = 0; setTimeout(() => t.remove(), 300); }, 2800);
}

function sheet(html, { onOpen } = {}) {
  const root = $('#sheet-root');
  root.innerHTML = `<div class="sheet-bg" data-close></div><div class="sheet" role="dialog" aria-modal="true">${html}</div>`;
  const prev = document.activeElement;
  const close = () => { root.innerHTML = ''; document.removeEventListener('keydown', onKey); prev?.focus?.(); };
  const onKey = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  root.addEventListener('click', e => { if (e.target.closest('[data-close]')) close(); }, { once: false });
  const s = $('.sheet', root);
  const f = s.querySelector('button, a, input'); f?.focus({ preventScroll: true });
  onOpen?.(s, close);
  return close;
}

const cart = {
  get() { try { return JSON.parse(sessionStorage.getItem('unamano:cart')) || null; } catch { return null; } },
  set(v) { sessionStorage.setItem('unamano:cart', JSON.stringify(v)); },
  clear() { sessionStorage.removeItem('unamano:cart'); },
};

function confetti(el, n = 70) {
  const box = document.createElement('div'); box.className = 'confetti'; box.setAttribute('aria-hidden', 'true');
  const cols = ['#FFC845', '#0E7A5F', '#FF6B57', '#7CD3B4', '#FFE08A', '#2B45B8'];
  for (let i = 0; i < n; i++) {
    const p = document.createElement('i');
    if (i % 3 === 0) p.className = 'ball';
    p.style.left = Math.random() * 100 + '%';
    p.style.background = cols[i % cols.length];
    p.style.setProperty('--dx', (Math.random() * 160 - 80) + 'px');
    p.style.setProperty('--r', (Math.random() * 900 - 450) + 'deg');
    p.style.animationDuration = 2.2 + Math.random() * 2.4 + 's';
    p.style.animationDelay = Math.random() * .6 + 's';
    box.append(p);
  }
  el.append(box);
  setTimeout(() => box.remove(), 6000);
}

function progressBar(pct) {
  return `<div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct)}" aria-label="Avance hacia la meta"><i style="--p:${Math.max(3, pct)}%"></i></div>`;
}

function installBtn(cls = 'btn btn-s btn-light') {
  return pwa.canInstall() ? `<button class="${cls}" data-install>${icon('download', 18)} Instalar</button>` : '';
}

async function doInstall() {
  const r = await pwa.install();
  if (r === 'ios') {
    sheet(`<h2>Instálala en tu iPhone</h2>
      <p>Así queda como app en tu pantalla de inicio, sin pasar por la App Store.</p>
      <ol class="ios-steps">
        <li>Abre esta página en Safari.</li>
        <li>Toca el botón Compartir ${icon('share', 18)} en la barra inferior.</li>
        <li>Elige «Agregar a pantalla de inicio».</li>
        <li>Confirma con «Agregar». Listo.</li>
      </ol>
      <button class="btn btn-block" data-close>Entendido</button>`);
  } else if (r === 'none') {
    toast('Abre el menú del navegador y elige «Instalar app» o «Agregar a pantalla de inicio».');
  }
}

document.addEventListener('click', e => {
  if (e.target.closest('[data-install]')) { e.preventDefault(); doInstall(); }
  if (e.target.closest('[data-more]')) { e.preventDefault(); openMore(); }
});

function openMore() {
  sheet(`<h2>Más</h2>
    <ul class="menu">
      ${pwa.canInstall() ? `<li><button data-install data-close><span class="mi">${icon('download')}</span><span>Instalar la app<small>Queda en tu pantalla de inicio</small></span></button></li>` : ''}
      <li><a href="#/postular" data-close><span class="mi">${icon('hand')}</span><span>Mis postulaciones<small>Sigue el estado de tu caso</small></span></a></li>
      <li><a href="../admin/" data-close><span class="mi">${icon('shield')}</span><span>Panel de administración<small>Para el equipo · PIN de demo 1234</small></span></a></li>
      <li><a href="../" data-close><span class="mi">${icon('heart')}</span><span>Cómo funciona unamano<small>Ir a la página principal</small></span></a></li>
      <li><button data-reset><span class="mi" style="background:var(--coral-50);color:var(--coral)">${icon('refresh')}</span><span>Reiniciar la demo<small>Borra compras y postulaciones de este teléfono</small></span></button></li>
    </ul>`, {
    onOpen: (s, close) => {
      $('[data-reset]', s).addEventListener('click', () => { db.reset(); cart.clear(); close(); toast('Demo reiniciada'); route(); });
      $$('a[data-close]', s).forEach(a => a.addEventListener('click', () => setTimeout(close, 0)));
    },
  });
}

function shareCause(c) {
  const url = new URL(`#/causa/${c.id}`, location.href).href;
  const data = { title: c.title, text: `${c.title}. Rifa solidaria verificada por unamano.`, url };
  if (navigator.share) navigator.share(data).catch(() => {});
  else navigator.clipboard?.writeText(url).then(() => toast('Enlace copiado'), () => toast(url));
}

// ---------- vistas ----------

function viewHome() {
  const prof = db.profile();
  const live = db.causes({ status: 'live' });
  const soon = live.slice().sort((a, b) => a.drawAt - b.drawAt).slice(0, 4);
  let cat = 'all', q = '';

  view.innerHTML = `
    <header class="topbar">
      <a class="brand" href="#/" aria-label="unamano, inicio">${logo(34)}${wordmark(24)}</a>
      <div class="topbar-r">${installBtn()}<a href="#/mis-numeros" class="icon-btn" aria-label="Mis números">${icon('ticket')}</a></div>
    </header>
    <section class="hello">
      <p>${prof.name ? 'Hola, ' + esc(prof.name.split(' ')[0]) : 'Rifas solidarias verificadas'}</p>
      <h1>¿A quién le echamos <span class="warm">una mano</span> hoy?</h1>
    </section>
    <label class="search">${icon('search', 20)}<span class="sr-only">Buscar causas</span>
      <input type="search" id="q" placeholder="Nombre, comuna o tratamiento" autocomplete="off"></label>
    <div class="chips" role="group" aria-label="Filtrar por tipo">
      <button aria-pressed="true" data-cat="all">Todas</button>
      ${Object.entries(CATEGORIES).map(([k, v]) => `<button aria-pressed="false" data-cat="${k}">${v}</button>`).join('')}
    </div>
    <h2 class="sec-t">Cierran pronto <small>${plural(live.length, 'causa activa', 'causas activas')}</small></h2>
    <div class="rail">${soon.map(posterCard).join('')}</div>
    <h2 class="sec-t">Todas las causas</h2>
    <div class="list" id="list"></div>
    <div class="promises">
      <div class="promise"><span class="pi">${icon('clinic')}</span><div><b>La plata va directo a la clínica</b><span>Nunca pasa por la familia ni por quien organiza.</span></div></div>
      <div class="promise"><span class="pi">${icon('refresh')}</span><div><b>Si no se llega a la meta, se devuelve todo</b><span>Automático, al mismo medio de pago.</span></div></div>
      <div class="promise"><span class="pi">${icon('hash')}</span><div><b>Sorteo que cualquiera puede auditar</b><span>La huella se publica antes de vender el primer número.</span></div></div>
    </div>
    <div class="demo-banner" style="margin-top:22px">${icon('alert', 16)} <span>Versión demo: las causas son de ejemplo y los pagos son simulados.</span></div>
    <a class="cta-apply" href="#/postular">
      <div><h3>¿Conoces a alguien que necesita una mano?</h3><p>Postula el caso junto a tu junta de vecinos, club o centro de padres.</p></div>
      <span class="arr">${icon('arrow')}</span>
    </a>`;

  const renderList = () => {
    const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const items = db.causes({ status: ['live', 'drawn'] })
      .filter(c => cat === 'all' || c.category === cat)
      .filter(c => !q || norm([c.title, c.treatment, c.beneficiary.comuna, c.beneficiary.first, c.organizer.name].join(' ')).includes(norm(q)))
      .sort((a, b) => (a.status === 'live' ? 0 : 1) - (b.status === 'live' ? 0 : 1) || a.drawAt - b.drawAt);
    $('#list').innerHTML = items.length ? items.map(rowCard).join('') : `<p class="empty-list">No encontramos causas con ese filtro.</p>`;
  };
  renderList();
  $('#q').addEventListener('input', e => { q = e.target.value.trim(); renderList(); });
  $$('.chips button').forEach(b => b.addEventListener('click', () => {
    cat = b.dataset.cat; $$('.chips button').forEach(x => x.setAttribute('aria-pressed', x === b)); renderList();
  }));
  const off = pwa.onInstallChange(() => { const r = $('.topbar-r'); if (r) r.innerHTML = installBtn() + `<a href="#/mis-numeros" class="icon-btn" aria-label="Mis números">${icon('ticket')}</a>`; });
  onLeave(off);
}

function posterCard(c) {
  const s = db.stats(c);
  const hot = s.ms < 2 * 864e5;
  return `<a class="fcard" href="#/causa/${c.id}">
    <div style="position:relative">${photo(c, { w: 700 })}
      <div class="fcard-top">${verifiedPill()}<span class="time-pill ${hot ? 'hot' : ''}">${icon('clock', 14, 2.4)} ${db.timeLeft(s.ms)}</span></div></div>
    <div class="fcard-b">
      <span class="fcard-t">${esc(c.title)}</span>
      <span class="fcard-o">${esc(c.organizer.name)} · ${esc(c.beneficiary.comuna)}</span>
      ${progressBar(s.pct)}
      <div class="money-row"><span><b>${clp(s.raised)}</b> de ${clp(c.goal)}</span><span class="pct">${Math.floor(s.pct)}%</span></div>
    </div>
  </a>`;
}

function rowCard(c) {
  const s = db.stats(c);
  const done = c.status !== 'live';
  return `<a class="row" href="#/causa/${c.id}">
    ${photo(c, { w: 300 })}
    <div class="row-b">
      <span class="row-t">${esc(c.title)}</span>
      <span class="row-s">${esc(c.beneficiary.comuna)} · ${CATEGORIES[c.category]}</span>
      ${done ? `<span class="chip chip-ok" style="align-self:flex-start">${icon('check', 14, 3)} Meta cumplida</span>` : progressBar(s.pct)}
      ${done ? '' : `<span class="row-s"><b>${Math.floor(s.pct)}%</b> · quedan ${db.timeLeft(s.ms)}</span>`}
    </div>
  </a>`;
}

function splitBlock(c) {
  const sp = c.split;
  const segs = [
    { k: 'treatment', label: 'Tratamiento', color: 'var(--brand)', fg: '#fff', txt: `Pago directo a ${esc(c.clinic.name)}` },
    { k: 'prize', label: 'Premio', color: 'var(--sun)', fg: 'var(--ink)', txt: c.prizeMode === 'donado' ? 'El premio fue donado' : 'Compra del premio' },
    { k: 'ops', label: 'Verificación y operación', color: 'var(--coral)', fg: '#fff', txt: 'Equipo que revisa cada caso, pagos y plataforma' },
  ].filter(x => sp[x.k] > 0);
  return `<div class="split-bar" role="img" aria-label="${segs.map(s => `${s.label} ${sp[s.k]}%`).join(', ')}">
      ${segs.map(s => `<div style="flex:${sp[s.k]};background:${s.color};color:${s.fg}">${sp[s.k]}%</div>`).join('')}
    </div>
    <div class="split-legend">${segs.map(s => `<div><i style="background:${s.color}"></i><span><b style="color:var(--ink)">${s.label}:</b> ${s.txt}</span></div>`).join('')}</div>`;
}

function viewCause(id) {
  const c = db.cause(id);
  if (!c || !['live', 'drawn', 'refunded'].includes(c.status)) return notFound();
  const s = db.stats(c);
  document.body.classList.add('no-tabbar');
  const cheer = s.pct >= 90 ? `¡Queda muy poco! Faltan ${clp(s.missing)} para la meta.`
    : s.pct >= 50 ? `Ya vamos en más de la mitad. Faltan ${clp(s.missing)}.`
    : `Cada número suma. Faltan ${clp(s.missing)} para la meta.`;
  view.innerHTML = `
    <article>
      <div class="cause-hero">
        ${photo(c, { w: 1000 })}
        <div class="hero-top">
          <a href="${ADMIN ? '#/admin' : '#/'}" class="icon-btn float" aria-label="Volver">${icon('back')}</a>
          <button class="icon-btn float" data-share aria-label="Compartir">${icon('share')}</button>
        </div>
      </div>
      <div class="cause-sheet">
        ${seal(84)}
        <div>
          <span class="eyebrow">${CATEGORIES[c.category]} · ${esc(c.beneficiary.comuna)}</span>
          <h1>${esc(c.title)}</h1>
          <p class="lead">${esc(c.treatment)} para ${esc(c.beneficiary.first)}, ${esc(c.beneficiary.age)} años.</p>
        </div>
        <div class="org-line"><span class="oi">${icon('people')}</span><div>Organiza la rifa<b>${esc(c.organizer.name)}</b></div></div>

        <div class="meter">
          <div class="meter-amt num">${clp(s.raised)}</div>
          <div class="meter-sub">recaudados de una meta de <b>${clp(c.goal)}</b></div>
          ${progressBar(s.pct)}
          <div class="meter-row">
            <div><b class="num">${Math.floor(s.pct)}%</b><span>de la meta</span></div>
            <div><b class="num">${s.sold.toLocaleString('es-CL')}</b><span>números vendidos</span></div>
            <div><b data-countdown>${c.status === 'live' ? db.timeLeft(s.ms) : 'Cerrada'}</b><span>${c.status === 'live' ? 'para el sorteo' : fmtDate(c.drawAt)}</span></div>
          </div>
          ${c.status === 'live' ? `<div class="cheer">${icon('heart', 18, 2.4)}<span>${cheer}</span></div>` : ''}
        </div>

        <div class="prize">
          <span class="prize-ic">${icon('gift', 26)}</span>
          <div><span class="eyebrow">El premio</span><span class="prize-name">${esc(c.prize)}</span>
          <span class="prize-mode">${c.prizeMode === 'donado' ? 'Donado, no sale de lo recaudado' : `Se compra con el ${c.split.prize}% de lo recaudado`} · sorteo el ${fmtDateTime(c.drawAt)}</span></div>
        </div>

        <section class="block"><h2>La historia de ${esc(c.beneficiary.first)}</h2><p>${esc(c.story)}</p></section>

        <section class="trust">
          <div class="trust-h"><span class="ck" style="width:44px;height:44px;border-radius:14px">${icon('shield', 22, 2.2)}</span>
            <div><h2>Lo que verificamos</h2><p>Antes de publicar, nuestro equipo revisó todo esto.</p></div></div>
          <ul class="checks">
            ${CHECKS.map(k => `<li><span class="ck ${c.checks[k.key] ? '' : 'no'}">${icon(c.checks[k.key] ? 'check' : 'clock', 15, 3)}</span><div><b>${k.label}</b><span>${k.how}${k.key === 'medico' ? ` · ${esc(c.doctor.name)}, ${esc(c.doctor.specialty)}` : ''}${k.key === 'clinica' ? ` · ${esc(c.clinic.name)}, ${clp(c.clinic.budget)}` : ''}</span></div></li>`).join('')}
          </ul>
          <div class="hash-line">${icon('hash', 16)}<span>Huella del sorteo, publicada antes de vender: <code>${c.seedHash.slice(0, 16)}…</code></span></div>
        </section>

        <section class="block"><h2>A dónde va tu plata</h2>${splitBlock(c)}</section>

        <div class="guarantee"><span class="gi">${icon('refresh')}</span><div><b>Devolución garantizada</b><span>Si al ${fmtDate(c.drawAt)} no se llega a la meta, te devolvemos el 100% al mismo medio de pago.</span></div></div>
      </div>
      <div class="buybar">
        ${c.status === 'live' ? `
          <div class="pr"><b class="num">${clp(c.price)}</b><span>por número · quedan ${s.available.toLocaleString('es-CL')}</span></div>
          <a class="btn btn-l" href="#/causa/${c.id}/numeros">${icon('ticket', 20)} Elegir números</a>` : `
          <div class="pr"><b>${c.status === 'drawn' ? 'Meta cumplida' : 'Devuelta'}</b><span>${c.status === 'drawn' ? 'Ya se hizo el sorteo' : 'No se llegó a la meta'}</span></div>
          <a class="btn btn-l" href="#/sorteo/${c.id}">Ver resultado ${icon('arrow', 18)}</a>`}
      </div>
    </article>`;
  $('[data-share]').addEventListener('click', () => shareCause(c));
  if (c.status === 'live') {
    const t = setInterval(() => { const el = $('[data-countdown]'); if (el) el.textContent = db.timeLeft(c.drawAt - Date.now()); }, 30_000);
    onLeave(() => clearInterval(t));
  }
}

function viewNumbers(id) {
  const c = db.cause(id);
  if (!c || c.status !== 'live') return notFound();
  document.body.classList.add('no-tabbar');
  const sold = db.soldSet(c);
  const prev = cart.get();
  const sel = new Set(prev && prev.causeId === id ? prev.numbers : []);
  const PAGE = 100;
  const pages = Math.ceil(c.total / PAGE);
  let page = 0, qty = 1;
  const MAX = 50;

  view.innerHTML = `
    <header class="subbar">
      <a href="#/causa/${c.id}" class="icon-btn" aria-label="Volver a la causa">${icon('back')}</a>
      <div><small>${esc(c.title)}</small><h1>Elige tus números</h1></div>
    </header>
    <div class="pick-tools">
      <div class="stepper" aria-label="Cantidad al azar">
        <button type="button" data-q="-1" aria-label="Menos">${icon('minus', 18)}</button>
        <output id="qty">1</output>
        <button type="button" data-q="1" aria-label="Más">${icon('plus', 18)}</button>
      </div>
      <button class="btn btn-s btn-light" id="rnd">${icon('dice', 18)} Al azar</button>
      <button class="btn btn-s btn-ghost" id="clr">Limpiar</button>
    </div>
    <div class="pages" role="group" aria-label="Rango de números" id="pages"></div>
    <div class="legend"><span><i style="background:#fff;border:1px solid var(--line)"></i>Libre</span><span><i style="background:var(--brand)"></i>Tuyos</span><span><i style="background:var(--surface-2)"></i>Vendido</span></div>
    <div class="ngrid" id="grid" role="group" aria-label="Números"></div>
    <div class="tray">
      <div class="tray-chips" id="chips"></div>
      <div class="tray-row">
        <div class="t"><span id="cnt"></span><b id="tot" class="num"></b></div>
        <button class="btn" id="go">Continuar ${icon('arrow', 18)}</button>
      </div>
    </div>`;

  const renderPages = () => {
    $('#pages').innerHTML = Array.from({ length: pages }, (_, i) => {
      const a = i * PAGE + 1, b = Math.min(c.total, (i + 1) * PAGE);
      const mine = [...sel].some(n => n >= a && n <= b);
      return `<button aria-pressed="${i === page}" data-p="${i}">${pad(a)}–${pad(b)}${mine ? '<span class="dot" aria-label="con números tuyos"></span>' : ''}</button>`;
    }).join('');
  };
  const renderGrid = () => {
    const a = page * PAGE + 1, b = Math.min(c.total, (page + 1) * PAGE);
    let h = '';
    for (let n = a; n <= b; n++) {
      const taken = sold.has(n);
      h += `<button data-n="${n}" ${taken ? 'disabled aria-label="' + pad(n) + ' vendido"' : ''} aria-pressed="${sel.has(n)}">${pad(n)}</button>`;
    }
    $('#grid').innerHTML = h;
  };
  const renderTray = () => {
    const arr = [...sel].sort((x, y) => x - y);
    $('#chips').innerHTML = arr.length ? arr.map(n => `<span>${pad(n)}</span>`).join('') : `<em>Toca un número o usa «Al azar»</em>`;
    $('#cnt').textContent = `${plural(arr.length, 'número', 'números')} × ${clp(c.price)}`;
    $('#tot').textContent = clp(arr.length * c.price);
    $('#go').disabled = !arr.length;
    $('#go').classList.toggle('is-disabled', !arr.length);
    cart.set({ causeId: id, numbers: arr });
  };
  renderPages(); renderGrid(); renderTray();

  $('#pages').addEventListener('click', e => {
    const b = e.target.closest('[data-p]'); if (!b) return;
    page = +b.dataset.p; renderPages(); renderGrid();
  });
  $('#grid').addEventListener('click', e => {
    const b = e.target.closest('[data-n]'); if (!b || b.disabled) return;
    const n = +b.dataset.n;
    if (sel.has(n)) sel.delete(n);
    else { if (sel.size >= MAX) return toast(`Máximo ${MAX} números por compra`, 'bad'); sel.add(n); navigator.vibrate?.(8); }
    b.setAttribute('aria-pressed', sel.has(n)); renderTray(); renderPages();
  });
  $$('[data-q]').forEach(b => b.addEventListener('click', () => { qty = Math.max(1, Math.min(10, qty + +b.dataset.q)); $('#qty').textContent = qty; }));
  $('#rnd').addEventListener('click', () => {
    const free = [];
    for (let n = 1; n <= c.total; n++) if (!sold.has(n) && !sel.has(n)) free.push(n);
    if (!free.length) return toast('No quedan números libres', 'bad');
    const picked = [];
    for (let i = 0; i < qty && free.length && sel.size < MAX; i++) {
      const n = free.splice(Math.floor(Math.random() * free.length), 1)[0]; sel.add(n); picked.push(n);
    }
    page = Math.floor((picked[picked.length - 1] - 1) / PAGE);
    renderPages(); renderGrid(); renderTray();
    toast(`¡Te tocó el ${picked.map(n => pad(n)).join(', ')}!`);
  });
  $('#clr').addEventListener('click', () => { sel.clear(); renderPages(); renderGrid(); renderTray(); });
  $('#go').addEventListener('click', () => { if (sel.size) go('#/checkout'); });
}

function viewCheckout() {
  const k = cart.get();
  const c = k && db.cause(k.causeId);
  if (!c || !k.numbers?.length) return go('#/');
  document.body.classList.add('no-tabbar');
  const prof = db.profile();
  const total = k.numbers.length * c.price;
  view.innerHTML = `
    <header class="subbar">
      <a href="#/causa/${c.id}/numeros" class="icon-btn" aria-label="Volver a los números">${icon('back')}</a>
      <div><small>Paso final</small><h1>Tu aporte</h1></div>
    </header>
    <div class="summary">
      ${photo(c, { w: 300 })}
      <div class="summary-b">
        <span class="t">${esc(c.title)}</span>
        <div class="nums">${k.numbers.map(n => `<span>${pad(n)}</span>`).join('')}</div>
      </div>
    </div>
    <div class="total-line"><span>${plural(k.numbers.length, 'número', 'números')} × ${clp(c.price)}</span><b class="num">${clp(total)}</b></div>
    <form class="form" id="f" novalidate>
      <div class="field"><label for="n">Nombre y apellido</label><input id="n" name="name" autocomplete="name" required value="${esc(prof.name || '')}"></div>
      <div class="field"><label for="e">Correo</label><input id="e" name="email" type="email" inputmode="email" autocomplete="email" required value="${esc(prof.email || '')}"><span class="hint">Aquí te llegan tus números y el resultado del sorteo.</span></div>
      <div class="field"><label for="t">Celular</label><input id="t" name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+56 9 1234 5678" required value="${esc(prof.phone || '')}"></div>
      <div class="field"><span class="lbl">Medio de pago</span>
        <div class="opts">
          <label class="opt"><input type="radio" name="method" value="Webpay" checked><span class="radio"></span><div><b>Tarjeta de débito o crédito</b><span>Webpay</span></div><span class="logo-pay">WEBPAY</span></label>
          <label class="opt"><input type="radio" name="method" value="Mercado Pago"><span class="radio"></span><div><b>Mercado Pago</b><span>Saldo o tarjetas guardadas</span></div><span class="logo-pay">MP</span></label>
          <label class="opt"><input type="radio" name="method" value="Transferencia"><span class="radio"></span><div><b>Transferencia</b><span>Desde tu banco, con confirmación inmediata</span></div><span class="logo-pay">BANCO</span></label>
        </div>
      </div>
      <label class="checkline"><input type="checkbox" name="terms" required><span>Leí y acepto las <button type="button" class="linkish" id="bases">bases de esta rifa</button>. Si no se llega a la meta, me devuelven todo.</span></label>
      <button class="btn btn-l btn-block" type="submit">${icon('lock', 20)} Pagar ${clp(total)}</button>
    </form>
    <p class="secure">${icon('shield', 16)} Modo demo: el pago es simulado y no se cobra dinero.</p>`;

  $('#bases').addEventListener('click', () => sheet(`
    <h2>Bases de la rifa</h2>
    <div class="block" style="font-size:15px;color:var(--ink-2);line-height:1.6">
      <p><b style="color:var(--ink)">Organiza:</b> ${esc(c.organizer.name)} (${esc(c.organizer.type)}), con fines benéficos a favor de ${esc(c.beneficiary.name)}.</p>
      <p><b style="color:var(--ink)">Números:</b> del ${pad(1)} al ${pad(c.total)}, a ${clp(c.price)} cada uno.</p>
      <p><b style="color:var(--ink)">Meta:</b> ${clp(c.goal)}. ${c.split.treatment}% se paga directamente a ${esc(c.clinic.name)}.</p>
      <p><b style="color:var(--ink)">Premio:</b> ${esc(c.prize)}.</p>
      <p><b style="color:var(--ink)">Sorteo:</b> ${fmtDateTime(c.drawAt)}. El ganador se calcula con la semilla cuya huella (${c.seedHash.slice(0, 12)}…) se publicó antes de la venta.</p>
      <p><b style="color:var(--ink)">Devolución:</b> si a la fecha del sorteo no se llega a la meta, se devuelve el 100% de cada compra al mismo medio de pago.</p>
    </div>
    <button class="btn btn-block" data-close>Cerrar</button>`));

  $('#f').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target;
    let ok = true;
    $$('.field', f).forEach(x => { x.classList.remove('err'); $('.errmsg', x)?.remove(); });
    const bad = (input, msg) => { ok = false; const fl = input.closest('.field'); fl.classList.add('err'); fl.insertAdjacentHTML('beforeend', `<span class="errmsg">${msg}</span>`); };
    if (f.name.value.trim().length < 3) bad(f.name, 'Escribe tu nombre.');
    if (!/^\S+@\S+\.\S+$/.test(f.email.value)) bad(f.email, 'Revisa el correo.');
    if (f.phone.value.replace(/\D/g, '').length < 8) bad(f.phone, 'Revisa el celular.');
    if (!f.terms.checked) { ok = false; toast('Debes aceptar las bases de la rifa', 'bad'); }
    if (!ok) { $('.err input', f)?.focus(); return; }
    const method = f.method.value;
    const ov = document.createElement('div'); ov.className = 'paying'; ov.setAttribute('role', 'alert');
    ov.innerHTML = `<div><div class="spin"></div><h2>Procesando tu pago…</h2><p>Conectando con ${esc(method)} (simulado)</p></div>`;
    document.body.append(ov);
    setTimeout(() => {
      try {
        const p = db.buy(c.id, k.numbers, { name: f.name.value.trim(), email: f.email.value.trim(), phone: f.phone.value.trim() }, method);
        cart.clear();
        ov.remove();
        go('#/gracias/' + p.id);
      } catch (err) {
        ov.remove(); toast(err.message, 'bad');
      }
    }, 1600);
  });
}

function viewThanks(pid) {
  const p = db.purchases().find(x => x.id === pid);
  if (!p) return go('#/mis-numeros');
  const c = db.cause(p.causeId);
  document.body.classList.add('no-tabbar');
  view.innerHTML = `
    <section class="thanks">
      <a href="#/" class="icon-btn" aria-label="Cerrar">${icon('close')}</a>
      <div class="big-heart">${icon('heart', 48, 2.2).replace('fill="none"', 'fill="currentColor"')}</div>
      <h1>¡Gracias, <span class="warm">${esc(p.buyer.name.split(' ')[0])}</span>!</h1>
      <p class="lead">Tu aporte de <b>${clp(p.amount)}</b> ya cuenta para ${esc(c.beneficiary.first)}. Estos son tus números para el sorteo del ${fmtDate(c.drawAt)}:</p>
      <div class="tix">
        ${p.numbers.slice(0, 8).map((n, i) => `<div class="tix-one ticket" style="--i:${i}"><span class="n">${pad(n)}</span><span class="m">Por ${esc(c.beneficiary.first)}<br>Sorteo ${fmtDate(c.drawAt)}</span></div>`).join('')}
        ${p.numbers.length > 8 ? `<p style="margin:0;font-weight:700">y ${p.numbers.length - 8} más en Mis números</p>` : ''}
      </div>
      <div style="display:flex;flex-direction:column;gap:12px;position:relative;z-index:2;margin-top:6px">
        <button class="btn btn-sun btn-block" data-share>${icon('share', 20)} Invita a otros a sumarse</button>
        <a class="btn btn-light btn-block" href="#/mis-numeros">Ver mis números</a>
      </div>
    </section>`;
  $('[data-share]').addEventListener('click', () => shareCause(c));
  confetti($('.thanks'));
}

function viewMine() {
  const ps = db.purchases();
  view.innerHTML = `
    <section class="page-head">
      <span class="eyebrow">Tu billetera solidaria</span>
      <h1>Mis números</h1>
    </section>
    ${ps.length ? `<div class="mine">${ps.map(p => {
      const c = db.cause(p.causeId);
      let chip, sub;
      if (p.status === 'refunded') { chip = `<span class="chip chip-sun">Devuelto ${clp(p.amount)}</span>`; sub = 'No se llegó a la meta. Te devolvimos todo.'; }
      else if (c.status === 'drawn' && p.won) { chip = `<span class="chip chip-coral">¡Ganaste!</span>`; sub = `Salió el ${pad(c.result.number)}. Te contactamos para la entrega.`; }
      else if (c.status === 'drawn') { chip = `<span class="chip chip-ok">Causa cumplida</span>`; sub = `Salió el ${pad(c.result.number)}. Esta vez no fue el tuyo, pero ${esc(c.beneficiary.first)} sí ganó.`; }
      else { chip = `<span class="chip chip-sky">Participando</span>`; sub = `Sorteo en ${db.timeLeft(c.drawAt - Date.now())} · ${fmtDate(c.drawAt)}`; }
      const href = c.status === 'live' ? `#/causa/${c.id}` : `#/sorteo/${c.id}`;
      return `<a class="mtk ${p.won ? 'won' : ''}" href="${href}">
        ${photo(c, { w: 200 })}
        <div class="mtk-b">${chip}<span class="t">${esc(c.title)}</span>
          <div class="nums">${p.numbers.map(n => `<span>${pad(n)}</span>`).join('')}</div>
          <span class="s">${sub}</span></div>
      </a>`;
    }).join('')}</div>` : `
      <div class="empty">
        <span class="em-ic">${icon('ticket', 34)}</span>
        <b>Todavía no tienes números</b>
        <p>Cuando compres, aquí verás tus tickets, cuándo es el sorteo y si te tocó.</p>
        <a class="btn" href="#/">Ver causas</a>
      </div>`}`;
}

// ---------- Postular ----------
const DRAFT = 'unamano:draft';
function viewApply() {
  let step = 0;
  let d;
  try { d = JSON.parse(sessionStorage.getItem(DRAFT)) || {}; } catch { d = {}; }
  d = Object.assign({ beneficiary: {}, organizer: {}, doctor: {}, price: 2000, prizeMode: 'porcentaje', prizePct: 12, category: 'cirugia', documents: [] }, d);
  const saveDraft = () => { try { sessionStorage.setItem(DRAFT, JSON.stringify(d)); } catch { /* foto muy grande */ } };
  const minDate = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);
  const maxDate = new Date(Date.now() + 90 * 864e5).toISOString().slice(0, 10);
  if (!d.drawDate) d.drawDate = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);

  const STEPS = [
    { t: '¿Quién necesita la mano?', p: 'Cuéntanos de la persona. Esto es lo que verá la gente que compre números.' },
    { t: 'El tratamiento', p: 'Lo validamos con el médico y la clínica. La plata se le paga directamente a la clínica.' },
    { t: 'La organización', p: 'La rifa la organiza una organización con personalidad jurídica, no una persona.' },
    { t: 'La rifa', p: 'Elige precio, premio y fecha. Calculamos la meta para que el tratamiento quede cubierto.' },
    { t: 'Documentos', p: 'Con esto parte la verificación. Te contactamos en 24 a 48 horas hábiles.' },
  ];

  const field = (id, label, val, attrs = '', hint = '') =>
    `<div class="field"><label for="${id}">${label}</label><input id="${id}" value="${esc(val ?? '')}" ${attrs}>${hint ? `<span class="hint">${hint}</span>` : ''}</div>`;

  const previewCause = () => ({ id: 'preview', palette: d.palette ?? 0, category: d.category, beneficiary: { first: d.beneficiary.first || 'Nombre', age: d.beneficiary.age }, cover: d.cover });

  const bodies = [
    () => `
      <div class="preview-card"><span id="pp">${photo(previewCause())}</span>
        <div><b>Una buena foto hace la diferencia</b><p>Que se vea su cara y, si se puede, sonriendo. Es lo primero que verá la gente.</p></div>
      </div>
      <div class="form">
        ${field('b-name', 'Nombre completo del beneficiario', d.beneficiary.name, 'required autocomplete="off" data-k="beneficiary.name"')}
        <div class="row2">
          ${field('b-first', 'Cómo le dicen', d.beneficiary.first, 'required data-k="beneficiary.first" maxlength="10"', 'Va en grande en el afiche')}
          ${field('b-age', 'Edad', d.beneficiary.age, 'required type="number" inputmode="numeric" min="0" max="120" data-k="beneficiary.age"')}
        </div>
        ${field('b-comuna', 'Comuna', d.beneficiary.comuna, 'required data-k="beneficiary.comuna"')}
        ${field('b-title', 'Título de la causa', d.title, 'required data-k="title" maxlength="60" placeholder="Ej: Una cadera nueva para Rosa"')}
        <div class="field"><label for="b-story">Su historia</label><textarea id="b-story" required data-k="story" minlength="80" placeholder="Quién es, qué le pasó y por qué la necesita ahora.">${esc(d.story || '')}</textarea><span class="hint">Mínimo 80 caracteres. Escríbela como se la contarías a un vecino.</span></div>
        <label class="file-btn ${d.cover ? 'ok' : ''}"><span class="fi">${icon(d.cover ? 'check' : 'upload')}</span><div><b>${d.cover ? 'Foto cargada' : 'Subir una foto (opcional)'}</b><span>JPG o PNG. La comprimimos en tu teléfono.</span></div><input type="file" accept="image/*" id="cover"></label>
      </div>`,
    () => `
      <div class="form">
        <div class="field"><label for="cat">Tipo de necesidad</label><select id="cat" data-k="category">${Object.entries(CATEGORIES).map(([k, v]) => `<option value="${k}" ${d.category === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
        ${field('tr', 'Tratamiento o intervención', d.treatment, 'required data-k="treatment" placeholder="Ej: Cirugía de reemplazo de cadera"')}
        <div class="row2">
          ${field('dr', 'Médico tratante', d.doctor.name, 'required data-k="doctor.name"')}
          ${field('dr-sp', 'Especialidad', d.doctor.specialty, 'required data-k="doctor.specialty"')}
        </div>
        ${field('cl', 'Clínica, hospital o proveedor', d.clinicName, 'required data-k="clinicName"', 'A ellos les pagamos directamente, contra factura.')}
        ${field('bud', 'Presupuesto del tratamiento (CLP)', d.budget, 'required type="number" inputmode="numeric" min="100000" step="1000" data-k="budget" placeholder="3600000"')}
        <div class="infobox">${icon('shield', 18)}<span>Verificamos que el médico esté inscrito en el Registro Nacional de Prestadores Individuales de Salud y llamamos a la clínica a su número oficial para confirmar el presupuesto.</span></div>
      </div>`,
    () => `
      <div class="form">
        <div class="field"><label for="ot">Tipo de organización</label><select id="ot" data-k="organizer.type">${ORG_TYPES.map(t => `<option ${d.organizer.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
        ${field('on', 'Nombre de la organización', d.organizer.name, 'required data-k="organizer.name" placeholder="Ej: Junta de Vecinos Villa Los Aromos"')}
        ${field('orut', 'RUT de la organización', d.organizer.rut, 'required data-k="organizer.rut" placeholder="65.123.456-7"')}
        <div class="row2">
          ${field('oc', 'Persona de contacto', d.organizer.contact, 'required data-k="organizer.contact" placeholder="Nombre y cargo"')}
          ${field('ophone', 'Celular', d.organizer.phone, 'required type="tel" inputmode="tel" data-k="organizer.phone"')}
        </div>
        ${field('omail', 'Correo', d.organizer.email, 'required type="email" inputmode="email" data-k="organizer.email"')}
        <div class="infobox">${icon('people', 18)}<span>Las rifas benéficas las hacen organizaciones como juntas de vecinos, centros de padres, clubes o sindicatos, a favor de un tercero (Ley 20.851). unamano pone la tecnología, la verificación y el pago a la clínica.</span></div>
      </div>`,
    () => {
      const plan = d.budget ? computePlan({ budget: +d.budget, price: +d.price, prizeMode: d.prizeMode, prizePct: +d.prizePct }) : null;
      return `
      <div class="form">
        <div class="field"><span class="lbl">Precio por número</span>
          <div class="pills">${[1000, 2000, 3000, 5000].map(v => `<label><input type="radio" name="price" value="${v}" ${+d.price === v ? 'checked' : ''}><span>${clp(v)}</span></label>`).join('')}</div></div>
        <div class="field"><span class="lbl">¿Quién pone el premio?</span>
          <div class="opts">
            <label class="opt"><input type="radio" name="pm" value="donado" ${d.prizeMode === 'donado' ? 'checked' : ''}><span class="radio"></span><div><b>Alguien lo dona</b><span>Más plata para el tratamiento. Verificamos que el premio exista.</span></div></label>
            <label class="opt"><input type="radio" name="pm" value="porcentaje" ${d.prizeMode === 'porcentaje' ? 'checked' : ''}><span class="radio"></span><div><b>Se compra con lo recaudado</b><span>Un porcentaje de la rifa paga el premio.</span></div></label>
          </div></div>
        ${d.prizeMode === 'porcentaje' ? `<div class="field"><label for="pp-r">Porcentaje para el premio: <b id="pp-v">${d.prizePct}%</b></label><input id="pp-r" type="range" min="5" max="20" step="1" value="${d.prizePct}" style="min-height:auto;padding:0;border:0;accent-color:var(--ink)"></div>` : ''}
        ${field('pz', 'Premio', d.prize, 'required data-k="prize" placeholder="Ej: Smart TV 55 pulgadas"')}
        ${field('dd', 'Fecha del sorteo', d.drawDate, `required type="date" min="${minDate}" max="${maxDate}" data-k="drawDate"`, 'Entre 2 semanas y 3 meses desde hoy. El sorteo es a las 20:00.')}
        ${plan ? `<div class="plan"><span class="eyebrow">Meta calculada</span><span class="goal num">${clp(plan.goal)}</span>
          <span class="meta">Se emiten ${plan.total.toLocaleString('es-CL')} números de ${clp(d.price)}. Hay que vender ${Math.ceil(plan.goal / d.price).toLocaleString('es-CL')} para llegar a la meta.</span>
          ${splitBlock({ split: plan.split, clinic: { name: d.clinicName || 'la clínica' }, prizeMode: d.prizeMode })}
        </div>` : `<div class="infobox">${icon('alert', 18)}<span>Completa el presupuesto en el paso 2 para calcular la meta.</span></div>`}
      </div>`;
    },
    () => `
      <div class="form">
        ${[['diag', 'Informe o diagnóstico médico'], ['pres', 'Presupuesto de la clínica'], ['pj', 'Certificado de personalidad jurídica vigente']].map(([k, l]) => {
          const doc = d.documents.find(x => x.k === k);
          return `<label class="file-btn ${doc ? 'ok' : ''}"><span class="fi">${icon(doc ? 'check' : 'doc')}</span><div><b>${l}</b><span>${doc ? esc(doc.name) : 'PDF o foto'}</span></div><input type="file" accept="image/*,application/pdf" data-doc="${k}" data-label="${l}"></label>`;
        }).join('')}
        <label class="checkline"><input type="checkbox" id="c1" ${d.c1 ? 'checked' : ''}><span>Declaro que la información es verdadera y que la organización aprobó hacer esta rifa.</span></label>
        <label class="checkline"><input type="checkbox" id="c2" ${d.c2 ? 'checked' : ''}><span>Autorizo a unamano a revisar estos datos de salud solo para verificar la causa. Son datos sensibles y no se publican sin permiso.</span></label>
        <label class="checkline"><input type="checkbox" id="c3" ${d.c3 ? 'checked' : ''}><span>Entiendo que la plata se paga directamente a la clínica y no a la familia ni a la organización.</span></label>
      </div>`,
  ];

  const render = () => {
    document.body.classList.add('no-tabbar');
    view.innerHTML = `
      <header class="subbar">
        <a href="${step === 0 ? '#/postular' : '#'}" class="icon-btn" aria-label="Volver" id="bk">${icon('back')}</a>
        <div><small>Paso ${step + 1} de ${STEPS.length}</small><h1>Postular una causa</h1></div>
      </header>
      <div class="steps" aria-hidden="true">${STEPS.map((_, i) => `<i class="${i < step ? 'done' : i === step ? 'on' : ''}"></i>`).join('')}</div>
      <div class="step-head"><span class="eyebrow">Paso ${step + 1}</span><h2>${STEPS[step].t}</h2><p>${STEPS[step].p}</p></div>
      <div style="height:16px"></div>
      ${bodies[step]()}
      <div class="form-nav">
        ${step > 0 ? `<button class="btn btn-light" id="prev">${icon('back', 18)} Atrás</button>` : ''}
        <button class="btn" id="next">${step === STEPS.length - 1 ? 'Enviar postulación' : 'Siguiente'} ${icon('arrow', 18)}</button>
      </div>`;
    bind();
    window.scrollTo(0, 0);
  };

  const setK = (k, v) => { const [a, b] = k.split('.'); if (b) d[a][b] = v; else d[a] = v; saveDraft(); };

  const bind = () => {
    $('#bk').addEventListener('click', e => { if (step > 0) { e.preventDefault(); step--; render(); } });
    $$('[data-k]').forEach(el => el.addEventListener('input', () => {
      setK(el.dataset.k, el.value);
      if (el.dataset.k === 'beneficiary.first') { const pp = $('#pp'); if (pp) pp.innerHTML = photo(previewCause()); }
      if (el.dataset.k === 'drawDate' && step === 3) { /* nada */ }
    }));
    $('#cover')?.addEventListener('change', async e => {
      const file = e.target.files[0]; if (!file) return;
      try { d.cover = await shrink(file, 900); saveDraft(); render(); toast('Foto cargada'); }
      catch { toast('No pudimos leer esa imagen', 'bad'); }
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
    $('#next').addEventListener('click', () => {
      if (!validate()) return;
      if (step < STEPS.length - 1) { step++; render(); return; }
      submit();
    });
  };

  const validate = () => {
    let ok = true;
    $$('.field').forEach(x => { x.classList.remove('err'); $('.errmsg', x)?.remove(); });
    $$('[required]', view).forEach(el => {
      const v = el.value.trim();
      let msg = '';
      if (!v) msg = 'Completa este campo.';
      else if (el.minLength > 0 && v.length < el.minLength) msg = `Faltan ${el.minLength - v.length} caracteres.`;
      else if (el.type === 'email' && !/^\S+@\S+\.\S+$/.test(v)) msg = 'Revisa el correo.';
      else if (el.type === 'number' && el.min && +v < +el.min) msg = `Mínimo ${el.min.length > 4 ? clp(el.min) : el.min}.`;
      else if (el.type === 'date' && (v < el.min || v > el.max)) msg = 'Elige una fecha dentro del rango.';
      if (msg) { ok = false; const fl = el.closest('.field'); fl.classList.add('err'); fl.insertAdjacentHTML('beforeend', `<span class="errmsg">${msg}</span>`); }
    });
    if (step === 3 && !d.budget) { ok = false; toast('Falta el presupuesto del paso 2', 'bad'); }
    if (step === 4) {
      if (d.documents.length < 3) { ok = false; toast('Sube los tres documentos', 'bad'); }
      else if (!(d.c1 && d.c2 && d.c3)) { ok = false; toast('Debes aceptar las tres declaraciones', 'bad'); }
    }
    if (!ok) $('.err input, .err textarea, .err select')?.focus();
    return ok;
  };

  const submit = () => {
    const c = db.submitCause({
      title: d.title, treatment: d.treatment, category: d.category, story: d.story,
      beneficiary: { ...d.beneficiary, age: +d.beneficiary.age },
      organizer: d.organizer, doctor: d.doctor, clinicName: d.clinicName, budget: +d.budget,
      price: +d.price, prizeMode: d.prizeMode, prizePct: d.prizeMode === 'porcentaje' ? +d.prizePct : 0, prize: d.prize,
      drawDate: d.drawDate, cover: d.cover, documents: d.documents,
    });
    if (d.palette != null) { c.palette = d.palette; db.save(); }
    sessionStorage.removeItem(DRAFT);
    document.body.classList.remove('no-tabbar');
    view.innerHTML = `
      <section class="thanks">
        <a href="#/" class="icon-btn" aria-label="Cerrar">${icon('close')}</a>
        <div class="big-heart" style="background:var(--brand);box-shadow:0 16px 36px -12px rgba(14,122,95,.6)">${icon('check', 48, 3)}</div>
        <h1>¡Postulación <span class="warm">recibida!</span></h1>
        <p class="lead">La causa de <b>${esc(c.beneficiary.first)}</b> quedó en revisión con el número <b>#${esc(c.id.slice(-5).toUpperCase())}</b>. Esto es lo que sigue:</p>
        <ol class="timeline" style="position:relative;z-index:2">
          <li><span class="tn">1</span><div><b>Revisamos los documentos</b><span>24 a 48 horas hábiles.</span></div></li>
          <li><span class="tn">2</span><div><b>Llamamos a la clínica y al médico</b><span>A sus números oficiales, para confirmar el presupuesto.</span></div></li>
          <li><span class="tn">3</span><div><b>Videollamada con la familia</b><span>Te escribimos a ${esc(c.organizer.email)} para agendarla.</span></div></li>
          <li><span class="tn">4</span><div><b>Publicamos la rifa con el sello</b><span>Y les damos el kit para difundirla.</span></div></li>
        </ol>
        <a class="btn btn-block" href="#/postulacion/${c.id}" style="position:relative;z-index:2">Seguir mi postulación ${icon('arrow', 18)}</a>
        <a class="btn btn-light btn-block" href="../admin/#/admin/${c.id}" style="position:relative;z-index:2">${icon('shield', 18)} Verla como el equipo (demo)</a>
      </section>`;
    confetti($('.thanks'), 50);
  };

  render();
}

// ---------- Espacio del postulante ----------
const STAGES = [
  { t: 'Postulación recibida', s: 'Tenemos los datos y documentos.', keys: [] },
  { t: 'Identidad y documentos', s: 'Revisamos cédula, diagnóstico e informe médico.', keys: ['identidad', 'documentos'] },
  { t: 'Médico y clínica', s: 'Confirmamos al médico en el registro y el presupuesto con la clínica.', keys: ['medico', 'clinica'] },
  { t: 'Organización', s: 'Validamos la personalidad jurídica y la directiva.', keys: ['organizacion'] },
  { t: 'Videollamada', s: 'Conversamos con la familia.', keys: ['videollamada'] },
  { t: 'Rifa publicada', s: 'Sale con el sello unamano y empieza la venta.', keys: ['__live'] },
];
const stageDone = (c, st) => st.keys.every(k => k === '__live' ? ['live', 'drawn', 'refunded'].includes(c.status) : c.checks[k]);

function viewApplyHome() {
  const mine = db.causes().filter(c => c.mine).sort((a, b) => b.createdAt - a.createdAt);
  let draft = null; try { draft = JSON.parse(sessionStorage.getItem(DRAFT)); } catch { /* */ }
  view.innerHTML = `
    <section class="apply-hero">
      <span class="eyebrow">Para familias y organizaciones</span>
      <h1>Postula una <span class="warm">causa</span></h1>
      <p>Si alguien de tu comunidad necesita un tratamiento, organicen la rifa con nosotros. Verificamos el caso, operamos la venta y le pagamos directo a la clínica.</p>
      <a class="btn btn-sun btn-l" href="#/postular/nueva">${icon('hand', 20)} ${draft?.beneficiary?.name ? 'Continuar mi borrador' : 'Empezar postulación'}</a>
    </section>
    ${mine.length ? `<h2 class="sec-t">Tus postulaciones</h2>
      <div class="list">${mine.map(c => {
        const done = STAGES.filter(st => stageDone(c, st)).length;
        const chip = c.status === 'pending' ? `<span class="chip chip-sun">En revisión · ${done}/${STAGES.length}</span>` : c.status === 'live' ? '<span class="chip chip-ok">Publicada</span>' : c.status === 'rejected' ? '<span class="chip chip-coral">No aprobada</span>' : '<span class="chip chip-sky">Cerrada</span>';
        return `<a class="row" href="#/postulacion/${c.id}">${photo(c, { w: 300 })}
          <div class="row-b">${chip}<span class="row-t">${esc(c.title)}</span><span class="row-s">Enviada el ${fmtDate(c.createdAt)}</span></div></a>`;
      }).join('')}</div>` : ''}
    <h2 class="sec-t">Quién puede organizar</h2>
    <div class="stack" style="padding-top:0">
      <div class="org-tags">${ORG_TYPES.map(t => `<span>${t}</span>`).join('')}</div>
      <div class="infobox">${icon('people', 18)}<span>La rifa la organiza una organización con personalidad jurídica, con fines benéficos y a favor de otra persona. No se puede postular a título personal.</span></div>
    </div>
    <h2 class="sec-t">Qué vas a necesitar</h2>
    <div class="stack" style="padding-top:0">
      <ul class="need card" style="padding:6px 16px">
        ${[['user', 'Datos y foto de la persona', 'Nombre, edad, comuna y su historia.'], ['doc', 'Informe o diagnóstico médico', 'Firmado por el médico tratante.'], ['clinic', 'Presupuesto de la clínica', 'Con el nombre y teléfono de la clínica.'], ['id', 'Certificado de personalidad jurídica', 'Vigente, de la organización que rifa.'], ['gift', 'Un premio', 'Donado por alguien o comprado con un % de lo recaudado.']]
          .map(([i, t, d]) => `<li><span class="vi">${icon(i, 20)}</span><div><b>${t}</b><span>${d}</span></div></li>`).join('')}
      </ul>
    </div>
    <h2 class="sec-t">Cómo sigue</h2>
    <div class="stack" style="padding-top:0">
      <ol class="timeline">${STAGES.map((st, i) => `<li><span class="tn">${i + 1}</span><div><b>${st.t}</b><span>${st.s}</span></div></li>`).join('')}</ol>
      <div class="guarantee"><span class="gi">${icon('heart')}</span><div><b>¿Cuánto cuesta?</b><span>Postular es gratis. Del total recaudado, un ${OPS_PCT}% financia al equipo que verifica los casos, los pagos y la plataforma. Siempre se informa en cada rifa.</span></div></div>
    </div>`;
}

function viewMyCase(id) {
  const c = db.cause(id);
  if (!c) return notFound();
  document.body.classList.add('no-tabbar');
  const firstPending = STAGES.findIndex(st => !stageDone(c, st));
  const kit = `🎟️ ${c.title}\nRifa solidaria verificada por unamano. Número a ${clp(c.price)}, sorteo el ${fmtDate(c.drawAt)}. Premio: ${c.prize}.\n${new URL('#/causa/' + c.id, location.href).href}`;
  view.innerHTML = `
    <header class="subbar"><a href="#/postular" class="icon-btn" aria-label="Volver">${icon('back')}</a><div style="min-width:0"><small>Postulación #${esc(c.id.slice(-5).toUpperCase())}</small><h1 style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(c.title)}</h1></div></header>
    <div class="stack">
      <div style="display:flex;gap:16px;align-items:center">
        ${photo(c, { w: 300, cls: 'ph-sq' }).replace('class="ph ph-sq"', 'class="ph" style="width:96px;height:96px;border-radius:22px;flex-shrink:0"')}
        <div><span class="eyebrow">Estado</span>
          <h2 class="h-m" style="margin-top:4px">${c.status === 'pending' ? 'En revisión' : c.status === 'live' ? '¡Publicada!' : c.status === 'rejected' ? 'No aprobada' : 'Cerrada'}</h2>
          <p style="margin:6px 0 0;color:var(--ink-2);font-size:14px">${c.status === 'pending' ? `Vamos en: ${STAGES[firstPending]?.t.toLowerCase()}.` : c.status === 'live' ? `Venta abierta hasta el ${fmtDate(c.drawAt)}.` : c.status === 'rejected' ? esc(c.rejectReason) : 'Revisa el resultado.'}</p></div>
      </div>
      ${c.status === 'rejected' ? '' : `<ol class="timeline card" style="padding:20px">${STAGES.map((st, i) => {
        const ok = stageDone(c, st); const now = i === firstPending;
        return `<li><span class="tn ${ok ? 'ok' : now ? 'now' : ''}">${ok ? icon('check', 16, 3) : i + 1}</span><div><b>${st.t}</b><span>${now && c.status === 'pending' ? 'En curso · ' : ''}${st.s}</span></div></li>`;
      }).join('')}</ol>`}
      ${c.status === 'live' ? `
        <div class="kit"><h3>Kit para difundir</h3>
          <p style="margin:0;font-size:14px;color:#6B4A00">Mándalo al grupo del curso, del club o de la junta. Cada número que se vende acerca la meta.</p>
          <pre>${esc(kit)}</pre>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <a class="btn btn-s" style="--bg:#1FA855" href="https://wa.me/?text=${encodeURIComponent(kit)}" target="_blank" rel="noopener">Enviar por WhatsApp</a>
            <button class="btn btn-s btn-light" id="cp">Copiar texto</button>
          </div></div>
        <a class="btn btn-block" href="#/causa/${c.id}">Ver la rifa publicada ${icon('arrow', 18)}</a>` : ''}
      ${['drawn', 'refunded'].includes(c.status) ? `<a class="btn btn-block" href="#/sorteo/${c.id}">Ver resultado ${icon('arrow', 18)}</a>` : ''}
      ${c.status === 'pending' ? `<div class="infobox">${icon('video', 18)}<span>Te escribiremos a ${esc(c.organizer.email || 'tu correo')} para agendar la videollamada. Si falta algo, te avisamos por ahí mismo.</span></div>
        <a class="btn btn-light btn-block" href="../admin/#/admin/${c.id}">${icon('shield', 18)} Simular la revisión del equipo (demo)</a>` : ''}
    </div>`;
  $('#cp')?.addEventListener('click', () => navigator.clipboard?.writeText(kit).then(() => toast('Texto copiado')));
}

function shrink(file, max) {
  return new Promise((res, rej) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const cv = document.createElement('canvas');
      cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(url);
      res(cv.toDataURL('image/jpeg', .72));
    };
    img.onerror = rej;
    img.src = url;
  });
}

// ---------- Backoffice ----------
function adminGate(next) {
  if (db.load().adminOk) return next();
  document.body.classList.add('no-tabbar');
  view.innerHTML = `
    <header class="subbar"><a href="${ADMIN ? '../' : '#/'}" class="icon-btn" aria-label="Salir">${icon('back')}</a><div><small>Equipo unamano</small><h1>Panel de administración</h1></div></header>
    <form class="stack" id="pin" style="padding-top:40px">
      ${logo(64)}
      <h2 class="h-m">Solo para el equipo de verificación</h2>
      <div class="field"><label for="pinv">PIN</label><input id="pinv" inputmode="numeric" maxlength="4" autocomplete="one-time-code" style="font-size:28px;letter-spacing:.4em;text-align:center"><span class="hint">PIN de la demo: 1234</span></div>
      <button class="btn btn-block btn-l">Entrar</button>
    </form>`;
  $('#pinv').focus();
  $('#pin').addEventListener('submit', e => {
    e.preventDefault();
    if ($('#pinv').value === '1234') { db.setAdmin(true); next(); }
    else { toast('PIN incorrecto', 'bad'); $('#pinv').value = ''; }
  });
}

function viewAdmin() {
  adminGate(() => {
    document.body.classList.add('no-tabbar');
    let tab = sessionStorage.getItem('unamano:admtab') || 'pending';
    const all = db.causes();
    const live = all.filter(c => c.status === 'live');
    const raised = live.reduce((a, c) => a + db.stats(c).raised, 0);
    const pend = all.filter(c => c.status === 'pending');
    const done = all.filter(c => ['drawn', 'refunded', 'rejected'].includes(c.status));
    view.innerHTML = `
      <div class="admin">
      <header class="subbar"><a href="${ADMIN ? '../' : '#/'}" class="icon-btn" aria-label="Salir del panel">${icon('back')}</a><div><small>Equipo unamano</small><h1>Panel de administración</h1></div>
        <button class="btn btn-s btn-ghost" id="logout" style="margin-left:auto">Salir</button></header>
      <div class="kpis">
        <div class="kpi hl"><b>${pend.length}</b><span>por verificar</span></div>
        <div class="kpi"><b>${live.length}</b><span>rifas activas</span></div>
        <div class="kpi"><b class="num" style="font-size:18px">${clp(raised)}</b><span>en recaudación</span></div>
      </div>
      <div class="tabs" role="tablist">
        <button role="tab" data-t="pending" aria-selected="${tab === 'pending'}">Por verificar</button>
        <button role="tab" data-t="live" aria-selected="${tab === 'live'}">Activas</button>
        <button role="tab" data-t="done" aria-selected="${tab === 'done'}">Cerradas</button>
      </div>
      <div class="list" id="alist" style="padding-top:10px;padding-bottom:30px"></div>
      </div>`;
    const render = () => {
      const items = tab === 'pending' ? pend : tab === 'live' ? live : done;
      $('#alist').innerHTML = items.length ? items.map(c => {
        const sc = db.trustScore(c);
        const st = db.stats(c);
        const chip = c.status === 'pending' ? (c.flags?.length ? '<span class="chip chip-coral">Alerta</span>' : `<span class="chip chip-sun">${sc}/100</span>`)
          : c.status === 'live' ? `<span class="chip chip-sky">${Math.floor(st.pct)}%</span>`
          : c.status === 'drawn' ? '<span class="chip chip-ok">Sorteada</span>' : c.status === 'refunded' ? '<span class="chip chip-sun">Devuelta</span>' : '<span class="chip">Rechazada</span>';
        return `<a class="row" href="#/admin/${c.id}">
          ${photo(c, { w: 300 })}
          <div class="row-b">${chip}<span class="row-t">${esc(c.title)}</span><span class="row-s">${esc(c.organizer.name)} · ${clp(c.goal)}</span></div></a>`;
      }).join('') : `<p class="empty-list">Nada por aquí.</p>`;
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
    const st = db.stats(c);
    const sc = db.trustScore(c);
    const allOk = CHECKS.every(k => c.checks[k.key]);
    const statusTxt = { pending: 'Por verificar', live: 'Activa', drawn: 'Sorteada', refunded: 'Devuelta', rejected: 'Rechazada' }[c.status];
    view.innerHTML = `
      <header class="subbar"><a href="#/admin" class="icon-btn" aria-label="Volver a la cola">${icon('back')}</a><div style="min-width:0"><small>Caso #${esc(c.id.slice(-5).toUpperCase())} · ${statusTxt}</small><h1 style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(c.title)}</h1></div></header>
      <div class="stack">
        <div class="full" style="display:flex;gap:14px;align-items:center">
          ${photo(c, { w: 300 }).replace('class="ph"', 'class="ph" style="width:84px;height:84px;border-radius:20px;flex-shrink:0"')}
          <div style="flex:1;min-width:0"><b style="font-size:17px">${esc(c.beneficiary.name)}, ${esc(c.beneficiary.age)}</b><div style="font-size:14px;color:var(--ink-2)">${esc(c.treatment)} · ${esc(c.beneficiary.comuna)}</div></div>
          <div class="score" style="--s:${sc}" aria-label="Puntaje de confianza ${sc} de 100"><b>${sc}</b></div>
        </div>
        ${(c.flags || []).map(f => `<div class="flag full">${icon('alert', 20)}<div><b>Alerta automática</b><br>${esc(f)}<br><button class="linkish" data-unflag style="color:#B3260F">Marcar como revisada</button></div></div>`).join('')}

        ${c.status === 'pending' ? `
        <div class="card pcard-a"><h3>Verificación</h3>
          <ul class="vlist">${CHECKS.map(k => `
            <li><span class="vi">${icon(k.icon, 20)}</span>
              <div class="vt"><b>${k.label}</b><span>${k.how}</span>
                ${k.key === 'medico' ? `<a href="https://rnpi.superdesalud.gob.cl/" target="_blank" rel="noopener">Consultar el registro de prestadores ↗</a>` : ''}
                ${k.key === 'clinica' ? `<span>${esc(c.clinic.name)} · ${clp(c.clinic.budget)}</span>` : ''}
                ${k.key === 'organizacion' ? `<span>${esc(c.organizer.name)}${c.organizer.rut ? ' · RUT ' + esc(c.organizer.rut) : ''}</span>` : ''}
              </div>
              <button class="switch" role="switch" aria-checked="${!!c.checks[k.key]}" aria-label="${k.label} verificado" data-check="${k.key}"></button>
            </li>`).join('')}
          </ul>
        </div>` : ''}

        <div class="card pcard-a"><h3>Datos del caso</h3>
          <dl class="kv">
            <dt>Organiza</dt><dd>${esc(c.organizer.name)} (${esc(c.organizer.type)})${c.organizer.contact ? '<br>' + esc(c.organizer.contact) : ''}${c.organizer.email ? '<br>' + esc(c.organizer.email) : ''}</dd>
            <dt>Médico</dt><dd>${esc(c.doctor.name)}, ${esc(c.doctor.specialty)}</dd>
            <dt>Paga a</dt><dd>${esc(c.clinic.name)} · ${clp(c.clinic.budget)}</dd>
            <dt>Meta</dt><dd>${clp(c.goal)} · ${c.total.toLocaleString('es-CL')} números de ${clp(c.price)}</dd>
            <dt>Reparto</dt><dd>${c.split.treatment}% tratamiento · ${c.split.prize}% premio · ${c.split.ops}% operación</dd>
            <dt>Premio</dt><dd>${esc(c.prize)} (${c.prizeMode === 'donado' ? 'donado' : 'comprado'})</dd>
            <dt>Sorteo</dt><dd>${fmtDateTime(c.drawAt)}</dd>
            ${c.documents?.length ? `<dt>Documentos</dt><dd>${c.documents.map(x => esc(x.label) + ': ' + esc(x.name)).join('<br>')}</dd>` : ''}
            ${c.rejectReason ? `<dt>Motivo rechazo</dt><dd>${esc(c.rejectReason)}</dd>` : ''}
          </dl>
          <p style="font-size:14px;color:var(--ink-2);margin:12px 0 0">${esc(c.story)}</p>
        </div>

        ${c.status === 'live' ? `
        <div class="card pcard-a"><h3>Recaudación</h3>
          <div class="num" style="font-size:38px;font-weight:800;letter-spacing:-.04em">${clp(st.raised)}</div>
          <div style="font-size:14px;color:var(--ink-2);margin:4px 0 10px">de ${clp(c.goal)} · ${st.sold.toLocaleString('es-CL')} números · cierra ${fmtDateTime(c.drawAt)}</div>
          ${progressBar(st.pct)}
          <div class="hash-line" style="margin-top:14px">${icon('hash', 16)}<span>Huella publicada: <code style="color:var(--ink)">${c.seedHash}</code></span></div>
        </div>
        <div class="card pcard-a"><h3>Herramientas de demo</h3>
          <div style="display:flex;flex-direction:column;gap:10px">
            <button class="btn btn-light btn-block" id="sim">${icon('people', 20)} Simular ventas (+${plural(Math.ceil(c.goal / c.price * .15), 'número', 'números')})</button>
            <button class="btn btn-light btn-block" id="closenow">${icon('clock', 20)} Cerrar la venta ahora</button>
            <button class="btn btn-block" id="draw">${icon('dice', 20)} Ejecutar sorteo</button>
          </div>
          <p style="font-size:13px;color:var(--ink-3);margin:10px 0 0">Si al sortear no se llegó a la meta, el sistema devuelve automáticamente todas las compras.</p>
        </div>` : ''}

        ${['drawn', 'refunded'].includes(c.status) ? `<a class="btn btn-block full" href="#/sorteo/${c.id}">Ver resultado público ${icon('arrow', 18)}</a>` : ''}
      </div>
      ${c.status === 'pending' ? `
      <div class="buybar" style="flex-wrap:wrap">
        <button class="btn btn-danger" id="rej" style="flex:1">Rechazar</button>
        <button class="btn" id="ok" style="flex:2" ${allOk && !c.flags?.length ? '' : 'disabled'}>${icon('shield', 20)} Aprobar y publicar</button>
        ${allOk && !c.flags?.length ? '' : `<span style="flex-basis:100%;font-size:12px;color:var(--ink-3);text-align:center">${c.flags?.length ? 'Resuelve la alerta y completa' : 'Completa'} las ${CHECKS.length} verificaciones para publicar.</span>`}
      </div>` : ''}`;

    $$('[data-check]').forEach(b => b.addEventListener('click', () => {
      const v = b.getAttribute('aria-checked') !== 'true';
      db.setCheck(c.id, b.dataset.check, v); viewAdminCase(id);
    }));
    $('[data-unflag]')?.addEventListener('click', () => { db.clearFlags(c.id); viewAdminCase(id); });
    $('#ok')?.addEventListener('click', () => {
      try { db.approve(c.id); toast('Publicada con el sello unamano'); viewAdminCase(id); }
      catch (e) { toast(e.message, 'bad'); }
    });
    $('#rej')?.addEventListener('click', () => sheet(`
      <h2>Rechazar caso</h2>
      <p>Se le avisa a la organización con el motivo.</p>
      <div class="field"><label for="why">Motivo</label><textarea id="why" placeholder="Ej: la clínica no confirmó el presupuesto"></textarea></div>
      <div style="display:flex;gap:10px;margin-top:14px"><button class="btn btn-light" data-close style="flex:1">Cancelar</button><button class="btn btn-danger" id="dorej" style="flex:1">Rechazar</button></div>`, {
      onOpen: (s, close) => $('#dorej', s).addEventListener('click', () => {
        db.reject(c.id, $('#why', s).value.trim() || 'Sin motivo'); close(); toast('Caso rechazado'); viewAdminCase(id);
      }),
    }));
    $('#sim')?.addEventListener('click', () => { db.simulateSales(c.id, Math.ceil(c.goal / c.price * .15)); toast('Ventas simuladas'); viewAdminCase(id); });
    $('#closenow')?.addEventListener('click', () => { db.closeNow(c.id); toast('Venta cerrada'); viewAdminCase(id); });
    $('#draw')?.addEventListener('click', () => {
      const s2 = db.stats(c);
      sheet(`<h2>¿Ejecutar el sorteo?</h2>
        <p>${s2.reached
          ? `Se llegó a la meta (${clp(s2.raised)} de ${clp(c.goal)}). Se revela la semilla y se calcula el número ganador entre los ${s2.sold.toLocaleString('es-CL')} vendidos.`
          : `<b style="color:#B3260F">No se llegó a la meta</b> (${clp(s2.raised)} de ${clp(c.goal)}). No hay sorteo: se devuelve el 100% a todos los compradores.`}</p>
        <div style="display:flex;gap:10px;margin-top:14px"><button class="btn btn-light" data-close style="flex:1">Cancelar</button><button class="btn" id="dodraw" style="flex:1">${s2.reached ? 'Sortear' : 'Devolver todo'}</button></div>`, {
        onOpen: (s, close) => $('#dodraw', s).addEventListener('click', () => { db.runDraw(c.id); close(); go('#/sorteo/' + c.id + '?vivo'); }),
      });
    });
  });
}

// ---------- Resultado ----------
function viewDraw(id, live) {
  const c = db.cause(id);
  if (!c) return notFound();
  if (c.status === 'live') return go('#/causa/' + id);
  document.body.classList.add('no-tabbar');
  const r = c.result;
  const mine = db.purchases().filter(p => p.causeId === c.id);
  const iWon = mine.some(p => p.won);
  const myRefund = mine.filter(p => p.status === 'refunded').reduce((a, p) => a + p.amount, 0);

  if (c.status === 'refunded') {
    view.innerHTML = `
      <section class="draw" style="background:var(--surface);color:var(--ink)">
        <header class="subbar" style="color:var(--ink)"><a href="${ADMIN ? '#/admin/' + c.id : '#/'}" class="icon-btn" aria-label="Volver">${icon('back')}</a><div><small>${esc(c.title)}</small><h1>Resultado</h1></div></header>
        <div class="draw-hero">
          <span class="eyebrow" style="color:var(--brand)">Sin sorteo</span>
          <div class="ball" style="background:var(--brand-50);box-shadow:none"><div class="inner" style="color:var(--brand)">${icon('refresh', 72, 2.2)}</div></div>
          <h1 style="color:var(--ink)">Te devolvimos todo</h1>
          <p style="color:var(--ink-2)">No se llegó a la meta (${clp(r.raised)} de ${clp(c.goal)}), así que no hubo sorteo y cada compra se devolvió al mismo medio de pago.</p>
        </div>
        <div class="impact">
          <div class="line"><span>Recaudado</span><b>${clp(r.raised)}</b></div>
          <div class="line"><span>Devuelto a compradores en la app</span><b>${clp(r.refunded)}</b></div>
          ${myRefund ? `<div class="line"><span>Te devolvimos</span><b>${clp(myRefund)}</b></div>` : ''}
        </div>
      </section>`;
    return;
  }

  view.innerHTML = `
    <section class="draw">
      <header class="subbar"><a href="${ADMIN ? '#/admin/' + c.id : '#/'}" class="icon-btn" aria-label="Volver">${icon('back')}</a><div><small>${esc(c.title)}</small><h1>Resultado del sorteo</h1></div></header>
      <div class="draw-hero">
        <span class="eyebrow">Número ganador · ${fmtDateTime(r.at)}</span>
        <div class="ball ${live ? 'rolling' : ''}" id="ball"><div class="inner"><span class="digits" id="dg">${live ? '0000' : pad(r.number)}</span></div></div>
        <div id="after" style="${live ? 'opacity:0' : ''};transition:opacity .4s">
          <h1>${iWon ? '¡Ganaste <span class="warm">tú</span>!' : `¡Meta cumplida para <span class="warm">${esc(c.beneficiary.first)}</span>!`}</h1>
          <p>${iWon ? `Tu número ${pad(r.number)} salió sorteado. Te contactamos para entregarte: ${esc(c.prize)}.` : `El ${pad(r.number)} se lleva ${esc(c.prize)}. ${r.winnerLabel ? 'Ya le avisamos.' : 'Ya le avisamos a quien lo compró.'}`}</p>
        </div>
      </div>
      <div class="impact">
        <span class="eyebrow">Lo que logramos juntos</span>
        <div class="line"><span>Recaudado</span><b>${clp(r.raised)}</b></div>
        <div class="line"><span>Pagado a ${esc(c.clinic.name)}</span><b>${clp(r.paidClinic)}</b></div>
        <div class="line"><span>Números vendidos</span><b>${r.soldCount.toLocaleString('es-CL')}</b></div>
        <button class="btn btn-block btn-light" id="receipt">${icon('doc', 20)} Ver comprobante de pago</button>
      </div>
      <div class="verify">
        <b style="display:flex;gap:8px;align-items:center">${icon('shield', 20)} Verifica tú mismo el sorteo</b>
        <span style="font-size:14px;color:#BFE0D3">Antes de vender publicamos la huella. Ahora revelamos la semilla. Si la huella de la semilla coincide, nadie la pudo cambiar.</span>
        <span class="lbl">Huella publicada</span><code>${c.seedHash}</code>
        <span class="lbl">Semilla revelada</span><code>${c.seed}</code>
        <span style="font-size:12px;color:#9FCDBB">Ganador = vendidos ordenados [ sha256(semilla:${esc(c.id)}:${r.soldCount}) mod ${r.soldCount} ] = posición ${r.idx}</span>
        <div id="vres"></div>
        <button class="btn btn-sun btn-block" id="verify">${icon('hash', 20)} Recalcular en mi teléfono</button>
      </div>
    </section>`;

  $('#verify').addEventListener('click', () => {
    const okHash = sha256(c.seed) === c.seedHash;
    const sold = [...db.soldSet(c)].sort((a, b) => a - b);
    const w = pickWinner(c.seed, c.id, sold);
    const okWin = w.number === r.number;
    $('#vres').innerHTML = `<div class="ok ${okHash && okWin ? '' : 'ko'}">${icon(okHash && okWin ? 'check' : 'alert', 20, 3)} ${okHash ? 'La huella coincide' : 'La huella NO coincide'} · ${okWin ? `el ganador es el ${pad(w.number)}` : 'el ganador no coincide'}</div>`;
  });
  $('#receipt').addEventListener('click', () => sheet(`
    <h2>Comprobante</h2>
    <div class="card pcard-a" style="margin-top:10px">
      <dl class="kv">
        <dt>Pagado a</dt><dd>${esc(c.clinic.name)}</dd>
        <dt>Monto</dt><dd>${clp(r.paidClinic)}</dd>
        <dt>Concepto</dt><dd>${esc(c.treatment)} · ${esc(c.beneficiary.name)}</dd>
        <dt>Fecha</dt><dd>${fmtDate(r.at)}</dd>
        <dt>Rifa</dt><dd>${esc(c.organizer.name)}</dd>
      </dl>
    </div>
    <p style="font-size:13px">En producción aquí se adjunta la factura emitida por la clínica.</p>
    <button class="btn btn-block" data-close>Cerrar</button>`));

  if (live) {
    const dg = $('#dg');
    let t0 = performance.now();
    const target = pad(r.number);
    const tick = now => {
      const k = (now - t0) / 2600;
      if (k >= 1) {
        dg.textContent = target; $('#ball').classList.remove('rolling'); $('#after').style.opacity = 1;
        navigator.vibrate?.([30, 40, 60]);
        confetti($('.draw'), iWon ? 120 : 60);
        history.replaceState(null, '', '#/sorteo/' + id);
        return;
      }
      // Los dígitos se van fijando de izquierda a derecha
      const fixed = Math.floor(k * 5);
      dg.textContent = target.split('').map((ch, i) => i < fixed ? ch : Math.floor(Math.random() * 10)).join('');
      raf = requestAnimationFrame(tick);
    };
    let raf = requestAnimationFrame(tick);
    onLeave(() => cancelAnimationFrame(raf));
  }
}

function notFound() {
  view.innerHTML = `<div class="empty" style="margin-top:80px"><b>No encontramos esa página</b><a class="btn" href="#/">Volver a las causas</a></div>`;
}

// ---------- router ----------
const routes = [
  [/^#?\/?$/, viewHome, 'home'],
  [/^#\/causa\/([\w-]+)$/, viewCause, 'home'],
  [/^#\/causa\/([\w-]+)\/numeros$/, viewNumbers, 'home'],
  [/^#\/checkout$/, viewCheckout, 'home'],
  [/^#\/gracias\/([\w-]+)$/, viewThanks, 'mine'],
  [/^#\/mis-numeros$/, viewMine, 'mine'],
  [/^#\/postular$/, viewApplyHome, 'apply'],
  [/^#\/postular\/nueva$/, viewApply, 'apply'],
  [/^#\/postulacion\/([\w-]+)$/, viewMyCase, 'apply'],
  [/^#\/admin$/, viewAdmin, 'more'],
  [/^#\/admin\/([\w-]+)$/, viewAdminCase, 'more'],
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
      $$('.tabbar [data-tab]').forEach(a => a.classList.toggle('on', a.dataset.tab === tab));
      fn(...m.slice(1));
      window.scrollTo(0, 0);
    };
    if (document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const t = document.startViewTransition(run);
      t.ready.catch(() => {}); t.finished.catch(() => {});
    } else run();
    return;
  }
  go('#/');
}

db.load();
window.addEventListener('hashchange', route);
route();
