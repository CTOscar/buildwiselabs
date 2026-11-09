// Página "Status" (estilo statuspage.hostinger.com): estado de componentes, incidentes y mantenimientos.
// Datos de demostración guardados en el navegador (clave pf-status-v1) hasta conectar endpoints de salud reales.
// Este archivo no toca el DOM: se prueba aislado. El HTML se arma en html.js.
export const KEY = 'pf-status-v1';
export const DAYS = 90;
const DAY = 864e5;

export const LABELS = { operational: 'Operativo', degraded: 'Rendimiento degradado', partial: 'Interrupción parcial', major: 'Interrupción mayor', maintenance: 'En mantenimiento' };
export const RANK = { operational: 0, maintenance: 1, degraded: 2, partial: 3, major: 4 };
// Fracción de disponibilidad que cuenta un día según su estado.
const FILL = { degraded: 0.98, partial: 0.93, major: 0.8, maintenance: 1 };
export const PHASES = ['Investigando', 'Identificado', 'Monitoreando', 'Resuelto'];

export const GROUPS = [
  { name: 'Frontend', comps: [['Sitio web', 'buildwiselabs.net'], ['Panel de flota', 'Mapa, flota, alertas y reportes'], ['Inicio de sesión', 'Autenticación de usuarios'], ['Página de inicio / CDN', 'Activos estáticos e imágenes']] },
  { name: 'Actualizaciones de servidor', comps: [['Parches del sistema (Debian)', 'Actualizaciones de seguridad del SO'], ['API / Backend', 'Node.js · endpoints del panel'], ['Base de datos', 'Respaldos y réplicas'], ['Servidor GPS (Traccar)', 'Recepción de rastreadores Teltonika']] },
  { name: 'Soporte programado', comps: [['Mesa de ayuda', 'Correo y chat, L–V 9:00–18:00 (GMT-7)'], ['Ventanas de mantenimiento', 'Sábados 23:00–01:00 (GMT-7)']] },
];
export const ALL = GROUPS.flatMap((g) => g.comps.map((c) => c[0]));

export const dayKey = (d) => new Date(d).toISOString().slice(0, 10);
export const worst = (states) => states.reduce((a, b) => (RANK[b] > RANK[a] ? b : a), 'operational');

// Estado de demostración: historial de 90 días, un incidente abierto y mantenimientos.
export function seed(now = Date.now()) {
  const H = {
    'Página de inicio / CDN': { 0: 'degraded', 1: 'degraded', 20: 'partial' }, 'Inicio de sesión': { 3: 'partial', 41: 'degraded' },
    'Parches del sistema (Debian)': { 6: 'maintenance', 34: 'maintenance' }, 'Servidor GPS (Traccar)': { 15: 'degraded', 58: 'partial' },
    'API / Backend': { 3: 'degraded', 74: 'major' }, 'Panel de flota': { 9: 'partial' }, 'Base de datos': { 0: 'maintenance', 27: 'maintenance' },
    'Ventanas de mantenimiento': { 13: 'maintenance', 27: 'maintenance', 55: 'maintenance' }, 'Sitio web': { 88: 'nodata' },
  };
  const hist = {};
  ALL.forEach((c) => {
    hist[c] = {};
    Object.keys(H[c] || {}).forEach((back) => {
      hist[c][dayKey(now - back * DAY)] = H[c][back];
    });
  });
  const comps = Object.fromEntries(ALL.map((c) => [c, 'operational']));
  comps['Página de inicio / CDN'] = 'degraded';
  comps['Base de datos'] = 'maintenance';
  return {
    admin: false,
    comps,
    hist,
    incidents: [
      {
        id: 1, title: 'Carga lenta de imágenes en la página de inicio', comp: 'Página de inicio / CDN', sev: 'degraded', phase: 'Monitoreando',
        updates: [
          { phase: 'Monitoreando', msg: 'Aplicamos una corrección en la caché de la CDN y vemos mejoría. Seguimos observando.', t: now - 2 * 36e5 },
          { phase: 'Identificado', msg: 'Detectamos que algunos activos estáticos no se están sirviendo desde caché.', t: now - 5 * 36e5 },
          { phase: 'Investigando', msg: 'Estamos revisando reportes de carga lenta en la página de inicio.', t: now - 7 * 36e5 },
        ],
      },
    ],
    maint: [
      { id: 11, title: 'Mantenimiento de la base de datos', comp: 'Base de datos', start: now - 36e5 / 2, hours: 1, text: 'Optimización de índices y verificación de respaldos. El rendimiento puede variar durante la ventana.', state: 'progress', posted: now - 3 * DAY },
      { id: 12, title: 'Actualización de seguridad del sistema operativo (Debian)', comp: 'Parches del sistema (Debian)', start: now + 6 * DAY, hours: 2, text: 'Aplicaremos parches de seguridad al servidor. Se espera una breve interrupción (menos de 5 minutos) del panel y la API al reiniciar servicios.', state: 'scheduled', posted: now - DAY },
      { id: 13, title: 'Despliegue de nueva versión del frontend', comp: 'Panel de flota', start: now + 13 * DAY, hours: 1, text: 'Publicación del rediseño del panel. No se espera interrupción; puede ser necesario recargar la página (Ctrl+Shift+R).', state: 'scheduled', posted: now - 2 * DAY },
    ],
    past: [
      { id: 21, day: dayKey(now - DAY), title: 'Actualización de servidor completada', text: 'Se aplicaron los parches de seguridad del kernel sin impacto para los usuarios.' },
      { id: 22, day: dayKey(now - 3 * DAY), title: 'Intermitencia en el inicio de sesión', text: 'Un pico de solicitudes provocó errores 502 durante 14 minutos. Se amplió la capacidad del proxy.' },
      { id: 23, day: dayKey(now - 9 * DAY), title: 'Despliegue del frontend con rollback', text: 'Una versión del panel se revirtió por un error en el mapa. Servicio restablecido.' },
      { id: 24, day: dayKey(now - 15 * DAY), title: 'Latencia alta en el servidor GPS', text: 'Reinicio del servicio Traccar tras acumulación de conexiones.' },
    ],
  };
}

