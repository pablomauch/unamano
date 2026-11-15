// Capa de datos del MVP. Persiste en localStorage del dispositivo.
// En producción, cada función de este módulo se reemplaza por una
// llamada al backend (ver README › Camino a producción).

import { sha256, randomSeed, pickWinner, prng } from './crypto.js';

const KEY = 'unamano:v1';
const DAY = 86_400_000;
export const OPS_PCT = 8; // % para verificación y operación de la plataforma

export const CATEGORIES = {
  cirugia: 'Cirugía',
  tratamiento: 'Tratamiento',
  ayuda: 'Ayuda técnica',
  medicamentos: 'Medicamentos',
};

export const ORG_TYPES = [
  'Junta de vecinos', 'Centro de padres y apoderados', 'Club deportivo',
  'Club de adulto mayor', 'Sindicato', 'Organización comunitaria', 'Fundación o corporación',
];

export const CHECKS = [
  { key: 'identidad', label: 'Identidad del beneficiario', how: 'Cédula validada con el Registro Civil', icon: 'id' },
  { key: 'medico', label: 'Médico tratante', how: 'Inscrito en el Registro Nacional de Prestadores Individuales de Salud', icon: 'steth' },
  { key: 'documentos', label: 'Diagnóstico y documentos', how: 'Informe médico revisado por el equipo, con apoyo de IA para detectar inconsistencias', icon: 'doc' },
  { key: 'clinica', label: 'Presupuesto de la clínica', how: 'Confirmado llamando directo a la clínica, nunca al número que dio la familia', icon: 'clinic' },
  { key: 'organizacion', label: 'Organización que rifa', how: 'Personalidad jurídica vigente y directiva identificada', icon: 'people' },
  { key: 'videollamada', label: 'Entrevista por videollamada', how: 'Conversación con el beneficiario o su familia', icon: 'video' },
];

export const clp = n => '$' + Math.round(n).toLocaleString('es-CL');
export const pad = (n, len = 4) => String(n).padStart(len, '0');

// Meta = presupuesto / % que va al tratamiento
export function computePlan({ budget, price, prizeMode, prizePct }) {
  const prize = prizeMode === 'porcentaje' ? Number(prizePct) || 0 : 0;
  const treatment = 100 - prize - OPS_PCT;
  const goal = Math.ceil(budget / (treatment / 100) / 1000) * 1000;
  const total = Math.max(100, Math.ceil((goal / price) * 1.3 / 100) * 100);
  return { goal, total, split: { treatment, prize, ops: OPS_PCT } };
}

