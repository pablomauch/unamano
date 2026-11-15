// Capa de datos del MVP. Persiste en localStorage del dispositivo.
// En producción, cada función de este módulo se reemplaza por una
// llamada al backend (ver README › Camino a producción).

import { sha256, randomSeed, pickWinner, prng } from './crypto.js';

const KEY = 'unamano:v4';
const DAY = 86_400_000;
export const OPS_PCT = 8; // % para verificación y operación de la plataforma

// Tipos de causa. El color sigue un orden fijo de paleta validada
// para daltonismo; siempre va acompañado de nombre e ícono.
export const CATEGORIES = {
  salud: { label: 'Salud', color: '#2a78d6', tint: '#E6F0FB', icon: 'steth', provider: 'clínica o centro de salud' },
  educacion: { label: 'Educación', color: '#eb6834', tint: '#FDEDE5', icon: 'book', provider: 'colegio o proveedor educativo' },
  vivienda: { label: 'Vivienda', color: '#1baf7a', tint: '#E3F6EE', icon: 'home', provider: 'constructora o ferretería' },
  emergencia: { label: 'Emergencias', color: '#eda100', tint: '#FDF3DC', icon: 'alert', provider: 'proveedor de la emergencia' },
  inclusion: { label: 'Inclusión', color: '#e87ba4', tint: '#FCEAF1', icon: 'access', provider: 'proveedor especializado' },
  comunidad: { label: 'Comunidad', color: '#008300', tint: '#E3F2E3', icon: 'people', provider: 'proveedor del proyecto' },
};
export const catLabel = k => CATEGORIES[k]?.label || '';

export const ORG_TYPES = [
  'Junta de vecinos', 'Centro de padres y apoderados', 'Club deportivo',
  'Club de adulto mayor', 'Sindicato', 'Organización comunitaria', 'Fundación o corporación',
];

export const CHECKS = [
  { key: 'identidad', label: 'Identidad', how: 'Validamos la identidad de quien recibe el apoyo o de su representante.', icon: 'id' },
  { key: 'necesidad', label: 'Necesidad acreditada', how: 'Revisamos los documentos que respaldan la necesidad: informe médico, social, escolar o de emergencia.', icon: 'doc' },
  { key: 'respaldo', label: 'Respaldo profesional', how: 'Confirmamos al profesional o institución que firma el respaldo.', icon: 'steth' },
  { key: 'proveedor', label: 'Presupuesto del proveedor', how: 'Llamamos al proveedor a su número oficial para confirmar el presupuesto.', icon: 'clinic' },
  { key: 'organizacion', label: 'Organización responsable', how: 'Personalidad jurídica vigente y directiva identificada.', icon: 'people' },
  { key: 'entrevista', label: 'Entrevista', how: 'Conversamos por videollamada con quienes reciben el apoyo.', icon: 'video' },
];

export const clp = n => '$' + Math.round(n).toLocaleString('es-CL');
export const clpShort = n => n >= 1e6 ? '$' + (n / 1e6).toLocaleString('es-CL', { maximumFractionDigits: 1 }) + ' M' : clp(n);
export const pad = (n, len = 4) => String(n).padStart(len, '0');

// Meta = presupuesto / % que va al objetivo
export function computePlan({ budget, price, prizeMode, prizePct }) {
  const prize = prizeMode === 'porcentaje' ? Number(prizePct) || 0 : 0;
  const goalPct = 100 - prize - OPS_PCT;
  const goal = Math.ceil(budget / (goalPct / 100) / 1000) * 1000;
  const total = Math.max(100, Math.ceil((goal / price) * 1.3 / 100) * 100);
  return { goal, total, split: { treatment: goalPct, prize, ops: OPS_PCT } };
}

const U = 'https://images.unsplash.com/';

