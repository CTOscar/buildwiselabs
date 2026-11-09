// Análisis de combustible y velocidad a partir del recorrido de un tractor (sin DOM: se prueba aislado).
// Una "serie" es una lista de puntos { t (ms), kmh, lat, lon, fuel (L o null), ign (motor encendido) }.
import { knotsToKmh } from '../../lib/format.js';

export const EVENT_LITERS = 20; // cambio de nivel que cuenta como carga o descarga
const TZ = 'America/Mazatlan';
const MARGIN = { l: 34, r: 8 };
const TOP = 8;
const GAP = 18;
const FOOT = 18;

const num = (v) => typeof v === 'number';

// Filas de GET /api/panel/route (formato Traccar) -> serie.
export const normalizeRoute = (rows = []) =>
  rows.map((p) => ({
    t: new Date(p.fixTime).getTime(),
    kmh: knotsToKmh(p.speed),
    lat: p.latitude,
    lon: p.longitude,
    fuel: num(p.attributes?.fuel) ? p.attributes.fuel : null,
    ign: !!p.attributes?.ignition,
  }));

// Descarga: baja ≥ 20 L con el tractor detenido. Carga: sube ≥ 20 L. Lo demás que baja es consumo.
export function analyzeSeries(series) {
  const pts = series.filter((p) => Number.isFinite(p.t));
  const events = [];
  let consumed = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1].fuel;
    const b = pts[i].fuel;
    if (!num(a) || !num(b)) continue;
    const at = { t: pts[i].t, lat: pts[i].lat, lon: pts[i].lon };
    if (a - b >= EVENT_LITERS && pts[i].kmh < 1) events.push({ ...at, type: 'drain', liters: Math.round(a - b) });
    else if (b - a >= EVENT_LITERS) events.push({ ...at, type: 'refuel', liters: Math.round(b - a) });
    else if (b < a) consumed += a - b;
  }
  const moving = pts.filter((p) => p.kmh > 0);
  return {
    events,
    consumed: Math.round(consumed),
    avgKmh: moving.length ? Math.round(moving.reduce((s, p) => s + p.kmh, 0) / moving.length) : 0,
    maxKmh: pts.reduce((m, p) => Math.max(m, p.kmh), 0),
    movingH: Math.round((moving.length * 5) / 6) / 10, // un punto ≈ 5 min
  };
}

export const litersOf = (events, type) => events.filter((e) => e.type === type).reduce((s, e) => s + e.liters, 0);

const hourOf = (t) => Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false, timeZone: TZ }).format(new Date(t))) % 24;

// Resumen de toda la flota: por hora del día, por lote, por tractor y litros acumulados.
// entries: [{ device: {id,name}, series, analysis }]
export function aggregateFleet(entries, fenceNameOf = () => null) {
  const hours = Array.from({ length: 24 }, () => ({ cons: 0, kmhSum: 0, kmhN: 0 }));
  const lotes = new Map();
  const perTractor = [];
  const cumulByHour = new Map();
  let drainL = 0;
  let refuelL = 0;
  let consL = 0;

  entries.forEach(({ device, series, analysis: a }) => {
    const dl = litersOf(a.events, 'drain');
    const rl = litersOf(a.events, 'refuel');
    drainL += dl;
    refuelL += rl;
    consL += a.consumed;
    perTractor.push({ name: device.name, cons: a.consumed, dl, rl, avg: a.avgKmh, max: a.maxKmh, h: a.movingH });

    const lote = fenceNameOf(device.id) || 'Fuera de lote';
    const l = lotes.get(lote) || { cons: 0, dl: 0, rl: 0, n: 0 };
    lotes.set(lote, { cons: l.cons + a.consumed, dl: l.dl + dl, rl: l.rl + rl, n: l.n + 1 });

    for (let i = 1; i < series.length; i++) {
      const prev = series[i - 1];
      const cur = series[i];
      const slot = hours[hourOf(cur.t)];
      if (cur.kmh > 0) {
        slot.kmhSum += cur.kmh;
        slot.kmhN++;
      }
      if (num(prev.fuel) && num(cur.fuel) && cur.fuel < prev.fuel && prev.fuel - cur.fuel < EVENT_LITERS) {
        const used = prev.fuel - cur.fuel;
        slot.cons += used;
        const hourStart = Math.floor(cur.t / 36e5) * 36e5;
        cumulByHour.set(hourStart, (cumulByHour.get(hourStart) || 0) + used);
      }
    }
  });

  let run = 0;
  const cumul = [...cumulByHour.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([t, v]) => ({ t, y: Math.round((run += v)) }));
  return { hours, lotes: [...lotes.entries()], perTractor, drainL, refuelL, consL, cumul };
}

const fmtClock = (t) => new Date(t).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ });
const fmtDayClock = (t) => new Date(t).toLocaleString('es-MX', { weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ });
const path = (pts) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('');

