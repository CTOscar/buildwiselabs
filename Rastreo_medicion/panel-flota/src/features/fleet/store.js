import { config } from '../../config.js';

export const state = {
  mode: '',
  user: null,
  conn: 'connecting',
  devices: new Map(),
  positions: new Map(),
  geofences: [],
  events: [],
  engineToday: new Map(), // deviceId -> ms de motor hoy
  selected: null,
  fenceId: null, // lote abierto en Ajustes del lote
  configId: null, // tractor abierto en Ajustes del tractor
  query: '',
  // Interfaz (arquitectura tipo mapa: panel lateral + chips + capas)
  view: 'fleet', // fleet | alerts | lotes | reports | sim | 3d | device | profile | lote | tractor
  backView: 'fleet',
  panelOpen: true,
  sheet: 'half', // celular: peek | half | full
  layer: 'map', // map | sat
  follow: false,
  trails: new Map(), // deviceId -> [[lat, lon, ms]] recorrido de la sesión
  sim: { id: null, speed: 1 }, // recorrido simulado activo (solo modo simulado)
  chips: { status: null, nivel: null, sonda: false },
};

const subs = new Set();
export function subscribe(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}

let queued = false;
export function notify() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    subs.forEach((fn) => fn(state));
  });
}

export function setEngineToday(summary) {
  (summary || []).forEach((s) => {
    if (s.deviceId != null) state.engineToday.set(s.deviceId, Number(s.engineHours) || 0);
  });
  notify();
}

// Aplica un mensaje con la forma del WebSocket de Traccar: { devices, positions, events }.
export function applyMessage(msg) {
  msg.devices?.forEach((d) => state.devices.set(d.id, { ...state.devices.get(d.id), ...d }));

  msg.positions?.forEach((p) => {
    const prev = state.positions.get(p.deviceId);
    const h0 = prev?.attributes?.hours;
    const h1 = p.attributes?.hours;
    if (typeof h0 === 'number' && typeof h1 === 'number') {
      const delta = h1 - h0;
      if (delta > 0 && delta < 6 * 3600e3) {
        state.engineToday.set(p.deviceId, (state.engineToday.get(p.deviceId) || 0) + delta);
      }
    }
    state.positions.set(p.deviceId, p);
    pushTrail(p);
    const dev = state.devices.get(p.deviceId);
    if (dev && p.fixTime && (!dev.lastUpdate || new Date(p.fixTime) > new Date(dev.lastUpdate))) {
      dev.lastUpdate = p.fixTime;
    }
  });

  if (msg.events?.length) {
    const seen = new Set(state.events.map((e) => e.id));
    const fresh = msg.events.filter((e) => !seen.has(e.id));
    state.events = [...fresh, ...state.events]
      .sort((a, b) => new Date(b.eventTime) - new Date(a.eventTime))
      .slice(0, 200);
  }
  notify();
}

const TRAIL_MAX = 600;
function pushTrail(p) {
  if (!Number.isFinite(p.latitude) || !Number.isFinite(p.longitude)) return;
  let t = state.trails.get(p.deviceId);
  if (!t) state.trails.set(p.deviceId, (t = []));
  const last = t[t.length - 1];
  if (last && last[0] === p.latitude && last[1] === p.longitude) return;
  t.push([p.latitude, p.longitude, new Date(p.fixTime || Date.now()).getTime()]);
  if (t.length > TRAIL_MAX) t.splice(0, t.length - TRAIL_MAX);
}

// Distancia del recorrido en km (haversine).
export function trailKm(t = []) {
  let km = 0;
  for (let i = 1; i < t.length; i++) {
    const [a, b] = [t[i - 1], t[i]];
    const r = Math.PI / 180;
    const h = Math.sin(((b[0] - a[0]) * r) / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(((b[1] - a[1]) * r) / 2) ** 2;
    km += 12742 * Math.asin(Math.sqrt(h));
  }
  return km;
}

export const STATUS = {
  running: { label: 'En marcha', dot: 'bg-ok', text: 'text-ok', border: 'border-ok', ring: 'ring-ok', soft: 'bg-ok/15' },
  idle: { label: 'Apagado', dot: 'bg-muted', text: 'text-muted', border: 'border-muted', ring: 'ring-muted', soft: 'bg-muted/15' },
  nosignal: { label: 'Sin señal', dot: 'bg-crit', text: 'text-crit', border: 'border-crit', ring: 'ring-crit', soft: 'bg-crit/15' },
};

export function statusOf(id) {
  const d = state.devices.get(id);
  const p = state.positions.get(id);
  if (!d) return 'nosignal';
  const last = new Date(d.lastUpdate || p?.fixTime || 0).getTime();
  if (d.status !== 'online' || Date.now() - last > config.offlineAfterMin * 60e3) return 'nosignal';
  return p?.attributes?.ignition ? 'running' : 'idle';
}

export function hasProbe(id) {
  const d = state.devices.get(id);
  return Boolean(d?.attributes?.sondaBLE) || typeof state.positions.get(id)?.attributes?.fuel === 'number';
}

// Filtro de chips + búsqueda: lo usan el mapa y la lista.
export function matches(id) {
  const d = state.devices.get(id);
  if (!d) return false;
  const c = state.chips;
  if (c.status && statusOf(id) !== c.status) return false;
  if (c.nivel && d.attributes?.nivel !== c.nivel) return false;
  if (c.sonda && !d.attributes?.sondaBLE) return false;
  const q = state.query;
  if (q && !d.name.toLowerCase().includes(q) && !String(d.uniqueId).includes(q)) return false;
  return true;
}

export function fenceNameOf(id) {
  const p = state.positions.get(id);
  const gid = p?.geofenceIds?.[0];
  return state.geofences.find((g) => g.id === gid)?.name || null;
}

export function select(id) {
  state.selected = id;
  if (id != null) {
    if (state.view !== 'device') state.backView = state.view;
    state.view = 'device';
    state.panelOpen = true;
    if (state.sheet === 'peek') state.sheet = 'half';
  } else if (state.view === 'device') {
    state.view = state.backView;
    state.follow = false;
  }
  notify();
}

export function setView(view) {
  state.view = view;
  state.panelOpen = true;
  if (view !== 'device') {
    state.selected = null;
    state.follow = false;
  }
  notify();
}

// Enfocar mapa: lo implementa el módulo del mapa.
export const mapApi = { focusDevice: () => {}, fitFence: () => {}, fitAll: () => {}, restyleFence: () => {} };

// Abre los ajustes de un tractor (tuerca en la lista de Flota).
export function openDeviceSettings(id) {
  state.configId = id;
  setView('tractor');
}

// Abre los ajustes de un lote (tuerca en la lista de Lotes).
export function openFenceSettings(id) {
  state.fenceId = id;
  setView('lote');
}