function causeSeed(t) {
  const base = [
    {
      id: 'rosa-cadera', quote: 'Quiero volver a caminar sin dolor y salir a la feria con mis nietas.', need: 'Necesito operarme la cadera. En el sistema público me dieron hora para 2028.', when: 'y Rosa se opera en diciembre', thanks: 'Gracias por ayudarme a volver a caminar. No sabe lo que significa para mí.', status: 'live', category: 'salud', palette: 0, region: 'Metropolitana',
      photo: U + 'photo-1758686253896-e6c76b6f7aa1',
      title: 'Que Rosa vuelva a caminar sin dolor',
      treatment: 'Cirugía de reemplazo de cadera',
      beneficiary: { name: 'Rosa Muñoz', first: 'Rosa', age: 68, comuna: 'Maipú', people: 1 },
      story: 'Rosa fue costurera durante 34 años. Hace dos años se cayó y desde entonces camina con bastón y con dolor. Su junta de vecinos se organizó para que pueda operarse este año y no en 2028, la fecha que le dieron en la lista de espera.',
      organizer: { name: 'Junta de Vecinos Villa Los Aromos', type: 'Junta de vecinos', contact: 'Patricia, presidenta' },
      backer: { name: 'Dr. Andrés Salinas (ejemplo)', role: 'Traumatólogo' },
      provider: { name: 'Clínica de ejemplo', budget: 3_600_000 },
      price: 2000, prizeMode: 'porcentaje', prizePct: 12, prize: 'Smart TV de 55 pulgadas',
      drawIn: 6, soldSeed: 1560,
    },
    {
      id: 'maitenes-escuela', quote: 'Somos 28 y tenemos tres computadores. Las tareas las hacemos por turnos.', need: 'Queremos un computador por estudiante, para la sala y para la casa.', when: 'y el 4° básico estrena computadores en marzo', thanks: '¡Gracias! Desde el 4° básico de Los Maitenes, con mucho cariño.', status: 'live', category: 'educacion', palette: 1, region: 'Metropolitana',
      photo: U + 'photo-1473649085228-583485e6e4d7',
      title: 'Un computador por estudiante en la Escuela Los Maitenes',
      treatment: 'Equipamiento digital para el 4° básico',
      beneficiary: { name: 'Escuela Rural Los Maitenes', first: '4° básico', comuna: 'Curacaví', people: 28 },
      story: 'Los 28 estudiantes del 4° básico comparten tres computadores. Las tareas en línea las hacen por turnos y muchos no tienen conexión en casa. Con este proyecto cada estudiante tendrá un equipo para usar en la sala y llevar a su casa.',
      organizer: { name: 'Centro de Padres Escuela Los Maitenes', type: 'Centro de padres y apoderados', contact: 'Javiera, tesorera' },
      backer: { name: 'Dirección de la escuela', role: 'Directora del establecimiento' },
      provider: { name: 'Proveedor de tecnología de ejemplo', budget: 5_520_000 },
      price: 2000, prizeMode: 'donado', prizePct: 0, prize: 'Bicicleta, donada por la ferretería del pueblo',
      drawIn: 1.2, soldSeed: 2700,
    },
    {
      id: 'soto-incendio', quote: 'El incendio se llevó la casa. Los vecinos ya levantaron la estructura con sus manos.', need: 'Nos faltan los materiales para cerrar, techar y volver a vivir ahí.', when: 'y la familia Soto vuelve a su casa antes del invierno', thanks: 'Gracias por ayudarnos a volver a casa. Nunca lo vamos a olvidar.', status: 'live', category: 'emergencia', palette: 3, region: 'Valparaíso',
      photo: U + 'photo-1664441342319-ac6034edead5',
      title: 'Volver a casa después del incendio',
      treatment: 'Materiales para reconstruir la casa de la familia Soto',
      beneficiary: { name: 'Familia Soto Pérez', first: 'Familia Soto', comuna: 'Viña del Mar', people: 5 },
      story: 'El incendio de febrero se llevó la casa de la familia Soto. Hoy viven donde unos parientes. Los vecinos ya levantaron la estructura con sus propias manos; lo que falta son los materiales para cerrar, techar y volver a vivir ahí.',
      organizer: { name: 'Junta de Vecinos El Olivar Alto', type: 'Junta de vecinos', contact: 'Hernán, secretario' },
      backer: { name: 'Informe social municipal (ejemplo)', role: 'Asistente social' },
      provider: { name: 'Ferretería de ejemplo', budget: 6_440_000 },
      price: 3000, prizeMode: 'donado', prizePct: 0, prize: 'Fin de semana en cabaña para 4 personas, donado',
      drawIn: 3, soldSeed: 1650,
    },
    {
      id: 'josefa-coclear', quote: 'Josefa nació sin poder oír. Queremos que escuche nuestra voz.', need: 'Con el implante y un año de terapia puede aprender a hablar a tiempo para el colegio.', when: 'y Josefa recibe su implante este verano', thanks: 'Gracias por regalarle a Josefa la posibilidad de escucharnos.', status: 'live', category: 'inclusion', palette: 2, region: 'La Araucanía',
      photo: U + 'flagged/photo-1553178298-251410cb176f',
      title: 'Que Josefa pueda escuchar a su familia',
      treatment: 'Implante coclear y un año de rehabilitación auditiva',
      beneficiary: { name: 'Josefa Cayupán', first: 'Josefa', age: 4, comuna: 'Temuco', people: 1 },
      story: 'Josefa nació con hipoacusia profunda. Con el implante y un año de terapia puede desarrollar el lenguaje a tiempo para entrar al colegio junto a sus compañeros.',
      organizer: { name: 'Club Deportivo Unión Sur', type: 'Club deportivo', contact: 'Marcela, presidenta' },
      backer: { name: 'Dr. Felipe Rojas (ejemplo)', role: 'Otorrinolaringólogo' },
      provider: { name: 'Centro auditivo de ejemplo', budget: 5_520_000 },
      price: 2000, prizeMode: 'donado', prizePct: 0, prize: 'Tablet, donada por una empresa local',
      drawIn: 9, soldSeed: 1870,
    },
    {
      id: 'cancha-union', quote: 'En invierno oscurece a las seis y la cancha queda vacía.', need: 'Con luz, las niñas y niños del barrio pueden seguir entrenando de forma segura.', when: 'y la cancha se ilumina antes de junio', thanks: 'Gracias por devolverle la cancha al barrio.', status: 'live', category: 'comunidad', palette: 3, region: 'Biobío',
      photo: U + 'photo-1744565473172-a3c64b1e1bbb',
      title: 'Luz para la cancha del barrio',
      treatment: 'Iluminación LED para la cancha comunitaria',
      beneficiary: { name: 'Vecinos de Villa Los Ríos', first: 'La cancha', comuna: 'Coronel', people: 140 },
      story: 'En invierno oscurece a las seis y la cancha queda vacía. Con iluminación, las escuelas de fútbol de niñas y niños, y los vecinos que salen a caminar, podrán seguir usándola en la tarde y con seguridad.',
      organizer: { name: 'Club Deportivo Villa Los Ríos', type: 'Club deportivo', contact: 'Rodrigo, tesorero' },
      backer: { name: 'Proyecto técnico de un electricista certificado (ejemplo)', role: 'Instalador SEC' },
      provider: { name: 'Empresa eléctrica de ejemplo', budget: 2_760_000 },
      price: 1000, prizeMode: 'donado', prizePct: 0, prize: 'Camiseta autografiada del club de la ciudad',
      drawIn: 14, soldSeed: 820,
    },
    {
      id: 'luis-rodilla', quote: 'Vivo en un cerro y hoy no puedo subir a mi casa sin parar tres veces.', need: 'Necesito una prótesis de rodilla para volver a mi vida de siempre.', when: 'y don Luis se opera en enero', thanks: 'Gracias, de corazón. Nos vemos en el próximo campeonato de rayuela.', status: 'live', category: 'salud', palette: 0, region: 'Valparaíso',
      photo: U + 'photo-1658314755819-72c38b317e61',
      title: 'Que don Luis vuelva a subir su cerro',
      treatment: 'Prótesis de rodilla',
      beneficiary: { name: 'Luis Contreras', first: 'Luis', age: 74, comuna: 'Valparaíso', people: 1 },
      story: 'Don Luis organiza el campeonato de rayuela de su club hace veinte años. Vive en un cerro de Valparaíso y hoy no puede subir a su casa sin detenerse varias veces.',
      organizer: { name: 'Club de Adulto Mayor Renacer', type: 'Club de adulto mayor', contact: 'Gladys, presidenta' },
      backer: { name: 'Dra. Paula Fuentes (ejemplo)', role: 'Traumatóloga' },
      provider: { name: 'Clínica de ejemplo', budget: 3_198_000 },
      price: 1000, prizeMode: 'porcentaje', prizePct: 10, prize: 'Canasta familiar',
      drawIn: 21, soldSeed: 900,
    },
    {
      id: 'benja-silla', status: 'drawn', category: 'inclusion', palette: 1, region: 'Antofagasta',
      photo: U + 'photo-1701362564317-a3c2b9079923',
      title: 'Una silla a la medida para Benja',
      treatment: 'Silla de ruedas postural pediátrica',
      beneficiary: { name: 'Benjamín Soto', first: 'Benja', age: 11, comuna: 'Antofagasta', people: 1 },
      story: 'Benja creció y su silla ya no le servía. Una silla postural a su medida le cambia el día completo: el colegio, la espalda y los partidos de básquetbol adaptado.',
      organizer: { name: 'Sindicato de Trabajadores Planta Norte', type: 'Sindicato', contact: 'Marcelo, dirigente' },
      backer: { name: 'Dr. Ignacio Paredes (ejemplo)', role: 'Fisiatra' },
      provider: { name: 'Ortopedia de ejemplo', budget: 1_380_000 },
      price: 1000, prizeMode: 'donado', prizePct: 0, prize: 'Parrilla, donada por los socios del sindicato',
      drawIn: -5, soldSeed: 1720,
      outcome: 'Benja ya usa su silla nueva en el colegio y en los entrenamientos.',
    },
    {
      id: 'martina-cardio', status: 'pending', category: 'salud', palette: 2, region: "O'Higgins",
      photo: U + 'photo-1658064335884-45f1f16927f3',
      title: 'Un corazón fuerte para Martina',
      treatment: 'Cirugía cardiaca congénita',
      beneficiary: { name: 'Martina Vega', first: 'Martina', age: 2, comuna: 'Rancagua', people: 1 },
      story: 'Martina necesita una segunda cirugía antes de cumplir tres años. Sus papás postularon junto a la junta de vecinos de su población.',
      organizer: { name: 'Junta de Vecinos Los Castaños', type: 'Junta de vecinos', contact: 'Rodrigo, presidente' },
      backer: { name: 'Dr. Tomás Ibáñez (ejemplo)', role: 'Cardiocirujano infantil' },
      provider: { name: 'Clínica de ejemplo', budget: 7_820_000 },
      price: 3000, prizeMode: 'porcentaje', prizePct: 12, prize: 'Notebook',
      drawIn: 25, soldSeed: 0, checks: { identidad: true, necesidad: true, respaldo: false, proveedor: false, organizacion: true, entrevista: false },
      flags: ['La firma del informe no coincide con la firma registrada del profesional. Revisar antes de aprobar.'],
    },
    {
      id: 'camelias-sede', status: 'pending', category: 'comunidad', palette: 3, region: 'Biobío',
      photo: U + 'photo-1656370465119-cb8d6735bda3',
      title: 'Un techo nuevo para la sede de Las Camelias',
      treatment: 'Reparación del techo de la sede social',
      beneficiary: { name: 'Club de Adulto Mayor Las Camelias', first: 'Las Camelias', comuna: 'Concepción', people: 60 },
      story: 'La sede donde se juntan 60 socios se llueve cada invierno. Este año tuvieron que suspender los talleres de junio y julio.',
      organizer: { name: 'Club de Adulto Mayor Las Camelias', type: 'Club de adulto mayor', contact: 'Rosa, tesorera' },
      backer: { name: 'Presupuesto de un maestro techador (ejemplo)', role: 'Contratista' },
      provider: { name: 'Contratista de ejemplo', budget: 1_656_000 },
      price: 1000, prizeMode: 'donado', prizePct: 0, prize: 'Microondas, donado por el club',
      drawIn: 30, soldSeed: 0, checks: { identidad: true, necesidad: false, respaldo: false, proveedor: false, organizacion: false, entrevista: false },
    },
  ];

  return base.map(c => {
    // Cada número vale $1.000: así cualquier persona puede aportar con poco
    if (c.price !== 1000) { c.soldSeed = Math.round((c.soldSeed || 0) * c.price / 1000); c.price = 1000; }
    const plan = computePlan({ budget: c.provider.budget, price: c.price, prizeMode: c.prizeMode, prizePct: c.prizePct });
    const seed = randomSeed();
    const checks = c.checks || Object.fromEntries(CHECKS.map(k => [k.key, true]));
    const out = { ...c, ...plan, checks, seed, seedHash: sha256(seed), createdAt: t - 20 * DAY, drawAt: t + c.drawIn * DAY, demo: true };
    delete out.drawIn;
    return out;
  });
}

