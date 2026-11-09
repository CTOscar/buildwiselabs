import L from 'leaflet';
import { icon } from '../../components/icons.js';

// Herramientas del mapa estilo Operations Center: panel de capas, configuración,
// medición de distancia/área y pantalla completa.

const KEY = 'pf.map';
export const DEFAULTS = { layer: 'map', fences: true, trail: true, labels: false, units: 'metric' };

export function loadSettings() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return { ...DEFAULTS };
  }
}
export function saveSettings(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* sin almacenamiento: la configuración dura solo la sesión */
  }
}

const THUMB = {
  map: 'background: linear-gradient(90deg, transparent 46%, #fff 46% 54%, transparent 54%), linear-gradient(20deg, transparent 60%, #f6d58a 60% 66%, transparent 66%), #e9ece6',
  sat: 'background: radial-gradient(circle at 30% 30%, #6b7d3d 0 18%, transparent 19%), radial-gradient(circle at 75% 65%, #8a7a4a 0 22%, transparent 23%), linear-gradient(135deg, #4d6230, #7a6f45 50%, #3e5228)',
  hyb: 'background: linear-gradient(90deg, transparent 46%, rgba(255,255,255,.85) 46% 52%, transparent 52%), radial-gradient(circle at 30% 30%, #6b7d3d 0 18%, transparent 19%), linear-gradient(135deg, #4d6230, #7a6f45 50%, #3e5228)',
};

