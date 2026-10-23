import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { state, subscribe, notify, select, statusOf, matches, mapApi } from '../fleet/store.js';
import { escapeHtml } from '../../lib/format.js';
import { brandPin } from '../../lib/brands.js';
import { icon as svgIcon } from '../../components/icons.js';

const MK = { running: 'mk mk-running', idle: 'mk mk-idle', nosignal: 'mk mk-nosignal' };
const RAIL = 72;
const PANEL = 408;

// Capas base. OSM y Esri para desarrollo; en producción usar un proveedor con contrato.
const LAYERS = {
  map: () =>
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }),
  sat: () =>
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: 'Imágenes &copy; Esri',
    }),
};
// Miniatura del botón de capas: muestra la capa a la que se cambiaría.
const THUMB = {
  sat: 'background: radial-gradient(circle at 30% 30%, #6b7d3d 0 18%, transparent 19%), radial-gradient(circle at 75% 65%, #8a7a4a 0 22%, transparent 23%), linear-gradient(135deg, #4d6230, #7a6f45 50%, #3e5228)',
  map: 'background: linear-gradient(90deg, transparent 46%, #fff 46% 54%, transparent 54%), linear-gradient(20deg, transparent 60%, #f6d58a 60% 66%, transparent 66%), #e9ece6',
};

// Geocercas de Traccar en WKT con orden "lat lon".
function parseArea(area) {
  if (!area) return null;
  const pairs = (s) =>
    s
      .split(',')
      .map((t) => t.trim().split(/\s+/).map(Number))
      .filter((p) => p.length >= 2 && p.every(Number.isFinite));
  let m = area.match(/^\s*POLYGON\s*\(\((.+)\)\)\s*$/i);
  if (m) return L.polygon(pairs(m[1]));
  m = area.match(/^\s*CIRCLE\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*,\s*([\d.]+)\s*\)\s*$/i);
  if (m) return L.circle([+m[1], +m[2]], { radius: +m[3] });
  m = area.match(/^\s*LINESTRING\s*\((.+)\)\s*$/i);
  if (m) return L.polyline(pairs(m[1]));
  return null;
}

function icon(dev, st, sel) {
  return L.divIcon({
    className: '',
    html: `<span class="${MK[st]}${sel ? ' mk-sel' : ''}" title="${escapeHtml(dev?.name || '')}">${brandPin(dev?.attributes?.marca, svgIcon('tractor', 'h-4 w-4'))}</span>`,
    iconSize: [32, 38],
    iconAnchor: [16, 38],
  });
}

// Color del lote (Ajustes del lote) o malva BuildWise por defecto.
function styleFence(shape, g) {
  const c = g.attributes?.color || '#9D6B99';
  shape.setStyle({ color: c, weight: 2, opacity: 0.95, fillColor: c, fillOpacity: 0.1, dashArray: '6 5' });
}

const isDesktop = () => window.matchMedia('(min-width: 1024px)').matches;

// Espacio que tapan el riel, el panel o la hoja inferior: el mapa centra en lo visible.
function padding() {
  if (isDesktop()) return { tl: [RAIL + (state.panelOpen ? PANEL : 0) + 40, 90], br: [80, 40] };
  const sheet = document.getElementById('panel')?.offsetHeight || 0;
  return { tl: [30, 130], br: [70, sheet + 30] };
}