// ---------- Historial de impacto (DEMO) ----------
// Cifras de ejemplo para mostrar cómo se verá el panel de impacto.
// En producción salen de la base de datos de causas cerradas.
export const HISTORY = (() => {
  const r = prng('historia-unamano');
  const now = new Date();
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const growth = 0.35 + (11 - i) / 11 * 0.75;
    const raised = Math.round((9_000_000 + r() * 6_000_000) * growth / 10000) * 10000;
    months.push({ key: d.toISOString().slice(0, 7), label: d.toLocaleDateString('es-CL', { month: 'short' }).replace('.', ''), raised, causes: Math.max(1, Math.round(raised / 2_900_000)) });
  }
  const totalRaised = months.reduce((a, m) => a + m.raised, 0);
  const shares = { salud: .38, educacion: .17, vivienda: .12, emergencia: .14, inclusion: .11, comunidad: .08 };
  const byCategory = Object.fromEntries(Object.entries(shares).map(([k, s]) => [k, Math.round(totalRaised * s / 10000) * 10000]));
  const regions = [['Metropolitana', .36], ['Valparaíso', .16], ['Biobío', .13], ['La Araucanía', .09], ["O'Higgins", .07], ['Antofagasta', .06], ['Los Lagos', .05], ['Otras', .08]];
  const byRegion = regions.map(([name, s]) => ({ name, raised: Math.round(totalRaised * s / 10000) * 10000 }));
  const completed = months.reduce((a, m) => a + m.causes, 0);
  return {
    months, totalRaised, byCategory, byRegion, completed,
    people: 2140, orgs: 87, buyers: 18_900, refunds: 3,
  };
})();

