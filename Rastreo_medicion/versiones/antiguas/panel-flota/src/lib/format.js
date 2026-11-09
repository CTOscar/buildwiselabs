import { config } from '../config.js';

const tz = config.tz;
const nf1 = new Intl.NumberFormat('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const nf0 = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });
const timeFmt = new Intl.DateTimeFormat('es-MX', { timeZone: tz, hour: '2-digit', minute: '2-digit' });

export const msToHours = (ms) => (Number(ms) || 0) / 3600e3;
export const fmtHours = (ms) => nf1.format(msToHours(ms));
export const fmtInt = (n) => nf0.format(n || 0);
export const fmtTime = (d) => timeFmt.format(new Date(d));
export const knotsToKmh = (k) => Math.round((Number(k) || 0) * 1.852);

export function fmtAgo(d) {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (!Number.isFinite(s)) return 'sin datos';
  if (s < 60) return 'hace segundos';
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  return `hace ${Math.floor(s / 86400)} d`;
}

function tzParts(d) {
  const o = {};
  new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
    .formatToParts(d)
    .forEach((p) => (o[p.type] = Number(p.value)));
  return o;
}

// Medianoche de hoy en America/Mazatlan, como Date (UTC).
export function startOfToday() {
  const now = new Date();
  const p = tzParts(now);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  const offset = asUtc - Math.floor(now.getTime() / 1000) * 1000;
  return new Date(Date.UTC(p.year, p.month - 1, p.day) - offset);
}

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

// Traducción de eventos de Traccar a etiquetas del negocio.
const EVENT_TYPES = {
  ignitionOn: ['Motor encendido', 'ok'],
  ignitionOff: ['Motor apagado', 'info'],
  geofenceEnter: ['Entró a lote', 'info'],
  geofenceExit: ['Salió de lote', 'info'],
  deviceOnline: ['Equipo en línea', 'ok'],
  deviceOffline: ['Equipo sin señal', 'warn'],
  deviceOverspeed: ['Exceso de velocidad', 'warn'],
  deviceFuelDrop: ['Baja de combustible', 'crit'],
  deviceFuelIncrease: ['Carga de combustible', 'ok'],
};
const ALARMS = {
  powerCut: ['Corte de alimentación del equipo', 'crit'],
  tampering: ['Manipulación del equipo', 'crit'],
  fuelLeak: ['Fuga o extracción de combustible', 'crit'],
  lowBattery: ['Batería baja', 'warn'],
};

export function describeEvent(e) {
  if (e.type === 'alarm') {
    const a = e.attributes?.alarm;
    const [label, sev] = ALARMS[a] || [`Alarma: ${a || 'sin tipo'}`, 'warn'];
    return { label, sev };
  }
  const [label, sev] = EVENT_TYPES[e.type] || [e.type, 'info'];
  return { label, sev };
}