function causeSeed(t) {
  const base = [
    {
      id: 'rosa-cadera', status: 'live', category: 'cirugia', palette: 0,
      title: 'Una cadera nueva para Rosa',
      treatment: 'Cirugía de reemplazo total de cadera',
      beneficiary: { name: 'Rosa Muñoz', first: 'Rosa', age: 68, comuna: 'Maipú' },
      story: 'Rosa fue costurera 34 años. Hace dos años se cayó en la feria y desde entonces camina con bastón y mucho dolor. La lista de espera le da fecha para 2028. Su clínica le puede operar en diciembre si junta lo que falta.',
      organizer: { name: 'Junta de Vecinos Villa Los Aromos', type: 'Junta de vecinos', contact: 'Patricia, presidenta' },
      doctor: { name: 'Dr. Andrés Salinas (ejemplo)', specialty: 'Traumatología' },
      clinic: { name: 'Clínica del ejemplo', budget: 3_600_000 },
      price: 2000, prizeMode: 'porcentaje', prizePct: 12, prize: 'Smart TV 55 pulgadas',
      drawIn: 6, soldSeed: 1560, checksAll: true,
    },
    {
      id: 'tomas-onco', status: 'live', category: 'medicamentos', palette: 1,
      title: 'Que a Tomás no le falte ningún ciclo',
      treatment: 'Medicamentos oncológicos fuera de cobertura',
      beneficiary: { name: 'Tomás Herrera', first: 'Tomás', age: 7, comuna: 'Puente Alto' },
      story: 'Tomás está en segundo básico y en tratamiento de leucemia. La mayor parte está cubierta, pero dos medicamentos de soporte no. Su curso entero se puso la camiseta.',
      organizer: { name: 'Centro de Padres Escuela Los Libertadores', type: 'Centro de padres y apoderados', contact: 'Javiera, tesorera' },
      doctor: { name: 'Dra. Carolina Vidal (ejemplo)', specialty: 'Oncología infantil' },
      clinic: { name: 'Farmacia del hospital de ejemplo', budget: 6_240_000 },
      price: 3000, prizeMode: 'porcentaje', prizePct: 12, prize: 'Bicicleta eléctrica',
      drawIn: 1.2, soldSeed: 2380, checksAll: true,
    },
    {
      id: 'josefa-coclear', status: 'live', category: 'ayuda', palette: 2,
      title: 'Para que Josefa escuche el mar',
      treatment: 'Implante coclear y rehabilitación auditiva',
      beneficiary: { name: 'Josefa Cayupán', first: 'Josefa', age: 4, comuna: 'Temuco' },
      story: 'Josefa nació con hipoacusia profunda. Con el implante y un año de terapia puede aprender a hablar a tiempo para entrar al colegio con sus compañeros.',
      organizer: { name: 'Club Deportivo Unión Sur', type: 'Club deportivo', contact: 'Hernán, secretario' },
      doctor: { name: 'Dr. Felipe Rojas (ejemplo)', specialty: 'Otorrinolaringología' },
      clinic: { name: 'Centro auditivo de ejemplo', budget: 5_520_000 },
      price: 2000, prizeMode: 'donado', prizePct: 0, prize: 'Fin de semana en cabaña para 4, donado por Cabañas del Lago',
      drawIn: 3, soldSeed: 2340, checksAll: true,
    },
    {
      id: 'luis-rodilla', status: 'live', category: 'cirugia', palette: 3,
      title: 'Don Luis quiere volver a bailar cueca',
      treatment: 'Prótesis de rodilla',
      beneficiary: { name: 'Luis Contreras', first: 'Luis', age: 74, comuna: 'Valparaíso' },
      story: 'Don Luis es el alma del club: organiza el campeonato de rayuela y baila cueca en cada fonda. Hace un año que no puede subir los cerros de su casa sin parar tres veces.',
      organizer: { name: 'Club de Adulto Mayor Renacer', type: 'Club de adulto mayor', contact: 'Gladys, presidenta' },
      doctor: { name: 'Dra. Paula Fuentes (ejemplo)', specialty: 'Traumatología' },
      clinic: { name: 'Clínica del ejemplo', budget: 3_198_000 },
      price: 1000, prizeMode: 'porcentaje', prizePct: 10, prize: 'Canasta familiar + gift card de supermercado',
      drawIn: 14, soldSeed: 900, checksAll: true,
    },
    {
      id: 'benja-silla', status: 'drawn', category: 'ayuda', palette: 4,
      title: 'Una silla a la medida para Benja',
      treatment: 'Silla de ruedas postural pediátrica',
      beneficiary: { name: 'Benjamín Soto', first: 'Benja', age: 11, comuna: 'Antofagasta' },
      story: 'Benja creció y su silla ya no le sirve. Una silla postural a su medida le cambia el día completo: el colegio, la espalda y los partidos de básquetbol adaptado.',
      organizer: { name: 'Sindicato de Trabajadores Planta Norte', type: 'Sindicato', contact: 'Marcelo, dirigente' },
      doctor: { name: 'Dr. Ignacio Paredes (ejemplo)', specialty: 'Fisiatría' },
      clinic: { name: 'Ortopedia de ejemplo', budget: 1_380_000 },
      price: 1000, prizeMode: 'donado', prizePct: 0, prize: 'Parrilla a gas, donada por los socios del sindicato',
      drawIn: -5, soldSeed: 1720, checksAll: true,
    },
    {
      id: 'martina-cardio', status: 'pending', category: 'cirugia', palette: 1,
      title: 'Un corazón fuerte para Martina',
      treatment: 'Cirugía cardiaca congénita',
      beneficiary: { name: 'Martina Vega', first: 'Martina', age: 2, comuna: 'Rancagua' },
      story: 'Martina necesita una segunda cirugía antes de cumplir tres años. Sus papás postularon con la junta de vecinos de su población.',
      organizer: { name: 'Junta de Vecinos Los Castaños', type: 'Junta de vecinos', contact: 'Rodrigo, presidente' },
      doctor: { name: 'Dr. Tomás Ibáñez (ejemplo)', specialty: 'Cardiocirugía infantil' },
      clinic: { name: 'Clínica del ejemplo', budget: 7_820_000 },
      price: 3000, prizeMode: 'porcentaje', prizePct: 12, prize: 'Notebook',
      drawIn: 25, soldSeed: 0, checks: { identidad: true, medico: true, documentos: false, clinica: false, organizacion: true, videollamada: false },
      flags: ['La firma del informe médico no calza con la firma registrada del profesional. Revisar antes de aprobar.'],
    },
    {
      id: 'carmen-dental', status: 'pending', category: 'tratamiento', palette: 2,
      title: 'La sonrisa de la señora Carmen',
      treatment: 'Rehabilitación oral completa',
      beneficiary: { name: 'Carmen Rivas', first: 'Carmen', age: 61, comuna: 'Concepción' },
      story: 'Carmen perdió casi todas sus piezas dentales por una enfermedad periodontal. Le cuesta comer y dejó de ir a las reuniones del club.',
      organizer: { name: 'Club de Adulto Mayor Las Camelias', type: 'Club de adulto mayor', contact: 'Rosa, tesorera' },
      doctor: { name: 'Dra. Daniela Mora (ejemplo)', specialty: 'Rehabilitación oral' },
      clinic: { name: 'Centro dental de ejemplo', budget: 1_656_000 },
      price: 1000, prizeMode: 'donado', prizePct: 0, prize: 'Microondas, donado por el club',
      drawIn: 30, soldSeed: 0, checks: { identidad: true, medico: false, documentos: false, clinica: false, organizacion: false, videollamada: false },
    },
  ];

  return base.map(c => {
    const plan = computePlan({ budget: c.clinic.budget, price: c.price, prizeMode: c.prizeMode, prizePct: c.prizePct });
    const seed = randomSeed();
    const checks = c.checks || Object.fromEntries(CHECKS.map(k => [k.key, !!c.checksAll]));
    const out = {
      ...c, ...plan, checks,
      seed, seedHash: sha256(seed),
      createdAt: t - 20 * DAY,
      drawAt: t + c.drawIn * DAY,
      demo: true,
    };
    delete out.drawIn; delete out.checksAll;
    return out;
  });
}