// Historias cumplidas de ejemplo (DEMO)
export const STORIES = [
  { title: 'Calefacción para tres salas de la Escuela de Lonquimay', category: 'educacion', amount: 4_380_000, provider: 'Proveedor de calefacción', when: 'Agosto', people: 74, photo: U + 'photo-1473649085228-583485e6e4d7', outcome: '74 estudiantes pasaron el invierno en salas temperadas.' },
  { title: 'Techo nuevo para la familia Huenchullán después del temporal', category: 'vivienda', amount: 3_150_000, provider: 'Ferretería local', when: 'Julio', people: 6, photo: U + 'photo-1664441342319-ac6034edead5', outcome: 'La familia volvió a su casa antes de la segunda lluvia.' },
  { title: 'Una sede accesible para la Junta de Vecinos San Rafael', category: 'inclusion', amount: 2_240_000, provider: 'Contratista de la comuna', when: 'Junio', people: 210, photo: U + 'photo-1656370465119-cb8d6735bda3', outcome: 'Rampa y baño accesible: ahora todos los vecinos pueden participar.' },
];

// ---------- Estado ----------
let state = null;
const soldCache = new Map();

function fresh() {
  const t = Date.now();
  const s = { v: 4, createdAt: t, causes: causeSeed(t), purchases: [], profile: {}, adminOk: false, prefs: {} };
  state = s;
  const benja = s.causes.find(c => c.id === 'benja-silla');
  finalizeDraw(benja, t - 5 * DAY);
  return s;
}