// Gráfica SVG de dos paneles: nivel de combustible (arriba) y velocidad (abajo), con el motor encendido
// sombreado y las cargas/descargas marcadas. Devuelve { html, events } ('' si hay menos de 2 puntos).
export function fuelSvg(series, { w = 360, h1 = 96, h2 = 62 } = {}) {
  const pts = series.filter((p) => Number.isFinite(p.t));
  if (pts.length < 2) return { html: '', events: [] };
  const t0 = pts[0].t;
  const t1 = pts[pts.length - 1].t;
  const X = (t) => MARGIN.l + ((t - t0) / (t1 - t0 || 1)) * (w - MARGIN.l - MARGIN.r);
  const fuels = pts.map((p) => p.fuel).filter(num);
  const fuelMax = Math.max(10, Math.ceil(Math.max(...fuels, 0) / 50) * 50);
  const Yf = (v) => TOP + (1 - v / fuelMax) * h1;
  const kmhMax = Math.max(10, Math.ceil(Math.max(...pts.map((p) => p.kmh), 0) / 10) * 10);
  const speedTop = TOP + h1 + GAP;
  const Ys = (v) => speedTop + (1 - v / kmhMax) * h2;

  let ignition = '';
  let start = null;
  pts.forEach((p, i) => {
    if (p.ign && start === null) start = p.t;
    if ((!p.ign || i === pts.length - 1) && start !== null) {
      ignition += `<rect x="${X(start).toFixed(1)}" y="${TOP}" width="${Math.max(1, X(p.t) - X(start)).toFixed(1)}" height="${h1 + GAP + h2}" fill="rgb(var(--ok))" opacity=".12"/>`;
      start = null;
    }
  });

  const events = analyzeSeries(pts).events;
  const gridLines = [TOP, TOP + h1 / 2, TOP + h1, speedTop, speedTop + h2 / 2, speedTop + h2]
    .map((y) => `<line x1="${MARGIN.l}" x2="${w - MARGIN.r}" y1="${y}" y2="${y}" stroke="rgb(var(--line))" stroke-width="1"/>`)
    .join('');
  const label = (txt, y) => `<text x="${MARGIN.l - 5}" y="${y + 3}" text-anchor="end" font-size="9" fill="rgb(var(--muted))">${txt}</text>`;
  const height = TOP + h1 + GAP + h2 + FOOT;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => t0 + f * (t1 - t0));
  const longSpan = t1 - t0 > 30 * 36e5;

  const markers = events
    .map((e) => {
      const x = X(e.t).toFixed(1);
      const color = e.type === 'drain' ? 'var(--crit)' : 'var(--ok)';
      const at = pts.find((p) => p.t === e.t);
      return `<line x1="${x}" x2="${x}" y1="${TOP}" y2="${speedTop + h2}" stroke="rgb(${color})" stroke-width="1" stroke-dasharray="3 3"/>
      <circle cx="${x}" cy="${Yf(at.fuel).toFixed(1)}" r="4" fill="rgb(${color})"/>`;
    })
    .join('');

  const html = `<svg viewBox="0 0 ${w} ${height}" class="block w-full" role="img" aria-label="Combustible y velocidad en el tiempo">
    ${ignition}
    ${gridLines}
    ${label(fuelMax, TOP)}${label(Math.round(fuelMax / 2), TOP + h1 / 2)}${label(0, TOP + h1)}
    ${label(kmhMax, speedTop)}${label(0, speedTop + h2)}
    <text x="${MARGIN.l}" y="${TOP - 1}" font-size="9" font-weight="600" fill="rgb(var(--fg))">L</text>
    <text x="${MARGIN.l}" y="${speedTop - 1}" font-size="9" font-weight="600" fill="rgb(var(--fg))">km/h</text>
    <path d="${path(pts.filter((p) => num(p.fuel)).map((p) => [X(p.t), Yf(p.fuel)]))}" fill="none" stroke="rgb(var(--fg))" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="${path(pts.map((p) => [X(p.t), Ys(p.kmh)]))}" fill="none" stroke="rgb(var(--accent))" stroke-width="1.5" stroke-linejoin="round"/>
    ${markers}
    ${ticks.map((t, i) => `<text x="${X(t).toFixed(1)}" y="${height - 4}" text-anchor="${i === 0 ? 'start' : i === 4 ? 'end' : 'middle'}" font-size="9" fill="rgb(var(--muted))">${longSpan ? fmtDayClock(t) : fmtClock(t)}</text>`).join('')}
  </svg>`;
  return { html, events };
}

// CSV (con BOM para Excel) de las cargas y descargas. rows: [{ device, type, t, liters, lat, lon }]
export function eventsCsv(rows, dieselPrice, fmtDate) {
  const q = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const head = 'Tractor,IMEI,Fecha y hora,Evento,Litros,Costo estimado MXN,Latitud,Longitud';
  const lines = rows.map((r) =>
    [q(r.device.name), q(r.device.uniqueId || ''), q(fmtDate(r.t)), r.type === 'drain' ? 'Descarga' : 'Carga', r.liters, Math.round(r.liters * dieselPrice), r.lat ?? '', r.lon ?? ''].join(','),
  );
  return '﻿' + [head, ...lines].join('\r\n');
}