// ---------- Estado ----------
let state = null;
const soldCache = new Map();

function fresh() {
  const t = Date.now();
  const s = { v: 1, createdAt: t, causes: causeSeed(t), purchases: [], profile: {}, adminOk: false };
  // El caso de Benja ya se sorteó: generamos su resultado de forma real.
  const benja = s.causes.find(c => c.id === 'benja-silla');
  state = s;
  finalizeDraw(benja, t - 5 * DAY);
  return s;
}

export function load() {
  if (state) return state;
  try {
    const raw = localStorage.getItem(KEY);
    state = raw ? JSON.parse(raw) : null;
  } catch { state = null; }
  if (!state || state.v !== 1) { state = fresh(); save(); }
  return state;
}

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch (e) { console.warn('No se pudo guardar', e); }
  soldCache.clear();
  window.dispatchEvent(new CustomEvent('unamano:change'));
}

export function reset() {
  localStorage.removeItem(KEY);
  state = null; soldCache.clear();
  load();
  window.dispatchEvent(new CustomEvent('unamano:change'));
}

// ---------- Lectura ----------
export const causes = (filter = {}) => {
  const all = load().causes;
  return all.filter(c => !filter.status || [].concat(filter.status).includes(c.status));
};
export const cause = id => load().causes.find(c => c.id === id);

export function soldSet(c) {
  if (soldCache.has(c.id)) return soldCache.get(c.id);
  const set = new Set();
  // Ventas de ejemplo, deterministas por causa
  if (c.soldSeed) {
    const r = prng(c.id);
    while (set.size < Math.min(c.soldSeed, c.total)) set.add(1 + Math.floor(r() * c.total));
  }
  for (const p of load().purchases) {
    if (p.causeId === c.id && p.status !== 'refunded') p.numbers.forEach(n => set.add(n));
  }
  soldCache.set(c.id, set);
  return set;
}

export function stats(c) {
  const sold = soldSet(c).size;
  const raised = c.status === 'refunded' ? (c.result?.raised || 0) : sold * c.price;
  const pct = Math.min(100, (raised / c.goal) * 100);
  const ms = c.drawAt - Date.now();
  return {
    sold, raised, pct,
    missing: Math.max(0, c.goal - raised),
    available: c.total - sold,
    ms, closed: ms <= 0,
    reached: raised >= c.goal,
  };
}

export function timeLeft(ms) {
  if (ms <= 0) return 'cerrada';
  const d = Math.floor(ms / DAY), h = Math.floor(ms % DAY / 3_600_000), m = Math.floor(ms % 3_600_000 / 60_000);
  if (d >= 2) return `${d} días`;
  if (d === 1) return `1 día ${h} h`;
  return `${h} h ${String(m).padStart(2, '0')} min`;
}

export const purchases = () => load().purchases.slice().sort((a, b) => b.createdAt - a.createdAt);
export const profile = () => load().profile || {};