// `storage` = { getItem, setItem } (localStorage); `clock` permite fijar la hora en pruebas.
export function createStatus({ storage = null, clock = Date.now } = {}) {
  let S = null;
  const read = () => {
    try {
      return JSON.parse(storage?.getItem(KEY));
    } catch {
      return null;
    }
  };
  const state = () => {
    if (!S) S = read();
    if (!S?.comps) S = seed(clock());
    ALL.forEach((c) => {
      if (!S.comps[c]) S.comps[c] = 'operational';
    });
    return S;
  };
  const save = () => {
    try {
      storage?.setItem(KEY, JSON.stringify(S));
    } catch {
      /* sin almacenamiento */
    }
  };

  // Anota en el historial de hoy el peor estado del componente.
  function mark(comp, st) {
    const k = dayKey(clock());
    const h = state().hist[comp] || (S.hist[comp] = {});
    if (st !== 'operational' && RANK[st] >= RANK[h[k] || 'operational']) h[k] = st;
  }
  // El estado de un componente sale de sus incidentes abiertos y de si tiene mantenimiento en curso.
  function recompute(comp) {
    const s = state();
    const sev = s.incidents.filter((i) => i.comp === comp).map((i) => i.sev);
    if (s.maint.some((m) => m.comp === comp && m.state === 'progress')) sev.push('maintenance');
    s.comps[comp] = worst(sev);
    mark(comp, s.comps[comp]);
  }
  function uptime(comp) {
    const h = state().hist[comp] || {};
    let good = 0;
    let n = 0;
    for (let i = 0; i < DAYS; i++) {
      const st = h[dayKey(clock() - i * DAY)];
      if (st === 'nodata') continue;
      n++;
      good += st ? (FILL[st] == null ? 1 : FILL[st]) : 1;
    }
    return n ? (good / n) * 100 : 100;
  }

  const actions = {
    admin() {
      state().admin = !S.admin;
    },
    reset() {
      S = seed(clock());
      S.admin = true;
    },
    incident(f) {
      const t = clock();
      state().incidents.unshift({ id: t, title: f.title, comp: f.comp, sev: f.sev, phase: f.phase, updates: [{ phase: f.phase, msg: f.msg, t }] });
      recompute(f.comp);
    },
    update(id, phase, msg) {
      const s = state();
      const i = s.incidents.find((x) => x.id === id);
      if (!i) return;
      i.updates.unshift({ phase, msg, t: clock() });
      i.phase = phase;
      if (phase === 'Resuelto') {
        s.incidents = s.incidents.filter((x) => x.id !== id);
        s.past.unshift({ id, day: dayKey(clock()), title: i.title, text: msg });
        recompute(i.comp);
      }
    },
    maintenance(f) {
      state().maint.push({ id: clock(), title: f.title, comp: f.comp, start: new Date(f.start).getTime(), hours: +f.hours || 1, text: f.text, state: 'scheduled', posted: clock() });
    },
    startMaint(id) {
      const m = state().maint.find((x) => x.id === id);
      if (!m) return;
      m.state = 'progress';
      m.start = Math.min(m.start, clock());
      recompute(m.comp);
    },
    doneMaint(id) {
      const s = state();
      const m = s.maint.find((x) => x.id === id);
      if (!m) return;
      s.maint = s.maint.filter((x) => x.id !== id);
      s.past.unshift({ id, day: dayKey(clock()), title: `${m.title} (completado)`, text: 'Mantenimiento finalizado sin incidencias.' });
      recompute(m.comp);
    },
    cancelMaint(id) {
      const s = state();
      const m = s.maint.find((x) => x.id === id);
      s.maint = s.maint.filter((x) => x.id !== id);
      if (m) recompute(m.comp);
    },
    setComp(comp, st) {
      state().comps[comp] = st;
      mark(comp, st);
    },
  };

  return { state, save, uptime, actions, clock };
}