export function load() {
  if (state) return state;
  try { const raw = localStorage.getItem(KEY); state = raw ? JSON.parse(raw) : null; } catch { state = null; }
  if (!state || state.v !== 4) { state = fresh(); save(); }
  return state;
}

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { console.warn('No se pudo guardar', e); }
  soldCache.clear();
  window.dispatchEvent(new CustomEvent('unamano:change'));
}

export function reset() {
  const prefs = state?.prefs;
  localStorage.removeItem(KEY);
  state = null; soldCache.clear();
  load(); if (prefs) { state.prefs = prefs; save(); }
}

export const prefs = () => load().prefs || {};
export function setPref(k, v) { load().prefs = { ...(state.prefs || {}), [k]: v }; save(); }

// ---------- Lectura ----------
export const causes = (filter = {}) => load().causes.filter(c => !filter.status || [].concat(filter.status).includes(c.status));
export const cause = id => load().causes.find(c => c.id === id);

export function soldSet(c) {
  if (soldCache.has(c.id)) return soldCache.get(c.id);
  const set = new Set();
  if (c.soldSeed) {
    const r = prng(c.id);
    while (set.size < Math.min(c.soldSeed, c.total)) set.add(1 + Math.floor(r() * c.total));
  }
  for (const p of load().purchases) if (p.causeId === c.id && p.status !== 'refunded') p.numbers.forEach(n => set.add(n));
  soldCache.set(c.id, set);
  return set;
}