export function trustScore(c) {
  const done = CHECKS.filter(k => c.checks?.[k.key]).length;
  const penalty = (c.flags?.length || 0) * 12;
  return Math.max(0, Math.round((done / CHECKS.length) * 100) - penalty);
}

// ---------- Escritura ----------
export function buy(causeId, numbers, buyer, method) {
  const c = cause(causeId);
  if (!c || c.status !== 'live') throw new Error('Esta rifa no está activa.');
  const sold = soldSet(c);
  const clash = numbers.filter(n => sold.has(n));
  if (clash.length) throw new Error(`Alguien acaba de comprar el ${clash.map(n => pad(n)).join(', ')}. Elige otro.`);
  const p = {
    id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    causeId, numbers: numbers.slice().sort((a, b) => a - b),
    amount: numbers.length * c.price,
    buyer, method, status: 'paid', createdAt: Date.now(),
  };
  state.purchases.push(p);
  state.profile = { name: buyer.name, email: buyer.email, phone: buyer.phone };
  save();
  return p;
}

export function submitCause(data) {
  const plan = computePlan(data);
  const id = (data.beneficiary.first || 'caso').toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '') + '-' + Date.now().toString(36).slice(-5);
  const seed = randomSeed();
  const c = {
    id, status: 'pending', category: data.category, palette: Math.floor(Math.random() * 5),
    title: data.title, treatment: data.treatment, beneficiary: data.beneficiary, story: data.story,
    organizer: data.organizer, doctor: data.doctor, clinic: { name: data.clinicName, budget: Number(data.budget) },
    price: Number(data.price), prizeMode: data.prizeMode, prizePct: Number(data.prizePct) || 0, prize: data.prize,
    cover: data.cover || null, documents: data.documents || [],
    ...plan, checks: Object.fromEntries(CHECKS.map(k => [k.key, false])),
    seed, seedHash: sha256(seed), soldSeed: 0,
    createdAt: Date.now(), drawAt: new Date(data.drawDate + 'T20:00:00').getTime(),
    mine: true,
  };
  state.causes.push(c);
  save();
  return c;
}

export function setCheck(id, key, val) {
  const c = cause(id); c.checks[key] = val; save();
}
export function clearFlags(id) { const c = cause(id); c.flags = []; save(); }

export function approve(id) {
  const c = cause(id);
  if (!CHECKS.every(k => c.checks[k.key])) throw new Error('Faltan verificaciones.');
  // Semilla nueva al publicar: su hash queda visible antes de vender
  c.seed = randomSeed(); c.seedHash = sha256(c.seed);
  c.status = 'live'; c.approvedAt = Date.now();
  if (c.drawAt < Date.now() + DAY) c.drawAt = Date.now() + 7 * DAY;
  save();
}
export function reject(id, reason) {
  const c = cause(id); c.status = 'rejected'; c.rejectReason = reason; save();
}

// Simula ventas de terceros (solo demo / backoffice)
export function simulateSales(id, count) {
  const c = cause(id);
  c.soldSeed = Math.min(c.total, (c.soldSeed || 0) + count);
  save();
}
export function closeNow(id) { const c = cause(id); c.drawAt = Date.now() - 1000; save(); }

function finalizeDraw(c, at = Date.now()) {
  const st = stats(c);
  if (st.reached && st.sold > 0) {
    const sold = [...soldSet(c)].sort((a, b) => a - b);
    const w = pickWinner(c.seed, c.id, sold);
    const buyer = state.purchases.find(p => p.causeId === c.id && p.numbers.includes(w.number) && p.status === 'paid');
    c.status = 'drawn';
    c.result = {
      at, number: w.number, digest: w.digest, idx: w.idx, soldCount: sold.length,
      raised: st.raised, paidClinic: c.clinic.budget, prizeValue: Math.round(st.raised * c.split.prize / 100),
      winnerPurchase: buyer ? buyer.id : null,
      winnerLabel: buyer ? buyer.buyer.name : null,
    };
    if (buyer) buyer.won = true;
  } else {
    c.status = 'refunded';
    let refunded = 0;
    for (const p of state.purchases) {
      if (p.causeId === c.id && p.status === 'paid') { p.status = 'refunded'; refunded += p.amount; }
    }
    c.result = { at, raised: st.raised, refunded, soldCount: st.sold };
  }
}

export function runDraw(id) {
  const c = cause(id);
  if (c.status !== 'live') throw new Error('La rifa no está activa.');
  finalizeDraw(c);
  save();
  return c;
}

export function setAdmin(ok) { load().adminOk = ok; save(); }
