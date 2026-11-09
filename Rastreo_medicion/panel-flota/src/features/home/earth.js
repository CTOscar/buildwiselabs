// Earth (earth.nullschool.net): su estado vive en el hash de la URL. Se cambia con botones propios (solo visualización).
const BASE = 'https://earth.nullschool.net/es/#current/';
export const LAYERS = [
  ['wind', 'Viento', 'wind/surface/level'], ['temp', 'Temperatura', 'wind/surface/level/overlay=temp'], ['hum', 'Humedad', 'wind/surface/level/overlay=relative_humidity'],
  ['rain', 'Lluvia', 'wind/surface/level/overlay=precip_3hr'], ['cloud', 'Nubes', 'wind/surface/level/overlay=total_cloud_water'], ['tpw', 'Vapor de agua', 'wind/surface/level/overlay=total_precipitable_water'],
  ['cur', 'Corrientes', 'ocean/surface/currents'], ['sst', 'Temp. del mar', 'ocean/surface/currents/overlay=sea_surface_temp'], ['ssta', 'Anomalía del mar', 'ocean/surface/currents/overlay=sea_surface_temp_anomaly'],
  ['bleach', 'Blanqueamiento', 'ocean/surface/level/overlay=bleaching_alert_area'], ['wave', 'Oleaje', 'ocean/primary/waves/overlay=significant_wave_height'],
];
export const VIEWS = [['rosario', 'El Rosario', -105.9012, 22.73834, 5000], ['pacifico', 'Pacífico mexicano', -106, 21, 2600], ['mexico', 'México', -102, 23, 1700], ['mundo', 'Mundo', -103.33, 20.58, 450]];
const PROJECTIONS = [['orthographic', 'Globo'], ['equirectangular', 'Plano']];

export const initialEarth = () => ({ layer: 'bleach', view: 'pacifico', proj: 'orthographic' });

export function earthUrl({ layer, view, proj }) {
  const L = LAYERS.find((x) => x[0] === layer) || LAYERS[0];
  const V = VIEWS.find((x) => x[0] === view) || VIEWS[0];
  return `${BASE}${L[2]}/${proj}=${V[2]},${V[3]},${V[4]}/loc=-105.9012,22.73834`;
}

const pipe = (list, cur, attr) => list.map((x) => `<a href="#" ${attr}="${x[0]}"${x[0] === cur ? ' aria-current="true"' : ''}>${x[1]}</a>`).join('|');

export const earthControlsHtml = (e) =>
  `<p class="dh-topics">Capa: ${pipe(LAYERS, e.layer, 'data-earth-l')}</p>` +
  `<p class="dh-topics">Vista: ${pipe(VIEWS, e.view, 'data-earth-v')}|${pipe(PROJECTIONS, e.proj, 'data-earth-p')}</p>`;

export const earthFrameHtml = (e) =>
  `<span class="dh-earth-wait">Cargando mapa…</span><iframe src="${earthUrl(e)}" title="Earth · corrientes del océano y alerta de blanqueamiento" loading="lazy" referrerpolicy="no-referrer" allow="fullscreen"></iframe>`;