export function stats(c) {
  const sold = soldSet(c).size;
  const raised = c.status === 'refunded' ? (c.result?.raised || 0) : sold * c.price;
  const pct = Math.min(100, (raised / c.goal) * 100);
  const ms = c.drawAt - Date.now();
  return { sold, raised, pct, missing: Math.max(0, c.goal - raised), available: c.total - sold, ms, closed: ms <= 0, reached: raised >= c.goal };
}

export function timeLeft(ms) {
  if (ms <= 0) return 'cerrada';
  const d = Math.floor(ms / DAY), h = Math.floor(ms % DAY / 3_600_000), m = Math.floor(ms % 3_600_000 / 60_000);
  if (d >= 2) return `${d} días`;
  if (d === 1) return `1 día y ${h} h`;
  return `${h} h ${String(m).padStart(2, '0')} min`;
}

// La causa destacada: la más cercana a cumplirse entre las activas
export function featured() {
  const live = causes({ status: 'live' });
  return live.sort((a, b) => stats(b).pct - stats(a).pct)[0] || null;
}

export const purchases = () => load().purchases.slice().sort((a, b) => b.createdAt - a.createdAt);
export const profile = () => load().profile || {};

export function trustScore(c) {
  const done = CHECKS.filter(k => c.checks?.[k.key]).length;
  return Math.max(0, Math.round((done / CHECKS.length) * 100) - (c.flags?.length || 0) * 12);
}

// Impacto total = historial demo + lo que pasa en este dispositivo
export function impact() {
  const all = load().causes;
  const live = all.filter(c => c.status === 'live');
  const done = all.filter(c => c.status === 'drawn');
  const liveRaised = live.reduce((a, c) => a + stats(c).raised, 0);
  const doneRaised = done.reduce((a, c) => a + (c.result?.raised || 0), 0);
  const myBuys = load().purchases.filter(p => p.status === 'paid').length;
  const byCategory = { ...HISTORY.byCategory };
  for (const c of [...live, ...done]) byCategory[c.category] = (byCategory[c.category] || 0) + (c.status === 'live' ? stats(c).raised : c.result.raised);
  const months = HISTORY.months.map(m => ({ ...m }));
  return {
    raised: HISTORY.totalRaised + liveRaised + doneRaised,
    completed: HISTORY.completed + done.length,
    people: HISTORY.people + done.reduce((a, c) => a + (c.beneficiary.people || 1), 0),
    orgs: HISTORY.orgs + new Set(all.map(c => c.organizer.name)).size,
    buyers: HISTORY.buyers + myBuys,
    live: live.length, months, byCategory, byRegion: HISTORY.byRegion,
    split: { goal: 84, prize: 8, ops: 8 },
  };
}

// Actividad reciente (ejemplo + compras reales del dispositivo)
export function activity() {
  const live = causes({ status: 'live' });
  const names = ['Camila', 'Jorge', 'Valentina', 'Pedro', 'Francisca', 'Matías', 'Carolina', 'Ignacio', 'Daniela', 'Sebastián'];
  const r = prng('feed' + new Date().toDateString());
  const items = [];
  for (let i = 0; i < 6; i++) {
    const c = live[Math.floor(r() * live.length)];
    const n = 1 + Math.floor(r() * 4);
    items.push({ who: names[Math.floor(r() * names.length)], n, cause: c, mins: 2 + i * 7 + Math.floor(r() * 6) });
  }
  const mine = purchases().slice(0, 2).map(p => ({ who: 'Tú', n: p.numbers.length, cause: cause(p.causeId), mins: Math.max(0, Math.round((Date.now() - p.createdAt) / 60000)), mine: true }));
  return [...mine, ...items].slice(0, 6);
}

