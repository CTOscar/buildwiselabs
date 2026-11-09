// Clima de la portada (Open-Meteo, sin llave). Las funciones *Html son puras: reciben datos y devuelven HTML.
import { escapeHtml as esc } from '../../lib/format.js';
import { num, weekday, windDir, wmo, TZ } from './helpers.js';

export const DEFAULT_LL = [22.73834, -105.9012]; // El Rosario, Sinaloa
const TODAY = 7; // se piden 7 días pasados: hoy es el índice 7

export async function fetchWeather([lat, lon], fetchFn = fetch) {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    '&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m' +
    '&hourly=temperature_2m,precipitation_probability,weather_code,is_day' +
    '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,sunrise,sunset,uv_index_max,wind_speed_10m_max' +
    `&past_days=7&forecast_days=8&timezone=${encodeURIComponent(TZ)}&wind_speed_unit=kmh`;
  const res = await fetchFn(url);
  if (!res.ok) throw new Error(`Clima: HTTP ${res.status}`);
  return res.json();
}

// Centro de la flota (promedio de posiciones); si no hay, El Rosario.
export function fleetCentroid(positions) {
  const p = [...positions];
  if (!p.length) return DEFAULT_LL;
  const lat = p.reduce((s, x) => s + x.latitude, 0) / p.length;
  const lon = p.reduce((s, x) => s + x.longitude, 0) / p.length;
  return [Math.round(lat * 100) / 100, Math.round(lon * 100) / 100];
}

// ¿Es buen momento para aplicar (fumigar)? -> ['ok'|'warn'|'bad', título, texto]
export function windowRisk(cur, rainMax) {
  const w = cur.wind_speed_10m;
  const g = cur.wind_gusts_10m;
  const t = cur.temperature_2m;
  if (w > 25 || g > 40 || rainMax >= 60 || t > 38 || cur.precipitation > 0.2) return ['bad', 'No recomendable', 'Viento, lluvia o calor fuera de rango.'];
  if (w > 15 || g > 28 || rainMax >= 30 || t > 35) return ['warn', 'Con precaución', 'Revisa viento y probabilidad de lluvia.'];
  return ['ok', 'Favorable', 'Condiciones adecuadas para aplicar.'];
}

const metric = (label, value) => `<div class="dh-m"><small>${label}</small><b>${value}</b></div>`;

export const errorBox = (what) =>
  `<p class="dh-empty">No se pudo cargar ${what}. Revisa tu conexión.</p><button type="button" class="dh-retry" data-hm-refresh>Reintentar</button>`;

// d = respuesta de Open-Meteo. Devuelve el HTML de cada tarjeta y las cifras para las tarjetas KPI.
export function weatherHtml(d, now = Date.now()) {
  const c = d.current;
  const dy = d.daily;
  const h = d.hourly;
  const T = TODAY;
  let i0 = h.time.findIndex((t) => new Date(t).getTime() >= now - 30 * 60000);
  if (i0 < 0) i0 = 0;
  const next = [];
  for (let i = i0; i < Math.min(i0 + 24, h.time.length); i++) next.push(i);
  const rainMax = Math.max(0, ...next.slice(0, 6).map((i) => h.precipitation_probability[i] || 0));
  const cond = wmo(c.weather_code, c.is_day);
  const risk = windowRisk(c, rainMax);

  const nowHtml =
    `<div class="dh-big"><span class="dh-wico">${cond[1]}</span><div><div class="dh-temp">${num(c.temperature_2m)}<small>°C</small></div><div class="dh-cond">${cond[0]} · El Rosario, Sinaloa</div></div></div>` +
    `<div class="dh-metrics">${metric('Sensación', `${num(c.apparent_temperature)} °C`)}${metric('Humedad', `${num(c.relative_humidity_2m)} %`)}${metric('Viento', `${num(c.wind_speed_10m)} km/h ${windDir(c.wind_direction_10m)}`)}</div>` +
    `<div class="dh-risk is-${risk[0]}"><b>Ventana de aplicación: ${risk[1]}</b><span>${risk[2]}</span></div>`;

  const lo = Math.min(...dy.temperature_2m_min.slice(T));
  const hi = Math.max(...dy.temperature_2m_max.slice(T));
  const span = Math.max(1, hi - lo);
  let days = '';
  for (let k = T; k < Math.min(T + 7, dy.time.length); k++) {
    const x = wmo(dy.weather_code[k], 1);
    const a = dy.temperature_2m_min[k];
    const b = dy.temperature_2m_max[k];
    days +=
      `<li><span class="dh-dn">${k === T ? 'Hoy' : weekday(dy.time[k])}</span><i>${x[1]}</i><em>${num(dy.precipitation_probability_max[k])}%</em>` +
      `<span class="dh-bar"><u style="left:${((a - lo) / span) * 100}%;width:${Math.max(6, ((b - a) / span) * 100)}%"></u></span><b>${num(a)}°</b><b>${num(b)}°</b></li>`;
  }

  let past = 0;
  let fut = 0;
  dy.time.forEach((_, q) => {
    const v = dy.precipitation_sum[q] || 0;
    if (q < T) past += v;
    else if (q > T) fut += v;
  });
  const maxmm = Math.max(2, ...dy.precipitation_sum.map((v) => v || 0));
  const W = 300;
  const H = 70;
  const bw = W / dy.time.length;
  const bars = dy.time
    .map((t, q) => {
      const v = dy.precipitation_sum[q] || 0;
      const bh = Math.max(v > 0 ? 2 : 0, (v / maxmm) * (H - 18));
      return `<rect class="${q < T ? 'p' : q === T ? 't' : 'f'}" x="${q * bw + 2}" y="${H - 14 - bh}" width="${bw - 4}" height="${bh}" rx="2"><title>${esc(weekday(t, true))}: ${num(v, 1)} mm</title></rect><text x="${q * bw + bw / 2}" y="${H - 2}" text-anchor="middle">${weekday(t).charAt(0).toUpperCase()}</text>`;
    })
    .join('');
  const rainHtml =
    `<div class="dh-metrics">${metric('Hoy', `${num(dy.precipitation_sum[T], 1)} mm`)}${metric('Últimos 7 días', `${num(past, 1)} mm`)}${metric('Próximos 7 días', `${num(fut, 1)} mm`)}</div>` +
    `<svg class="dh-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Precipitación diaria">${bars}</svg>` +
    '<p class="dh-legend"><i class="p"></i>Registrado <i class="t"></i>Hoy <i class="f"></i>Pronóstico</p>';

  return { now: nowHtml, forecast: `<ul class="dh-days">${days}</ul>`, rain: rainHtml, temp: c.temperature_2m, rainToday: dy.precipitation_sum[T] || 0 };
}
