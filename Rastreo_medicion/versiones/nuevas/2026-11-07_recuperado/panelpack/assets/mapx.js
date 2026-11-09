/* mapx.js — herramientas extra del mapa del panel de flota (complemento, sin recompilar).
 * Usa: window.L (Leaflet 1.9), window.__pf (estado en vivo del panel) y el contenedor #map.
 * Funciones: rastro por velocidad, calor, etiquetas, alertas de lote, radar de lluvia + clima,
 * reproducción de ruta, paradas, cobertura del implemento, NDVI, agrupación, seguimiento y pantalla completa.
 * Los datos de la flota son simulados (modo mock); el historial se arma con lo que el panel va recibiendo. */
(function () {
  'use strict';
  var L = window.L, map = null, W = null;
  var CFG = { scope: 'sel', vmax: 6, heatR: 16, marca: '', stopMin: 2, width: 8, ndviOp: 65, clusterZoom: 13 };
  CFG.vmax = 8;
  var ON = {}; // funciones activas
  var hist = {}; // id -> [[lat, lon, t(ms), v(km/h)]]
  var HMAX = 1300;
  var fences = [], assigned = {};
  var lay = {}; // capas por función
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var rad = Math.PI / 180;

  /* ---------- utilidades geográficas ---------- */
  function wkt(area) {
    var m = /\(\((.*)\)\)/.exec(area || ''); if (!m) return null;
    return m[1].split(',').map(function (p) { var q = p.trim().split(/\s+/); return [+q[0], +q[1]]; });
  }
  function inPoly(p, poly) {
    var x = p[1], y = p[0], c = false;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      var xi = poly[i][1], yi = poly[i][0], xj = poly[j][1], yj = poly[j][0];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  }
  function mDist(a, b) {
    var dy = (b[0] - a[0]) * 111320, dx = (b[1] - a[1]) * 111320 * Math.cos(((a[0] + b[0]) / 2) * rad);
    return Math.sqrt(dx * dx + dy * dy);
  }
  function distToPoly(p, poly) {
    var best = 1e9, kx = 111320 * Math.cos(p[0] * rad), ky = 111320;
    for (var i = 0; i < poly.length - 1; i++) {
      var ax = (poly[i][1] - p[1]) * kx, ay = (poly[i][0] - p[0]) * ky, bx = (poly[i + 1][1] - p[1]) * kx, by = (poly[i + 1][0] - p[0]) * ky;
      var dx = bx - ax, dy = by - ay, t = dx * dx + dy * dy ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / (dx * dx + dy * dy))) : 0;
      var px = ax + t * dx, py = ay + t * dy, d = Math.sqrt(px * px + py * py); if (d < best) best = d;
    }
    return best;
  }
  function buildFences() {
    if (fences.length === W.geofences.length && fences.length) return;
    fences = W.geofences.map(function (f) { var poly = wkt(f.area); if (!poly) return null; var la = poly.map(function (q) { return q[0]; }), lo = poly.map(function (q) { return q[1]; });
      return { id: f.id, name: f.name, poly: poly, b: [Math.min.apply(0, la), Math.max.apply(0, la), Math.min.apply(0, lo), Math.max.apply(0, lo)] }; }).filter(Boolean);
  }
  function devName(id) { var d = W.devices.get(id); return d ? d.name : 'ID ' + id; }
  function fmtT(ms) { return new Date(ms).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
  function fmtDur(s) { var m = Math.round(s / 60); return m >= 60 ? Math.floor(m / 60) + ' h ' + (m % 60) + ' min' : m + ' min'; }
  function selIds() {
    if (CFG.scope === 'all') return Array.from(W.devices.keys());
    return W.selected != null ? [W.selected] : [];
  }

  /* ---------- historial ---------- */
  var lastRec = {};
  function record() {
    var now = Date.now();
    W.positions.forEach(function (p, id) {
      var a = hist[id] || (hist[id] = []), last = a[a.length - 1];
      var moved = last ? mDist([last[0], last[1]], [p.latitude, p.longitude]) : 1e9;
      if (!last || moved > 4 || now - last[2] > 10000) {
        a.push([p.latitude, p.longitude, now, Math.round((p.speed || 0) * 10) / 10]);
        if (a.length > HMAX) a.splice(0, a.length - HMAX);
      }
    });
  }
  function histCount() { var n = 0; for (var k in hist) n += hist[k].length; return n; }
  // Historial de demostración: recorridos en surcos por el lote donde está cada tractor, terminando en su posición actual.
  function seedDemo(hours) {
    buildFences(); var now = Date.now(), dt = 10, steps = Math.round((hours * 3600) / dt), made = 0;
    W.positions.forEach(function (p, id) {
      if (!(p.speed > 0.5)) return;
      var f = fences.find(function (q) { return inPoly([p.latitude, p.longitude], q.poly); }); if (!f) return;
      var gap = 12 / 111320, mLon = 1 / (111320 * Math.cos(p.latitude * rad));
      var k0 = Math.round((p.latitude - f.b[0]) / gap), dir = p.course != null ? (Math.sin(p.course * rad) >= 0 ? 1 : -1) : (k0 % 2 === 0 ? 1 : -1); // sentido de la pasada actual
      var lat = p.latitude, lon = p.longitude, k = k0, fdir = dir, pts = [], stopLeft = 0, turn = 0, vs = 4 + Math.random() * 2;
      for (var i = 0; i < steps; i++) {
        var v;
        if (stopLeft > 0) { v = 0; stopLeft--; }
        else if (turn > 0) { v = 1.5; turn--; lat -= gap / 4; }
        else {
          vs = Math.max(2.5, Math.min(7.2, vs + (Math.random() - 0.5) * 0.9)); v = vs; if (Math.random() < 0.004) stopLeft = 6 + Math.floor(Math.random() * 40);
          lon -= fdir * v / 3.6 * dt * mLon; // hacia atrás en el tiempo
          if (lon < f.b[2] + 0.0003 || lon > f.b[3] - 0.0003) { lon = Math.max(f.b[2] + 0.0003, Math.min(f.b[3] - 0.0003, lon)); fdir = -fdir; k--; turn = 4; }
        }
        pts.push([lat, lon, now - (i + 1) * dt * 1000, Math.round(v * 10) / 10]);
      }
      pts.reverse();
      var cur = hist[id] || []; hist[id] = pts.concat(cur.filter(function (q) { return q[2] > now - 5000; })).slice(-HMAX); made++;
    });
    return made;
  }

  /* ---------- paneles y base ---------- */
  function ensurePanes() {
    [['mapxBase', 250], ['mapx', 450], ['mapxTop', 620]].forEach(function (a) {
      if (!map.getPane(a[0])) { var p = map.createPane(a[0]); p.style.zIndex = a[1]; if (a[0] !== 'mapxTop') p.style.pointerEvents = 'none'; }
    });
  }
  var Canvas = L.Layer.extend({
    initialize: function (draw) { this._draw = draw; },
    onAdd: function (m) {
      this._m = m; var c = (this._c = L.DomUtil.create('canvas', 'mx-canvas')); c.style.position = 'absolute'; c.style.pointerEvents = 'none';
      m.getPane('mapx').appendChild(c); m.on('moveend zoomend resize', this.redraw, this); m.on('zoomstart', this._hide, this); this.redraw();
    },
    onRemove: function (m) { L.DomUtil.remove(this._c); m.off('moveend zoomend resize', this.redraw, this); m.off('zoomstart', this._hide, this); },
    _hide: function () { this._c.style.visibility = 'hidden'; },
    redraw: function () {
      if (!this._m) return; var s = this._m.getSize(), c = this._c; c.width = s.x; c.height = s.y; c.style.visibility = 'visible';
      L.DomUtil.setPosition(c, this._m.containerPointToLayerPoint([0, 0])); this._draw(c.getContext('2d'), s, this._m);
    },
  });
  function add(name, layer) { remove(name); lay[name] = layer; layer.addTo(map); return layer; }
  function remove(name) { if (lay[name]) { map.removeLayer(lay[name]); delete lay[name]; } }
  function visPts(m, s) { return function (p) { var q = m.latLngToContainerPoint([p[0], p[1]]); return q.x > -40 && q.y > -40 && q.x < s.x + 40 && q.y < s.y + 40; }; }

  /* ---------- 1. Rastro por velocidad ---------- */
  function drawTrail() {
    remove('trail'); if (!ON.trail) return;
    var ids = selIds(), buckets = [[], [], [], []], cols = ['#8a8f98', '#18a957', '#f2a900', '#e5384f'];
    ids.forEach(function (id) {
      var a = (hist[id] || []).slice(CFG.scope === 'all' ? -150 : -HMAX);
      for (var i = 1; i < a.length; i++) {
        if (a[i][2] - a[i - 1][2] > 120000 || mDist(a[i - 1], a[i]) > 300) continue;
        var r = a[i][3] / CFG.vmax, b = r < 0.05 ? 0 : r < 0.5 ? 1 : r < 0.8 ? 2 : 3; buckets[b].push([[a[i - 1][0], a[i - 1][1]], [a[i][0], a[i][1]]]);
      }
    });
    var g = L.layerGroup(), rend = L.canvas({ pane: 'mapx' });
    buckets.forEach(function (segs, i) { if (segs.length) L.polyline(segs, { color: cols[i], weight: 4, opacity: 0.95, interactive: false, pane: 'mapx', renderer: rend, lineCap: 'round' }).addTo(g); });
    add('trail', g); setInfo('trail', ids.length ? 'Verde: normal · Ámbar: rápido · Rojo: muy rápido · Gris: parado' : 'Selecciona un tractor o elige “Todos”.');
  }

  /* ---------- 2. Mapa de calor ---------- */
  var PAL = (function () {
    var c = document.createElement('canvas'); c.width = 1; c.height = 256; var x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, 'rgba(0,0,255,0)'); g.addColorStop(0.2, 'rgba(0,120,255,.75)'); g.addColorStop(0.45, 'rgba(0,230,120,.85)'); g.addColorStop(0.7, 'rgba(255,230,0,.9)'); g.addColorStop(1, 'rgba(255,40,0,1)');
    x.fillStyle = g; x.fillRect(0, 0, 1, 256); return x.getImageData(0, 0, 1, 256).data;
  })();
  function drawHeat() {
    remove('heat'); if (!ON.heat) return;
    add('heat', new Canvas(function (ctx, s, m) {
      var r = CFG.heatR, sp = document.createElement('canvas'); sp.width = sp.height = r * 2; var sx = sp.getContext('2d'), gr = sx.createRadialGradient(r, r, 0, r, r, r);
      gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); sx.fillStyle = gr; sx.fillRect(0, 0, r * 2, r * 2);
      var off = document.createElement('canvas'); off.width = s.x; off.height = s.y; var ox = off.getContext('2d'); ox.globalAlpha = 0.07; var vis = visPts(m, s), n = 0;
      for (var id in hist) hist[id].forEach(function (p) { if (!vis(p)) return; var q = m.latLngToContainerPoint([p[0], p[1]]); ox.drawImage(sp, q.x - r, q.y - r); n++; });
      var img = ox.getImageData(0, 0, s.x, s.y), d = img.data;
      var mx = 1; for (var q = 3; q < d.length; q += 4) if (d[q] > mx) mx = d[q];
      for (var i = 3; i < d.length; i += 4) { var a = d[i]; if (a) { var o = Math.min(255, Math.round((a / mx) * 255)) * 4; d[i - 3] = PAL[o]; d[i - 2] = PAL[o + 1]; d[i - 1] = PAL[o + 2]; d[i] = PAL[o + 3] * 0.85; } }
      ctx.putImageData(img, 0, 0); setInfo('heat', n + ' puntos en pantalla · más rojo = más pasadas');
    }));
  }

  /* ---------- 3. Etiquetas ---------- */
  function labelHtml(id, p) {
    var d = W.devices.get(id) || {}, at = p.attributes || {}, h = at.hours ? Math.round(at.hours / 3600e3) + ' h' : '', f = typeof at.fuel === 'number' ? ' · ⛽ ' + at.fuel + ' L' : '';
    return '<b>' + esc(d.name || id) + '</b><span>' + esc((d.attributes && d.attributes.marca || '').replace('-', ' ')) + (h ? ' · ' + h : '') + f + '</span>';
  }
  function drawLabels() {
    if (!ON.labels) { remove('labels'); return; }
    if (!lay.labels) { lay.labels = L.layerGroup().addTo(map); lay.labelMk = {}; }
    var show = map.getZoom() >= 14, seen = {};
    W.positions.forEach(function (p, id) {
      var d = W.devices.get(id) || {}; if (CFG.marca && (d.attributes || {}).marca !== CFG.marca) return;
      if (!show || !map.getBounds().contains([p.latitude, p.longitude])) return; seen[id] = 1;
      var html = labelHtml(id, p), mk = lay.labelMk[id];
      if (!mk) { mk = lay.labelMk[id] = L.marker([p.latitude, p.longitude], { pane: 'mapxTop', interactive: false, icon: L.divIcon({ className: 'mx-label', html: html, iconSize: null, iconAnchor: [-18, 40] }) }).addTo(lay.labels); }
      else { mk.setLatLng([p.latitude, p.longitude]); if (mk._html !== html) mk.setIcon(L.divIcon({ className: 'mx-label', html: html, iconSize: null, iconAnchor: [-18, 40] })); }
      mk._html = html;
    });
    Object.keys(lay.labelMk).forEach(function (id) { if (!seen[id]) { lay.labels.removeLayer(lay.labelMk[id]); delete lay.labelMk[id]; } });
    setInfo('labels', show ? Object.keys(seen).length + ' etiquetas visibles' : 'Acerca el mapa (zoom 14 o más) para ver las etiquetas.');
  }

  /* ---------- 4. Alertas de lote ---------- */
  var sim = {}; // salidas de lote simuladas (demo): id -> [lat, lon]
  function outsideList() {
    buildFences(); var out = [];
    W.positions.forEach(function (p, id) {
      var pt = sim[id] || [p.latitude, p.longitude];
      if (!assigned[id]) { var f = fences.find(function (q) { return inPoly(pt, q.poly); }); if (f) assigned[id] = f.id; return; }
      var f2 = fences.find(function (q) { return q.id === assigned[id]; }); if (!f2) return;
      if (!inPoly(pt, f2.poly) && distToPoly(pt, f2.poly) > 15) out.push({ id: id, d: Math.round(distToPoly(pt, f2.poly)), fence: f2, pt: pt });
    });
    return out;
  }
  function drawFences() {
    var need = ON.alerts || ON.cover; remove('fences'); remove('alerts'); if (!need) return;
    buildFences(); var out = ON.alerts ? outsideList() : [], bad = {}; out.forEach(function (o) { bad[o.fence.id] = 1; });
    var g = L.layerGroup();
    fences.forEach(function (f) {
      var c = ON.cover && f.cov != null ? f.cov : null, red = bad[f.id];
      var poly = L.polygon(f.poly, { pane: 'mapx', interactive: false, color: red ? '#e5384f' : '#2e9e5b', weight: red ? 3 : 1.5, dashArray: red ? '6 5' : null, fillColor: red ? '#e5384f' : '#2e9e5b', fillOpacity: red ? 0.22 : 0.06 });
      if (c != null) poly.bindTooltip(f.name.split('·')[1].trim() + ' · ' + c + ' %', { permanent: true, direction: 'center', className: 'mx-tip' });
      poly.addTo(g);
    });
    out.forEach(function (o) {
      L.marker(o.pt, { pane: 'mapxTop', interactive: false, icon: L.divIcon({ className: 'mx-pulse', html: '<i></i>', iconSize: [44, 44], iconAnchor: [22, 22] }) }).addTo(g);
      if (sim[o.id]) L.marker(o.pt, { pane: 'mapxTop', interactive: false, icon: L.divIcon({ className: 'mx-stop', html: '⚠ ' + esc(devName(o.id)) + ' fuera de lote (simulado)', iconSize: null, iconAnchor: [-14, 34] }) }).addTo(g);
    });
    add('fences', g);
    if (ON.alerts) {
      var html = out.length ? out.map(function (o) { return '<a href="#" data-mx-go="' + o.id + '">' + esc(devName(o.id)) + '</a> a ' + o.d + ' m de ' + esc(o.fence.name); }).join('<br>') : 'Todos los tractores están dentro de su lote.';
      setInfo('alerts', (out.length ? '<b style="color:#e5384f">' + out.length + ' fuera de su lote</b><br>' : '') + html + (Object.keys(sim).length ? '<br><a href="#" data-mx-clear>Quitar simulación</a>' : ''), true);
    }
  }
  function simulateExit() {
    buildFences(); var ids = Array.from(W.positions.keys()).filter(function (id) { var p = W.positions.get(id); return p.speed > 0.5 && assigned[id]; });
    if (!ids.length) { outsideList(); ids = Array.from(W.positions.keys()).filter(function (id) { return assigned[id]; }); }
    var id = ids[Math.floor(Math.random() * ids.length)], p = W.positions.get(id); if (!p) return;
    sim[id] = [p.latitude + 0.0042, p.longitude + 0.0021]; drawFences(); map.flyTo(sim[id], Math.max(map.getZoom(), 15), { duration: 0.8 });
  }
  function clearSim() { sim = {}; drawFences(); }

  /* ---------- 5. Radar de lluvia + clima ---------- */
  function toggleRain() {
    remove('rain'); if (!ON.rain) return;
    fetch('https://api.rainviewer.com/public/weather-maps.json').then(function (r) { return r.json(); }).then(function (j) {
      if (!ON.rain) return; var f = j.radar.past[j.radar.past.length - 1];
      add('rain', L.tileLayer(j.host + f.path + '/256/{z}/{x}/{y}/2/1_1.png', { pane: 'mapxBase', opacity: 0.65, maxNativeZoom: 7, maxZoom: 19, attribution: 'Radar © RainViewer' }));
      setInfo('rain', 'Radar de ' + fmtT(f.time * 1000) + ' (franja más reciente disponible).');
    }).catch(function () { setInfo('rain', 'No se pudo cargar el radar (sin conexión a RainViewer).'); });
    loadWeather();
  }
  var wTimer = 0;
  function loadWeather() {
    var c = map.getCenter();
    fetch('https://api.open-meteo.com/v1/forecast?latitude=' + c.lat.toFixed(3) + '&longitude=' + c.lng.toFixed(3) + '&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m&timezone=auto')
      .then(function (r) { return r.json(); }).then(function (j) {
        var k = j.current, dirs = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'], dd = dirs[Math.round(k.wind_direction_10m / 45) % 8];
        $('#mx-wx').innerHTML = '🌡 <b>' + k.temperature_2m + ' °C</b> · 💧 ' + k.relative_humidity_2m + ' % · 💨 ' + k.wind_speed_10m + ' km/h ' + dd + ' · 🌧 ' + k.precipitation + ' mm';
      }).catch(function () { $('#mx-wx').textContent = 'Clima no disponible (sin conexión).'; });
  }

  /* ---------- 6. Paradas ---------- */
  function drawStops() {
    remove('stops'); if (!ON.stops) return; var g = L.layerGroup(), n = 0, tot = 0;
    selIds().forEach(function (id) {
      var a = hist[id] || [], i = 0;
      while (i < a.length) {
        if (a[i][3] >= 0.5) { i++; continue; }
        var j = i; while (j + 1 < a.length && a[j + 1][3] < 0.5 && a[j + 1][2] - a[j][2] < 120000) j++;
        var dur = (a[j][2] - a[i][2]) / 1000 + 10;
        if (dur >= CFG.stopMin * 60 && n < 250) {
          n++; tot += dur;
          L.marker([a[i][0], a[i][1]], { pane: 'mapxTop', icon: L.divIcon({ className: 'mx-stop', html: '⏸ ' + fmtDur(dur), iconSize: null, iconAnchor: [0, 10] }), title: devName(id) + ' · ' + fmtT(a[i][2]) + ' → ' + fmtT(a[j][2]) }).addTo(g);
        }
        i = j + 1;
      }
    });
    add('stops', g); setInfo('stops', n ? n + ' paradas ≥ ' + CFG.stopMin + ' min · total ' + fmtDur(tot) : (selIds().length ? 'Sin paradas de ese tamaño.' : 'Selecciona un tractor o elige “Todos”.'));
  }

  /* ---------- 7. Cobertura del implemento ---------- */
  function mpp(m) { return (40075016.686 * Math.cos(m.getCenter().lat * rad)) / (256 * Math.pow(2, m.getZoom())); }
  function drawCover() {
    remove('cover'); if (!ON.cover) { fences.forEach(function (f) { delete f.cov; }); drawFences(); return; }
    buildFences(); var ids = selIds(), cells = {}, cell = Math.max(CFG.width, 5);
    fences.forEach(function (f) { f.cells = null; });
    // % por lote con rejilla
    fences.forEach(function (f) {
      var kx = 111320 * Math.cos(((f.b[0] + f.b[1]) / 2) * rad), ky = 111320, nx = Math.ceil(((f.b[3] - f.b[2]) * kx) / cell), ny = Math.ceil(((f.b[1] - f.b[0]) * ky) / cell), tot = 0, hit = {};
      ids.forEach(function (id) {
        var a = hist[id] || [];
        for (var i = 1; i < a.length; i++) {
          if (a[i][3] < 0.5 || a[i][2] - a[i - 1][2] > 120000) continue;
          var d = mDist(a[i - 1], a[i]), st = Math.max(1, Math.ceil(d / (cell / 2)));
          for (var s = 0; s <= st; s++) {
            var la = a[i - 1][0] + ((a[i][0] - a[i - 1][0]) * s) / st, lo = a[i - 1][1] + ((a[i][1] - a[i - 1][1]) * s) / st;
            if (la < f.b[0] || la > f.b[1] || lo < f.b[2] || lo > f.b[3]) continue;
            hit[Math.floor(((la - f.b[0]) * ky) / cell) * nx + Math.floor(((lo - f.b[2]) * kx) / cell)] = 1;
          }
        }
      });
      var inside = 0, covered = 0;
      for (var y = 0; y < ny; y++) for (var x = 0; x < nx; x++) {
        var c = [f.b[0] + ((y + 0.5) * cell) / ky, f.b[2] + ((x + 0.5) * cell) / kx]; if (!inPoly(c, f.poly)) continue; inside++; if (hit[y * nx + x]) covered++;
      }
      f.cov = inside ? Math.round((covered / inside) * 1000) / 10 : 0;
    });
    add('cover', new Canvas(function (ctx, s, m) {
      var off = document.createElement('canvas'); off.width = s.x; off.height = s.y; var ox = off.getContext('2d'); ox.strokeStyle = '#19c37d'; ox.lineCap = 'butt'; ox.lineJoin = 'round'; ox.lineWidth = Math.max(1.5, CFG.width / mpp(m));
      var vis = visPts(m, s);
      ids.forEach(function (id) {
        var a = hist[id] || []; ox.beginPath();
        for (var i = 1; i < a.length; i++) {
          if (a[i][3] < 0.5 || a[i][2] - a[i - 1][2] > 120000 || !(vis(a[i]) || vis(a[i - 1]))) continue;
          var p = m.latLngToContainerPoint([a[i - 1][0], a[i - 1][1]]), q = m.latLngToContainerPoint([a[i][0], a[i][1]]); ox.moveTo(p.x, p.y); ox.lineTo(q.x, q.y);
        }
        ox.stroke();
      });
      ctx.globalAlpha = 0.55; ctx.drawImage(off, 0, 0);
    }));
    var rows = fences.slice().sort(function (a, b) { return b.cov - a.cov; }).map(function (f) { return '<div class="mx-bar"><span>' + esc(f.name) + '</span><i style="width:' + Math.min(100, f.cov) + '%"></i><em>' + f.cov + ' %</em></div>'; }).join('');
    setInfo('cover', ids.length ? 'Ancho del implemento: ' + CFG.width + ' m' + rows : 'Selecciona un tractor o elige “Todos”.', true);
    drawFences();
  }

  /* ---------- 8. NDVI (NASA GIBS · MODIS Terra) ---------- */
  function ymd(d) { return d.toISOString().slice(0, 10); }
  function ndviDates() {
    var out = [], now = new Date(); for (var back = 16; back <= 64; back += 8) {
      var t = new Date(now.getTime() - back * 864e5), y0 = Date.UTC(t.getUTCFullYear(), 0, 1), doy = Math.floor((t.getTime() - y0) / 864e5), st = Math.floor(doy / 8) * 8; out.push(ymd(new Date(y0 + st * 864e5)));
    } return out;
  }
  function toggleNdvi() {
    remove('ndvi'); if (!ON.ndvi) return; var dates = ndviDates(), i = 0;
    (function tryNext() {
      if (!ON.ndvi) return; if (i >= dates.length) { setInfo('ndvi', 'No se encontró una imagen NDVI reciente.'); return; }
      var d = dates[i++], img = new Image(); img.onload = function () { if (!ON.ndvi) return;
        add('ndvi', L.tileLayer('https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_NDVI_8Day/default/' + d + '/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png', { pane: 'mapxBase', opacity: CFG.ndviOp / 100, maxNativeZoom: 9, maxZoom: 19, attribution: 'NDVI © NASA GIBS (MODIS Terra, 8 días)' }));
        setInfo('ndvi', 'Compuesto de 8 días desde ' + d + '. Resolución ~250 m: sirve para ver tendencias de la zona, no un lote individual. Verde intenso = vegetación densa.'); };
      img.onerror = tryNext; img.src = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_NDVI_8Day/default/' + d + '/GoogleMapsCompatible_Level9/3/3/2.png';
    })();
  }

  /* ---------- 9. Agrupar marcadores ---------- */
  function drawClusters() {
    var root = $('#map'); if (!ON.cluster) { remove('cluster'); root.classList.remove('mx-clust'); return; }
    var z = map.getZoom(), active = z < CFG.clusterZoom; root.classList.toggle('mx-clust', active); remove('cluster'); if (!active) { setInfo('cluster', 'Zoom ' + z + ': se muestran los tractores individuales (se agrupan por debajo de ' + CFG.clusterZoom + ').'); return; }
    var cells = {}, S = 64; W.positions.forEach(function (p, id) {
      var d = W.devices.get(id) || {}; if (CFG.marca && (d.attributes || {}).marca !== CFG.marca) return; var q = map.latLngToContainerPoint([p.latitude, p.longitude]), key = Math.floor(q.x / S) + ':' + Math.floor(q.y / S);
      var c = cells[key] || (cells[key] = { n: 0, run: 0, la: 0, lo: 0, pts: [] }); c.n++; c.la += p.latitude; c.lo += p.longitude; c.pts.push([p.latitude, p.longitude]); if (p.speed > 0.5) c.run++;
    });
    var g = L.layerGroup(), k = 0; Object.keys(cells).forEach(function (key) {
      var c = cells[key], pct = c.run / c.n, col = pct > 0.66 ? '#18a957' : pct > 0.25 ? '#f2a900' : '#8a8f98', sz = 30 + Math.min(26, Math.sqrt(c.n) * 5); k++;
      var mk = L.marker([c.la / c.n, c.lo / c.n], { pane: 'mapxTop', icon: L.divIcon({ className: 'mx-cl', html: '<span style="background:' + col + ';width:' + sz + 'px;height:' + sz + 'px;line-height:' + sz + 'px">' + c.n + '</span>', iconSize: [sz, sz] }) });
      mk.on('click', function () { map.fitBounds(L.latLngBounds(c.pts).pad(0.4), { maxZoom: 17 }); }); mk.addTo(g);
    });
    add('cluster', g); setInfo('cluster', k + ' grupos · verde: mayoría en marcha · ámbar: mixto · gris: parados');
  }

  /* ---------- 10. Reproducción de ruta ---------- */
  var PB = { id: null, i: 0, timer: 0, speed: 16 };
  function pbIds() { var best = null; Object.keys(hist).forEach(function (k) { if (!best || hist[k].length > hist[best].length) best = k; }); return W.selected != null && (hist[W.selected] || []).length > 2 ? W.selected : best != null ? +best : null; }
  function openPlayback() {
    var id = pbIds(), a = id != null ? hist[id] : null; if (!a || a.length < 3) { alert('Aún no hay historial. Pulsa “Cargar historial de demostración” o espera unos minutos.'); return; }
    stopPlayback(); PB.id = id; PB.i = 0; var bar = $('#mx-pb'); bar.hidden = false; $('#mx-pb-slider').max = a.length - 1; $('#mx-pb-slider').value = 0; $('#mx-pb-name').textContent = devName(id);
    var g = L.layerGroup(); L.polyline(a.map(function (p) { return [p[0], p[1]]; }), { pane: 'mapx', color: '#8a8f98', weight: 3, opacity: 0.7, dashArray: '2 6', interactive: false }).addTo(g);
    lay.pbDone = L.polyline([], { pane: 'mapx', color: '#673de6', weight: 5, opacity: 0.95, interactive: false }).addTo(g);
    lay.pbMk = L.marker([a[0][0], a[0][1]], { pane: 'mapxTop', icon: L.divIcon({ className: 'mx-pbmk', iconSize: [22, 22], iconAnchor: [11, 11] }), interactive: false }).addTo(g);
    add('pb', g); map.fitBounds(L.latLngBounds(a.map(function (p) { return [p[0], p[1]]; })).pad(0.2)); pbTo(0); pbPlay();
  }
  function pbTo(i) {
    var a = hist[PB.id]; if (!a) return; PB.i = Math.max(0, Math.min(a.length - 1, i)); var p = a[PB.i];
    lay.pbMk.setLatLng([p[0], p[1]]); lay.pbDone.setLatLngs(a.slice(0, PB.i + 1).map(function (q) { return [q[0], q[1]]; })); $('#mx-pb-slider').value = PB.i;
    $('#mx-pb-time').textContent = fmtT(p[2]) + ' · ' + p[3].toFixed(1) + ' km/h'; if (!map.getBounds().contains([p[0], p[1]])) map.panTo([p[0], p[1]]);
  }
  function pbPlay() { clearInterval(PB.timer); $('#mx-pb-play').textContent = '⏸'; PB.timer = setInterval(function () { if (PB.i >= hist[PB.id].length - 1) { pbPause(); return; } pbTo(PB.i + Math.max(1, Math.round(PB.speed / 4))); }, 120); }
  function pbPause() { clearInterval(PB.timer); PB.timer = 0; $('#mx-pb-play').textContent = '▶'; }
  function stopPlayback() { pbPause(); remove('pb'); $('#mx-pb').hidden = true; }

  /* ---------- 11. Seguir y pantalla completa ---------- */
  var lastFollow = null;
  function follow() { if (!ON.follow || W.selected == null) return; var p = W.positions.get(W.selected); if (!p) return; var ll = [p.latitude, p.longitude]; if (lastFollow !== W.selected) { map.setView(ll, Math.max(map.getZoom(), 16)); lastFollow = W.selected; } else map.panTo(ll, { animate: true, duration: 0.6 }); }
  function fullscreen() { var d = document; if (d.fullscreenElement) d.exitFullscreen(); else d.documentElement.requestFullscreen && d.documentElement.requestFullscreen(); }

  /* ---------- Panel ---------- */
  var FEATS = [
    ['trail', 'Rastro por velocidad', 'Colorea el recorrido según qué tan rápido iba el tractor.'],
    ['heat', 'Mapa de calor', 'Zonas donde la flota ha pasado más veces.'],
    ['labels', 'Etiquetas flotantes', 'Nombre, marca, horas y combustible junto a cada tractor.'],
    ['alerts', 'Alertas de lote', 'Marca en rojo el lote y el tractor que salió de su zona.'],
    ['rain', 'Radar de lluvia y clima', 'Lluvia reciente sobre el mapa y clima del centro.'],
    ['stops', 'Paradas', 'Dónde estuvo detenido y por cuánto tiempo.'],
    ['cover', 'Cobertura del implemento', 'Franja trabajada y porcentaje de cada lote.'],
    ['ndvi', 'Vegetación (NDVI)', 'Vigor de la vegetación desde satélite (NASA).'],
    ['cluster', 'Agrupar tractores', 'Junta los marcadores cercanos al alejar el zoom.'],
    ['follow', 'Seguir tractor seleccionado', 'La cámara acompaña al tractor elegido.'],
  ];
  var infoEls = {};
  function setInfo(k, html, raw) { var e = infoEls[k]; if (e) { if (raw) e.innerHTML = html; else e.textContent = html; } }
  function buildPanel() {
    var css = document.createElement('style'); css.textContent = [
      '.mx-panel{position:fixed;z-index:1300;width:310px;max-height:calc(100vh - 150px);overflow:auto;background:#fff;color:#1d1e20;border:1px solid #cfd2de;border-radius:8px;box-shadow:0 8px 28px rgba(0,0,0,.28);font:13px/1.4 "Manrope","Segoe UI",system-ui,sans-serif}',
      '.mx-panel[hidden]{display:none}.mx-hd{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid #e4e6f0;font-weight:800;position:sticky;top:0;background:#fff;z-index:2}.mx-hd button{margin-left:auto}',
      '.mx-panel button,.mx-panel select,.mx-panel input[type=number]{font:inherit}.mx-panel select,.mx-panel input[type=number],.mx-pb select{background:#fff!important;color:#1d1e20!important;border:1px solid #cfd2de!important;border-radius:4px;padding:2px 4px;height:auto!important}.mx-x{border:0;background:transparent;cursor:pointer;font-size:16px;color:#6d7081}',
      '.mx-top{padding:8px 12px;border-bottom:1px solid #eef0f6;display:grid;gap:6px}.mx-top label{display:flex;justify-content:space-between;align-items:center;gap:8px;color:#454858}',
      '.mx-top select{max-width:170px}.mx-btn{border:1px solid #673de6;background:#673de6;color:#fff;border-radius:6px;padding:6px 10px;cursor:pointer;font-weight:600}.mx-btn.ghost{background:#fff;color:#673de6}',
      '.mx-f{border-bottom:1px solid #eef0f6;padding:8px 12px}.mx-row{display:flex;align-items:center;gap:8px}.mx-row b{font-weight:700}.mx-sw{margin-left:auto;position:relative;width:34px;height:18px}',
      '.mx-sw input{opacity:0;position:absolute;inset:0;margin:0;cursor:pointer;z-index:2}.mx-sw i{position:absolute;inset:0;background:#c8cbd8;border-radius:99px;transition:.15s}.mx-sw i:after{content:"";position:absolute;left:2px;top:2px;width:14px;height:14px;background:#fff;border-radius:50%;transition:.15s}',
      '.mx-sw input:checked+i{background:#673de6}.mx-sw input:checked+i:after{left:18px}.mx-d{color:#6d7081;font-size:12px;margin:2px 0 0}.mx-in{margin-top:6px;font-size:12px;color:#454858}.mx-in:empty{display:none}.mx-in a{color:#673de6}',
      '.mx-p{margin:6px 0 0;display:flex;align-items:center;gap:8px;font-size:12px;color:#454858}.mx-p input[type=range]{flex:1}.mx-p input[type=number]{width:60px}',
      '.mx-bar{position:relative;height:20px;margin:3px 0;background:#eef0f6;border-radius:4px;overflow:hidden;font-size:11px}.mx-bar i{position:absolute;left:0;top:0;bottom:0;background:#9be8c4}.mx-bar span{position:absolute;left:6px;top:2px;z-index:1}.mx-bar em{position:absolute;right:6px;top:2px;z-index:1;font-style:normal;font-weight:700}',
      '.mx-act{padding:10px 12px;display:grid;grid-template-columns:1fr 1fr;gap:6px}.mx-note{padding:8px 12px 12px;color:#6d7081;font-size:11px}#mx-wx{padding:6px 12px;background:#f4f5fa;font-size:12px;border-bottom:1px solid #e4e6f0}',
      '.mx-label{white-space:nowrap;background:rgba(20,21,28,.88);color:#fff;border-radius:5px;padding:2px 7px;font:11px/1.3 "Manrope",system-ui,sans-serif;border:1px solid rgba(255,255,255,.25)}.mx-label b{display:block;font-size:12px}.mx-label span{opacity:.85}',
      '.mx-stop{white-space:nowrap;background:#fff;color:#b4231d;border:2px solid #e5384f;border-radius:99px;padding:1px 7px;font:700 11px/1.3 system-ui,sans-serif;box-shadow:0 1px 4px rgba(0,0,0,.35)}',
      '.mx-pulse i{display:block;width:100%;height:100%;box-sizing:border-box;border-radius:50%;border:3px solid #e5384f;background:rgba(229,56,79,.18);animation:mxp 1.2s ease-out infinite}@keyframes mxp{0%{transform:scale(.55);opacity:1}100%{transform:scale(1.5);opacity:0}}',
      '.mx-tip{background:rgba(20,21,28,.85);border:0;color:#fff;font:700 11px system-ui;box-shadow:none}.mx-tip:before{display:none}',
      '.mx-cl span{display:block;border-radius:50%;color:#fff;font:800 13px system-ui;text-align:center;border:3px solid rgba(255,255,255,.9);box-shadow:0 2px 8px rgba(0,0,0,.45);cursor:pointer}',
      '#map.mx-clust .leaflet-marker-pane{display:none}.mx-pbmk{width:22px;height:22px;border-radius:50%;background:#673de6;border:3px solid #fff;box-shadow:0 0 0 3px rgba(103,61,230,.45),0 2px 6px rgba(0,0,0,.5)}',
      '.mx-pb{position:fixed;z-index:1300;display:flex;align-items:center;gap:10px;background:#fff;border:1px solid #cfd2de;border-radius:10px;padding:8px 12px;box-shadow:0 8px 28px rgba(0,0,0,.3);font:13px system-ui}.mx-pb[hidden]{display:none}.mx-pb input[type=range]{width:320px}',
      '.mx-pb{color:#1d1e20}.mx-pb b,.mx-pb span{color:#1d1e20!important}.mx-pb input[type=range]{accent-color:#673de6;background:transparent!important}.mx-pb button,.mx-pb select{font:inherit}.mx-pb .mx-btn{padding:4px 10px}',
    ].join('\n'); document.head.appendChild(css);

    var panel = document.createElement('div'); panel.className = 'mx-panel'; panel.hidden = true; panel.id = 'mx-panel';
    var brands = Array.from(new Set(Array.from(W.devices.values()).map(function (d) { return (d.attributes || {}).marca; }).filter(Boolean)));
    panel.innerHTML = '<div class="mx-hd">Herramientas del mapa<button class="mx-x" data-mx-close aria-label="Cerrar">✕</button></div>' +
      '<div class="mx-top"><label>Alcance (rastro, paradas, cobertura)<select data-cfg="scope"><option value="sel">Tractor seleccionado</option><option value="all">Todos los tractores</option></select></label>' +
      '<label>Marca (etiquetas y grupos)<select data-cfg="marca"><option value="">Todas</option>' + brands.map(function (b) { return '<option value="' + b + '">' + b.replace('-', ' ') + '</option>'; }).join('') + '</select></label></div>' +
      '<div id="mx-wx" hidden></div>' +
      FEATS.map(function (f) {
        var extra = { trail: '<div class="mx-p">Vel. máx. <input type="range" min="3" max="15" step="0.5" value="' + CFG.vmax + '" data-cfg="vmax"><span data-v="vmax">' + CFG.vmax + ' km/h</span></div>',
          heat: '<div class="mx-p">Radio <input type="range" min="8" max="40" value="' + CFG.heatR + '" data-cfg="heatR"></div>',
          stops: '<div class="mx-p">Mínimo <input type="number" min="1" max="120" value="' + CFG.stopMin + '" data-cfg="stopMin"> min</div>',
          cover: '<div class="mx-p">Ancho del implemento <input type="number" min="3" max="40" value="' + CFG.width + '" data-cfg="width"> m</div>',
          ndvi: '<div class="mx-p">Opacidad <input type="range" min="20" max="100" value="' + CFG.ndviOp + '" data-cfg="ndviOp"></div>',
          cluster: '<div class="mx-p">Agrupar bajo zoom <input type="number" min="8" max="17" value="' + CFG.clusterZoom + '" data-cfg="clusterZoom"></div>' }[f[0]] || '';
        return '<div class="mx-f" data-f="' + f[0] + '"><div class="mx-row"><b>' + f[1] + '</b><label class="mx-sw"><input type="checkbox" data-feat="' + f[0] + '"><i></i></label></div><p class="mx-d">' + f[2] + '</p>' + extra + '<div class="mx-in" data-info="' + f[0] + '"></div></div>';
      }).join('') +
      '<div class="mx-act"><button class="mx-btn" data-act="play">▶ Reproducir ruta</button><button class="mx-btn ghost" data-act="full">⛶ Pantalla completa</button>' +
      '<button class="mx-btn ghost" data-act="seed">Cargar historial de demostración (3 h)</button><button class="mx-btn ghost" data-act="exit">Simular salida de lote</button></div>' +
      '<div class="mx-note" id="mx-hist"></div>';
    document.body.appendChild(panel);
    panel.querySelectorAll('[data-info]').forEach(function (e) { infoEls[e.dataset.info] = e; });

    var pb = document.createElement('div'); pb.className = 'mx-pb'; pb.id = 'mx-pb'; pb.hidden = true;
    pb.innerHTML = '<button class="mx-btn" id="mx-pb-play">▶</button><b id="mx-pb-name"></b><input type="range" id="mx-pb-slider" min="0" max="1" value="0"><span id="mx-pb-time" style="min-width:150px"></span>' +
      '<select id="mx-pb-speed"><option value="4">×1</option><option value="16" selected>×4</option><option value="64">×16</option><option value="256">×64</option></select><button class="mx-btn ghost" id="mx-pb-close">✕</button>';
    document.body.appendChild(pb);

    panel.addEventListener('change', function (e) {
      var t = e.target;
      if (t.dataset.feat) { var k = t.dataset.feat; ON[k] = t.checked; run(k); if (k === 'rain') { $('#mx-wx').hidden = !t.checked; } }
      else if (t.dataset.cfg) { var c = t.dataset.cfg, v = t.type === 'number' || t.type === 'range' ? +t.value : t.value; CFG[c] = v; var sv = panel.querySelector('[data-v="' + c + '"]'); if (sv) sv.textContent = v + ' km/h'; runAll(); if (c === 'ndviOp' && lay.ndvi) lay.ndvi.setOpacity(v / 100); }
    });
    panel.addEventListener('input', function (e) { var t = e.target; if (t.type === 'range' && t.dataset.cfg) { CFG[t.dataset.cfg] = +t.value; var sv = panel.querySelector('[data-v="' + t.dataset.cfg + '"]'); if (sv) sv.textContent = t.value + ' km/h'; if (t.dataset.cfg === 'ndviOp') { if (lay.ndvi) lay.ndvi.setOpacity(+t.value / 100); } else runAll(); } });
    panel.addEventListener('click', function (e) {
      var t = e.target.closest('[data-act],[data-mx-close],[data-mx-go],[data-mx-clear]'); if (!t) return;
      if (t.hasAttribute('data-mx-close')) panel.hidden = true;
      else if (t.hasAttribute('data-mx-clear')) { e.preventDefault(); clearSim(); }
      else if (t.dataset.mxGo) { e.preventDefault(); var id = +t.dataset.mxGo, p = W.positions.get(id); if (window.__pf && window.__pf.select) window.__pf.select(id); if (p) map.flyTo([p.latitude, p.longitude], 16, { duration: 0.7 }); }
      else if (t.dataset.act === 'play') openPlayback();
      else if (t.dataset.act === 'full') fullscreen();
      else if (t.dataset.act === 'seed') { var n = seedDemo(3); runAll(); updHist(); t.textContent = 'Historial cargado (' + n + ' tractores)'; }
      else if (t.dataset.act === 'exit') { ON.alerts = true; panel.querySelector('[data-feat="alerts"]').checked = true; simulateExit(); }
    });
    pb.addEventListener('click', function (e) { if (e.target.id === 'mx-pb-play') { PB.timer ? pbPause() : pbPlay(); } if (e.target.id === 'mx-pb-close') stopPlayback(); });
    pb.addEventListener('input', function (e) { if (e.target.id === 'mx-pb-slider') pbTo(+e.target.value); if (e.target.id === 'mx-pb-speed') PB.speed = +e.target.value; });
    return panel;
  }
  function updHist() { var e = $('#mx-hist'); if (e) e.textContent = 'Historial en memoria: ' + histCount().toLocaleString('es-MX') + ' puntos de ' + Object.keys(hist).length + ' tractores. Se reinicia al recargar la página.'; }
  function place() {
    var m = $('#map'), p = $('#mx-panel'), pb = $('#mx-pb'); if (!m) return; var r = m.getBoundingClientRect(), vis = r.width > 200 && r.height > 200;
    var btn = $('#mx-btn'); if (btn) btn.style.display = vis ? '' : 'none'; if (!vis) { p.hidden = true; return; }
    p.style.top = r.top + 12 + 'px'; p.style.right = window.innerWidth - r.right + 62 + 'px'; p.style.maxHeight = Math.max(260, r.height - 24) + 'px';
    pb.style.left = r.left + r.width / 2 - 260 + 'px'; pb.style.bottom = window.innerHeight - r.bottom + 14 + 'px';
  }

  /* ---------- orquestación ---------- */
  var runners = { trail: drawTrail, heat: drawHeat, labels: drawLabels, alerts: drawFences, rain: toggleRain, stops: drawStops, cover: drawCover, ndvi: toggleNdvi, cluster: drawClusters, follow: follow };
  function run(k) { try { runners[k](); } catch (e) { console.error('[mapx] ' + k, e); setInfo(k, 'Error: ' + e.message); } if (!ON[k]) setInfo(k, ''); }
  function runAll() { ['trail', 'heat', 'labels', 'alerts', 'stops', 'cover', 'cluster', 'follow'].forEach(function (k) { if (ON[k]) run(k); }); }
  var tick = 0, lastSel = null;
  function onState() {
    record(); var n = Date.now(); if (n - tick < 1500) { if (W.selected !== lastSel) { lastSel = W.selected; runAll(); } return; } tick = n; lastSel = W.selected;
    if (ON.follow) follow(); updHist(); ['trail', 'stops', 'labels', 'alerts', 'cluster'].forEach(function (k) { if (ON[k]) run(k); });
    if (ON.heat && lay.heat) lay.heat.redraw(); if (ON.cover && n % 3 < 2) run('cover');
  }

  function captureMap(cb) {
    var P = L.Map.prototype, orig = P.getSize, tries = 0;
    P.getSize = function () { if (!map && this._container && this._container.id === 'map') map = this; return orig.apply(this, arguments); };
    (function poll() { window.dispatchEvent(new Event('resize')); if (map) { P.getSize = orig; cb(); } else if (++tries < 40) setTimeout(poll, 250); else P.getSize = orig; })();
  }
  function init() {
    ensurePanes(); var panel = buildPanel(); updHist();
    var grp = $('#ctl-measure').parentElement.cloneNode(false); grp.innerHTML = '';
    var b = document.createElement('button'); b.type = 'button'; b.id = 'mx-btn'; b.className = 'jd-btn'; b.title = 'Herramientas del mapa'; b.setAttribute('aria-label', 'Herramientas del mapa');
    b.innerHTML = '<svg viewBox="0 0 24 24" class="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 3 8l9 5 9-5-9-5Z"/><path d="m3 13 9 5 9-5"/><path d="m3 17.5 9 5 9-5" opacity=".5"/></svg>';
    b.addEventListener('click', function () { panel.hidden = !panel.hidden; b.setAttribute('aria-pressed', String(!panel.hidden)); place(); }); grp.appendChild(b);
    var groups = document.querySelectorAll('.jd-group'); groups[groups.length - 1].parentElement.appendChild(grp);
    map.on('moveend zoomend', function () { if (ON.labels) drawLabels(); if (ON.cluster) drawClusters(); });
    window.__pf.subscribe(onState); window.addEventListener('resize', place); setInterval(place, 800); place();
    window.__mapx = { map: map, hist: hist, CFG: CFG, ON: ON, run: run, seed: seedDemo, setOn: function (k, v) { var el = panel.querySelector('[data-feat="' + k + '"]'); if (el) el.checked = v; ON[k] = v; run(k); if (k === 'rain') $('#mx-wx').hidden = !v; },
      openPanel: function () { panel.hidden = false; place(); }, play: openPlayback, simulateExit: simulateExit };
  }
  var wait = setInterval(function () {
    if (!window.L || !window.__pf || !document.getElementById('ctl-measure') || !document.getElementById('map')) return;
    clearInterval(wait); W = window.__pf.w; captureMap(init);
  }, 400);
})();