// Formato según unidades (métrico o imperial).
export function fmtDist(m, units) {
  if (units === 'imperial') {
    const mi = m / 1609.344;
    return mi < 0.19 ? `${Math.round(m * 3.28084)} ft` : `${mi.toFixed(2)} mi`;
  }
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(2)} km`;
}
export function fmtArea(m2, units) {
  return units === 'imperial' ? `${(m2 / 4046.8564).toFixed(2)} ac` : `${(m2 / 10000).toFixed(2)} ha`;
}
// Área aproximada (plano local equirectangular): suficiente para lotes.
export function areaOf(pts) {
  if (pts.length < 3) return 0;
  const lat0 = (pts.reduce((a, p) => a + p.lat, 0) / pts.length) * (Math.PI / 180);
  const xy = pts.map((p) => [p.lng * 111320 * Math.cos(lat0), p.lat * 110540]);
  let s = 0;
  xy.forEach((p, i) => {
    const q = xy[(i + 1) % xy.length];
    s += p[0] * q[1] - q[0] * p[1];
  });
  return Math.abs(s) / 2;
}

export function initMapTools(map, { settings, update, fitAll }) {
  const $ = (id) => document.getElementById(id);
  const panel = $('map-panel');
  const out = $('measure-out');
  const btnLayers = $('ctl-layers');
  const btnSettings = $('ctl-settings');
  const btnMeasure = $('ctl-measure');
  let open = null; // 'layers' | 'settings' | null

  const sw = (key, label) => `
    <button type="button" role="switch" aria-checked="${settings[key]}" data-sw="${key}" class="jd-opt">
      <span>${label}</span><span class="jd-switch"></span>
    </button>`;
  const seg = (key, opts) => `
    <div class="jd-seg" role="group">
      ${opts.map(([v, t]) => `<button type="button" data-seg="${key}" data-v="${v}" aria-pressed="${settings[key] === v}">${t}</button>`).join('')}
    </div>`;

  function render() {
    if (open === 'layers') {
      panel.innerHTML = `
        <h3>Capas</h3>
        <div class="jd-sec">
          <div class="eyebrow">Mapa base</div>
          <div class="grid grid-cols-3 gap-2">
            ${[['map', 'Mapa'], ['sat', 'Satélite'], ['hyb', 'Híbrido']]
              .map(([v, t]) => `<button type="button" data-layer="${v}" class="jd-layer-opt" aria-pressed="${settings.layer === v}"><span style="${THUMB[v]}"></span>${t}</button>`)
              .join('')}
          </div>
        </div>
        <div class="jd-sec">
          <div class="eyebrow">Superposiciones</div>
          ${sw('fences', 'Lotes y geocercas')}
          ${sw('trail', 'Recorrido del tractor')}
          ${sw('labels', 'Etiquetas de unidades')}
        </div>`;
    } else if (open === 'settings') {
      panel.innerHTML = `
        <h3>Configuración del mapa</h3>
        <div class="jd-sec">
          <div class="eyebrow">Unidades</div>
          ${seg('units', [['metric', 'Métrico (km, ha)'], ['imperial', 'Imperial (mi, ac)']])}
        </div>
        <div class="jd-sec">
          <div class="eyebrow">Visualización</div>
          ${sw('fences', 'Mostrar lotes y geocercas')}
          ${sw('trail', 'Mostrar recorrido')}
          ${sw('labels', 'Mostrar etiquetas')}
        </div>
        <div class="jd-sec">
          <button type="button" data-reset class="btn w-full !rounded">Restablecer valores</button>
        </div>`;
    }
    panel.hidden = !open;
    btnLayers.setAttribute('aria-expanded', String(open === 'layers'));
    btnSettings.setAttribute('aria-expanded', String(open === 'settings'));
  }

  function toggle(which) {
    open = open === which ? null : which;
    render();
  }
  btnLayers.addEventListener('click', () => toggle('layers'));
  btnSettings.addEventListener('click', () => toggle('settings'));

  panel.addEventListener('click', (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.layer) update({ layer: t.dataset.layer });
    else if (t.dataset.sw) update({ [t.dataset.sw]: !settings[t.dataset.sw] });
    else if (t.dataset.seg) update({ [t.dataset.seg]: t.dataset.v });
    else if (t.hasAttribute('data-reset')) update({ ...DEFAULTS });
    else return;
    render();
    paintMeasure();
  });
  // Clic fuera del panel lo cierra.
  document.addEventListener('pointerdown', (e) => {
    if (open && !e.target.closest('#map-panel, #ctl-layers, #ctl-settings')) {
      open = null;
      render();
    }
  });

  $('ctl-zin').addEventListener('click', () => map.zoomIn());
  $('ctl-zout').addEventListener('click', () => map.zoomOut());
  $('ctl-fit').addEventListener('click', fitAll);

  // Pantalla completa del contenedor del mapa.
  const host = $('map').parentElement;
  $('ctl-full').addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else host.requestFullscreen?.().catch(() => {});
  });
  document.addEventListener('fullscreenchange', () => setTimeout(() => map.invalidateSize(), 150));

  // Medición: clics añaden vértices; ≥3 puntos muestra también el área.
  let measuring = false;
  let pts = [];
  const line = L.polyline([], { color: '#367C2B', weight: 3, dashArray: '6 6', interactive: false });
  const fill = L.polygon([], { color: '#367C2B', weight: 0, fillOpacity: 0.18, interactive: false });
  const vtx = L.layerGroup();
  function paintMeasure() {
    if (!measuring) {
      out.hidden = true;
      return;
    }
    let d = 0;
    for (let i = 1; i < pts.length; i++) d += map.distance(pts[i - 1], pts[i]);
    const parts = [pts.length ? `Distancia: ${fmtDist(d, settings.units)}` : 'Haz clic en el mapa para medir'];
    if (pts.length >= 3) parts.push(`Área: ${fmtArea(areaOf(pts), settings.units)}`);
    out.innerHTML = `${parts.join(' · ')}
      ${pts.length ? `<button type="button" data-clear class="ml-3 inline-flex align-middle" aria-label="Borrar medición">${icon('trash', 'h-4 w-4')}</button>` : ''}`;
    out.hidden = false;
  }
  function redraw() {
    line.setLatLngs(pts);
    fill.setLatLngs(pts.length >= 3 ? pts : []);
    vtx.clearLayers();
    pts.forEach((p) => vtx.addLayer(L.marker(p, { icon: L.divIcon({ className: '', html: '<span class="jd-vtx"></span>', iconSize: [10, 10] }), interactive: false })));
    paintMeasure();
  }
  const onClick = (e) => {
    pts.push(e.latlng);
    redraw();
  };
  out.addEventListener('click', (e) => {
    if (e.target.closest('[data-clear]')) {
      pts = [];
      redraw();
    }
  });
  btnMeasure.addEventListener('click', () => {
    measuring = !measuring;
    map._measuring = measuring;
    btnMeasure.setAttribute('aria-pressed', String(measuring));
    map.getContainer().style.cursor = measuring ? 'crosshair' : '';
    if (measuring) {
      [fill, line, vtx].forEach((l) => l.addTo(map));
      map.on('click', onClick);
    } else {
      map.off('click', onClick);
      [fill, line, vtx].forEach((l) => l.remove());
      pts = [];
    }
    paintMeasure();
  });

  render();
}