// ---------- Escritura ----------
export function buy(causeId, numbers, buyer, method) {
  const c = cause(causeId);
  if (!c || c.status !== 'live') throw new Error('Esta rifa no está activa.');
  const sold = soldSet(c);
  const clash = numbers.filter(n => sold.has(n));
  if (clash.length) throw new Error(`Alguien acaba de comprar el ${clash.map(n => pad(n)).join(', ')}. Elige otro.`);
  const p = { id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), causeId, numbers: numbers.slice().sort((a, b) => a - b), amount: numbers.length * c.price, buyer, method, status: 'paid', createdAt: Date.now() };
  state.purchases.push(p);
  state.profile = { name: buyer.name, email: buyer.email, phone: buyer.phone };
  save();
  return p;
}

export function randomFree(c, n, exclude = new Set()) {
  const sold = soldSet(c);
  const free = [];
  for (let i = 1; i <= c.total; i++) if (!sold.has(i) && !exclude.has(i)) free.push(i);
  const out = [];
  while (out.length < n && free.length) out.push(free.splice(Math.floor(Math.random() * free.length), 1)[0]);
  return out.sort((a, b) => a - b);
}

export function submitCause(data) {
  const plan = computePlan(data);
  const id = (data.beneficiary.first || 'causa').toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '') + '-' + Date.now().toString(36).slice(-5);
  const seed = randomSeed();
  const c = {
    id, status: 'pending', category: data.category, palette: Math.floor(Math.random() * 4), region: data.region || 'Metropolitana',
    title: data.title, treatment: data.treatment, beneficiary: data.beneficiary, story: data.story,
    organizer: data.organizer, backer: data.backer, provider: { name: data.providerName, budget: Number(data.budget) },
    price: Number(data.price), prizeMode: data.prizeMode, prizePct: Number(data.prizePct) || 0, prize: data.prize,
    cover: data.cover || null, documents: data.documents || [],
    ...plan, checks: Object.fromEntries(CHECKS.map(k => [k.key, false])),
    seed, seedHash: sha256(seed), soldSeed: 0,
    createdAt: Date.now(), drawAt: new Date(data.drawDate + 'T20:00:00').getTime(), mine: true,
  };
  state.causes.push(c);
  save();
  return c;
}

export function setCheck(id, key, val) { const c = cause(id); c.checks[key] = val; save(); }
export function clearFlags(id) { const c = cause(id); c.flags = []; save(); }

export function approve(id) {
  const c = cause(id);
  if (!CHECKS.every(k => c.checks[k.key])) throw new Error('Faltan verificaciones.');
  c.seed = randomSeed(); c.seedHash = sha256(c.seed);
  c.status = 'live'; c.approvedAt = Date.now();
  if (c.drawAt < Date.now() + DAY) c.drawAt = Date.now() + 7 * DAY;
  save();
}
export function reject(id, reason) { const c = cause(id); c.status = 'rejected'; c.rejectReason = reason; save(); }
export function simulateSales(id, count) { const c = cause(id); c.soldSeed = Math.min(c.total, (c.soldSeed || 0) + count); save(); }
export function closeNow(id) { const c = cause(id); c.drawAt = Date.now() - 1000; save(); }

function finalizeDraw(c, at = Date.now()) {
  const st = stats(c);
  if (st.reached && st.sold > 0) {
    const sold = [...soldSet(c)].sort((a, b) => a - b);
    const w = pickWinner(c.seed, c.id, sold);
    const buyer = state.purchases.find(p => p.causeId === c.id && p.numbers.includes(w.number) && p.status === 'paid');
    c.status = 'drawn';
    c.result = { at, number: w.number, digest: w.digest, idx: w.idx, soldCount: sold.length, raised: st.raised, paid: c.provider.budget, winnerPurchase: buyer ? buyer.id : null };
    if (buyer) buyer.won = true;
  } else {
    c.status = 'refunded';
    let refunded = 0;
    for (const p of state.purchases) if (p.causeId === c.id && p.status === 'paid') { p.status = 'refunded'; refunded += p.amount; }
    c.result = { at, raised: st.raised, refunded, soldCount: st.sold };
  }
}

export function runDraw(id) {
  const c = cause(id);
  if (c.status !== 'live') throw new Error('La rifa no está activa.');
  finalizeDraw(c); save();
  return c;
}

export function setAdmin(ok) { load().adminOk = ok; save(); }