export function initMap() {
  const el = document.getElementById('map');
  const map = L.map(el, { zoomControl: false, attributionControl: true, worldCopyJump: true });
  let base = LAYERS[state.layer]().addTo(map);

  state.geofences.forEach((g) => {
    const shape = parseArea(g.area);
    if (!shape) return;
    shape.bindTooltip(escapeHtml(g.name), { className: 'fence-tip', sticky: true, direction: 'top' });
    styleFence(shape, g);
    shape.on('click', () => fitFence(g.id));
    shape.addTo(map);
    g._shape = shape;
  });

  const markers = new Map();
  const ANIM_MS = 1800;
  const moving = new Set();
  let raf = 0;
  // Interpolación suave entre reportes: el marcador se desliza en vez de saltar.
  function glide(m, to) {
    const from = m.getLatLng();
    if (Math.abs(from.lat - to[0]) + Math.abs(from.lng - to[1]) > 0.01 || document.hidden) {
      m.setLatLng(to);
      return;
    }
    m._from = [from.lat, from.lng];
    m._to = to;
    m._t0 = performance.now();
    moving.add(m);
    if (!raf) raf = requestAnimationFrame(frame);
  }
  function frame(now) {
    moving.forEach((m) => {
      const k = Math.min(1, (now - m._t0) / ANIM_MS);
      m.setLatLng([m._from[0] + (m._to[0] - m._from[0]) * k, m._from[1] + (m._to[1] - m._from[1]) * k]);
      if (k >= 1) moving.delete(m);
    });
    drawTrailHead();
    raf = moving.size ? requestAnimationFrame(frame) : 0;
  }

  // Trazo del recorrido del tractor seleccionado.
  const trail = L.polyline([], { color: '#9D6B99', weight: 4, opacity: 0.9, lineCap: 'round', lineJoin: 'round', interactive: false });
  const trailGlow = L.polyline([], { color: '#ffffff', weight: 8, opacity: 0.55, interactive: false });
  const trailStart = L.circleMarker([0, 0], { radius: 5, color: '#ffffff', weight: 2, fillColor: '#9D6B99', fillOpacity: 1, interactive: false });
  let trailKey = '';
  function drawTrail() {
    const id = state.selected;
    const t = id != null ? state.trails.get(id) || [] : [];
    const key = `${id}:${t.length}:${t[t.length - 1]?.[2] || ''}`;
    if (key === trailKey) return;
    trailKey = key;
    if (t.length < 2) {
      [trailGlow, trail, trailStart].forEach((l) => map.hasLayer(l) && l.remove());
      return;
    }
    const pts = t.map((x) => [x[0], x[1]]);
    trailGlow.setLatLngs(pts);
    trail.setLatLngs(pts);
    trailStart.setLatLng(pts[0]);
    [trailGlow, trail, trailStart].forEach((l) => !map.hasLayer(l) && l.addTo(map));
    drawTrailHead();
  }
  // El último tramo termina en el marcador animado, no en el punto final.
  function drawTrailHead() {
    const m = markers.get(state.selected);
    if (!m || !map.hasLayer(trail)) return;
    const pts = trail.getLatLngs();
    if (pts.length < 2 || !moving.has(m)) return;
    pts[pts.length - 1] = m.getLatLng();
    trail.setLatLngs(pts);
    trailGlow.setLatLngs(pts);
  }

  function sync() {
    state.positions.forEach((p, id) => {
      const show = matches(id) || state.selected === id;
      const st = statusOf(id);
      const sel = state.selected === id;
      const key = `${st}${sel ? '-s' : ''}-${state.devices.get(id)?.attributes?.marca || ''}`;
      const dev = state.devices.get(id);
      const ll = [p.latitude, p.longitude];
      let m = markers.get(id);
      if (!m) {
        m = L.marker(ll, { icon: icon(dev, st, sel), title: dev?.name, riseOnHover: true });
        m.on('click', () => {
          select(id);
          focusDevice(id);
        });
        m._key = key;
        markers.set(id, m);
      } else {
        const cur = m._to || [m.getLatLng().lat, m.getLatLng().lng];
        if (cur[0] !== ll[0] || cur[1] !== ll[1]) glide(m, ll);
        if (m._key !== key) {
          m.setIcon(icon(dev, st, sel));
          m._key = key;
        }
      }
      m.setZIndexOffset(sel ? 1000 : 0);
      if (show && !map.hasLayer(m)) m.addTo(map);
      if (!show && map.hasLayer(m)) m.remove();
    });
    drawTrail();
  }

  function focusDevice(id) {
    const p = state.positions.get(id);
    if (!p) return;
    const zoom = Math.max(map.getZoom(), 16);
    const pad = padding();
    // Desplaza el centro para que el tractor quede en la zona visible (no debajo del panel).
    const pt = map.project([p.latitude, p.longitude], zoom);
    const dx = (pad.tl[0] - pad.br[0]) / 2;
    const dy = (pad.tl[1] - pad.br[1]) / 2;
    map.flyTo(map.unproject(pt.subtract([dx, dy]), zoom), zoom, { duration: 0.8 });
  }
  // Seguir: paneo lineal al ritmo del marcador, sin cambiar el zoom.
  function followTo(id) {
    const p = state.positions.get(id);
    if (!p) return;
    const zoom = map.getZoom();
    const pad = padding();
    const pt = map.project([p.latitude, p.longitude], zoom);
    const dx = (pad.tl[0] - pad.br[0]) / 2;
    const dy = (pad.tl[1] - pad.br[1]) / 2;
    map.panTo(map.unproject(pt.subtract([dx, dy]), zoom), { animate: true, duration: ANIM_MS / 1000, easeLinearity: 1 });
  }
  function fitFence(fid) {
    const g = state.geofences.find((x) => x.id === fid);
    if (!g?._shape?.getBounds) return;
    const pad = padding();
    map.flyToBounds(g._shape.getBounds(), { paddingTopLeft: pad.tl, paddingBottomRight: pad.br, duration: 0.8, maxZoom: 17 });
  }
  function fitAll() {
    const pts = [...state.positions.entries()].filter(([id]) => matches(id)).map(([, p]) => [p.latitude, p.longitude]);
    if (!pts.length) return;
    const pad = padding();
    map.flyToBounds(pts, { paddingTopLeft: pad.tl, paddingBottomRight: pad.br, duration: 0.8, maxZoom: 16 });
  }
  function restyleFence(g) {
    if (!g?._shape) return;
    styleFence(g._shape, g);
    g._shape.setTooltipContent(escapeHtml(g.name));
  }
  Object.assign(mapApi, { focusDevice, fitFence, fitAll, restyleFence });

  sync();
  const pts = [...state.positions.values()].map((p) => [p.latitude, p.longitude]);
  if (pts.length) {
    const pad = padding();
    map.fitBounds(pts, { paddingTopLeft: pad.tl, paddingBottomRight: pad.br });
  } else map.setView([22.998422, -105.878478], 14);

  // Controles flotantes
  const thumb = document.getElementById('layer-thumb');
  const label = document.getElementById('layer-label');
  const toggleLayer = () => {
    state.layer = state.layer === 'map' ? 'sat' : 'map';
    map.removeLayer(base);
    base = LAYERS[state.layer]().addTo(map);
    el.classList.toggle('layer-map', state.layer === 'map');
    notify();
  };
  document.getElementById('layer-btn').addEventListener('click', toggleLayer);
  document.getElementById('ctl-layer-sm').addEventListener('click', toggleLayer);
  document.getElementById('ctl-zin').addEventListener('click', () => map.zoomIn());
  document.getElementById('ctl-zout').addEventListener('click', () => map.zoomOut());
  document.getElementById('ctl-fit').addEventListener('click', fitAll);

  let lastFollow = null;
  subscribe(() => {
    sync();
    const next = state.layer === 'map' ? 'sat' : 'map';
    thumb.style.cssText = THUMB[next];
    label.textContent = next === 'sat' ? 'Satélite' : 'Mapa';
    // Modo seguir: el mapa acompaña al tractor seleccionado.
    if (state.follow && state.selected != null) {
      const p = state.positions.get(state.selected);
      const key = p && `${state.selected}@${p.latitude},${p.longitude}`;
      if (key && key !== lastFollow) {
        const first = !lastFollow || !lastFollow.startsWith(`${state.selected}@`);
        lastFollow = key;
        if (first || map.getZoom() < 15) focusDevice(state.selected);
        else followTo(state.selected);
      }
    } else lastFollow = null;
  });

  new ResizeObserver(() => map.invalidateSize()).observe(el);
  return map;
}
