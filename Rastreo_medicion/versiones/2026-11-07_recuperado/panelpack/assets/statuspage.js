/* statuspage.js — página "Status" dentro del panel (estilo statuspage.hostinger.com).
 * La monta home.js como la página 'estado' (migas: Inicio / Status). El estado se guarda en localStorage
 * (clave pf-status-v1); con el modo "Administrar" se reportan incidentes, se programa mantenimiento y se
 * cambia el estado de cada componente. Datos de demostración hasta conectar endpoints de salud reales. */
(function () {
  'use strict';
  var KEY = 'pf-status-v1', DAYS = 90;
  var LBL = { operational: 'Operativo', degraded: 'Rendimiento degradado', partial: 'Interrupción parcial', major: 'Interrupción mayor', maintenance: 'En mantenimiento' };
  var RANK = { operational: 0, maintenance: 1, degraded: 2, partial: 3, major: 4 };
  var FILL = { degraded: 0.98, partial: 0.93, major: 0.8, maintenance: 1 };
  var PHASES = ['Investigando', 'Identificado', 'Monitoreando', 'Resuelto'];
  var GROUPS = [
    { name: 'Frontend', comps: [['Sitio web', 'buildwiselabs.net'], ['Panel de flota', 'Mapa, flota, alertas y reportes'], ['Inicio de sesión', 'Autenticación de usuarios'], ['Página de inicio / CDN', 'Activos estáticos e imágenes']] },
    { name: 'Actualizaciones de servidor', comps: [['Parches del sistema (Debian)', 'Actualizaciones de seguridad del SO'], ['API / Backend', 'Node.js · endpoints del panel'], ['Base de datos', 'Respaldos y réplicas'], ['Servidor GPS (Traccar)', 'Recepción de rastreadores Teltonika']] },
    { name: 'Soporte programado', comps: [['Mesa de ayuda', 'Correo y chat, L–V 9:00–18:00 (GMT-7)'], ['Ventanas de mantenimiento', 'Sábados 23:00–01:00 (GMT-7)']] },
  ];
  var ALL = [].concat.apply([], GROUPS.map(function (g) { return g.comps.map(function (c) { return c[0]; }); }));
  var DAY = 864e5, S = null;
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var key = function (d) { return new Date(d).toISOString().slice(0, 10); };
  var fmtDay = function (d) { return new Date(d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }); };
  var fmtUTC = function (d) { return new Date(d).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC', hour12: false }) + ' UTC'; };
  var worst = function (a) { return a.reduce(function (x, y) { return RANK[y] > RANK[x] ? y : x; }, 'operational'); };

  /* ---------- datos ---------- */
  function seed() {
    var now = Date.now(), H = { 'Página de inicio / CDN': { 0: 'degraded', 1: 'degraded', 20: 'partial' }, 'Inicio de sesión': { 3: 'partial', 41: 'degraded' }, 'Parches del sistema (Debian)': { 6: 'maintenance', 34: 'maintenance' }, 'Servidor GPS (Traccar)': { 15: 'degraded', 58: 'partial' }, 'API / Backend': { 3: 'degraded', 74: 'major' }, 'Panel de flota': { 9: 'partial' }, 'Base de datos': { 0: 'maintenance', 27: 'maintenance' }, 'Ventanas de mantenimiento': { 13: 'maintenance', 27: 'maintenance', 55: 'maintenance' }, 'Sitio web': { 88: 'nodata' } };
    var hist = {}; ALL.forEach(function (c) { hist[c] = {}; Object.keys(H[c] || {}).forEach(function (b) { hist[c][key(now - b * DAY)] = H[c][b]; }); });
    var comps = {}; ALL.forEach(function (c) { comps[c] = 'operational'; }); comps['Página de inicio / CDN'] = 'degraded'; comps['Base de datos'] = 'maintenance';
    return {
      admin: false, comps: comps, hist: hist,
      incidents: [{ id: 1, title: 'Carga lenta de imágenes en la página de inicio', comp: 'Página de inicio / CDN', sev: 'degraded', phase: 'Monitoreando', updates: [
        { phase: 'Monitoreando', msg: 'Aplicamos una corrección en la caché de la CDN y vemos mejoría. Seguimos observando.', t: now - 2 * 36e5 },
        { phase: 'Identificado', msg: 'Detectamos que algunos activos estáticos no se están sirviendo desde caché.', t: now - 5 * 36e5 },
        { phase: 'Investigando', msg: 'Estamos revisando reportes de carga lenta en la página de inicio.', t: now - 7 * 36e5 }] }],
      maint: [
        { id: 11, title: 'Mantenimiento de la base de datos', comp: 'Base de datos', start: now - 36e5 / 2, hours: 1, text: 'Optimización de índices y verificación de respaldos. El rendimiento puede variar durante la ventana.', state: 'progress', posted: now - 3 * DAY },
        { id: 12, title: 'Actualización de seguridad del sistema operativo (Debian)', comp: 'Parches del sistema (Debian)', start: now + 6 * DAY, hours: 2, text: 'Aplicaremos parches de seguridad al servidor. Se espera una breve interrupción (menos de 5 minutos) del panel y la API al reiniciar servicios.', state: 'scheduled', posted: now - 1 * DAY },
        { id: 13, title: 'Despliegue de nueva versión del frontend', comp: 'Panel de flota', start: now + 13 * DAY, hours: 1, text: 'Publicación del rediseño del panel. No se espera interrupción; puede ser necesario recargar la página (Ctrl+Shift+R).', state: 'scheduled', posted: now - 2 * DAY }],
      past: [
        { id: 21, day: key(now - 1 * DAY), title: 'Actualización de servidor completada', text: 'Se aplicaron los parches de seguridad del kernel sin impacto para los usuarios.' },
        { id: 22, day: key(now - 3 * DAY), title: 'Intermitencia en el inicio de sesión', text: 'Un pico de solicitudes provocó errores 502 durante 14 minutos. Se amplió la capacidad del proxy.' },
        { id: 23, day: key(now - 9 * DAY), title: 'Despliegue del frontend con rollback', text: 'Una versión del panel se revirtió por un error en el mapa. Servicio restablecido.' },
        { id: 24, day: key(now - 15 * DAY), title: 'Latencia alta en el servidor GPS', text: 'Reinicio del servicio Traccar tras acumulación de conexiones.' }],
    };
  }
  function load() { if (S) return S; try { S = JSON.parse(localStorage.getItem(KEY)); } catch (e) { S = null; } if (!S || !S.comps) S = seed(); return S; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* sin almacenamiento */ } }
  function mark(comp, st) { var k = key(Date.now()), h = S.hist[comp] || (S.hist[comp] = {}); if (st !== 'operational' && RANK[st] >= RANK[h[k] || 'operational']) h[k] = st; }
  function recompute(comp) {
    var st = S.incidents.filter(function (i) { return i.comp === comp; }).map(function (i) { return i.sev; });
    if (S.maint.some(function (m) { return m.comp === comp && m.state === 'progress'; })) st.push('maintenance');
    S.comps[comp] = worst(st); mark(comp, S.comps[comp]);
  }
  function uptime(comp) {
    var h = S.hist[comp] || {}, good = 0, n = 0, now = Date.now();
    for (var i = 0; i < DAYS; i++) { var s = h[key(now - i * DAY)]; if (s === 'nodata') continue; n++; good += s ? (FILL[s] == null ? 1 : FILL[s]) : 1; }
    return n ? (good / n) * 100 : 100;
  }
  function fleetLive() {
    try { var w = window.__pf.w, c = { running: 0, idle: 0, nosignal: 0 }; w.devices.forEach(function (d, id) { c[window.__pf.At(id)] = (c[window.__pf.At(id)] || 0) + 1; }); return c; } catch (e) { return null; }
  }

  /* ---------- render ---------- */
  function bars(comp) {
    var h = S.hist[comp] || {}, out = '', now = Date.now();
    for (var i = DAYS - 1; i >= 0; i--) {
      var d = now - i * DAY, s = h[key(d)] || 'operational', tip = s === 'nodata' ? 'No hay datos para este día' : s === 'operational' ? 'Sin interrupciones registradas este día' : LBL[s];
      out += '<span class="hs-bar ' + (s === 'operational' ? '' : s) + '"><span class="hs-tip">' + esc(fmtDay(d)) + '<br>' + esc(tip) + '</span></span>';
    }
    return out;
  }
  function html() {
    load(); ALL.forEach(function (c) { if (!S.comps[c]) S.comps[c] = 'operational'; });
    var all = ALL.map(function (c) { return S.comps[c]; }), ov = worst(all), adm = S.admin;
    var banner = ov === 'operational' ? ['ok', 'Todos los sistemas operativos'] : ov === 'maintenance' ? ['maint', 'Mantenimiento en curso'] : ov === 'degraded' ? ['warn', 'Algunos sistemas con rendimiento degradado'] : ['bad', 'Algunos sistemas con interrupciones'];
    var avg = ALL.reduce(function (a, c) { return a + uptime(c); }, 0) / ALL.length, live = fleetLive();
    var opts = ALL.map(function (c) { return '<option>' + esc(c) + '</option>'; }).join('');
    var h = '<div id="dh-splash"><h1>Status</h1></div><div class="hs">';
    h += '<div class="hs-top"><span class="hs-sub">Estado del servicio · BuildWise Labs</span><button type="button" class="hs-btn' + (adm ? '' : ' ghost') + '" data-hs="admin">' + (adm ? '✔ Modo administrador' : 'Administrar') + '</button></div>';
    h += '<div class="hs-banner ' + banner[0] + '"><span class="hs-dot"></span>' + banner[1] + '</div>';
    if (live) h += '<p class="hs-live">Flota en vivo: <b>' + live.running + '</b> en marcha · <b>' + live.idle + '</b> apagados · <b' + (live.nosignal ? ' class="bad"' : '') + '>' + live.nosignal + '</b> sin señal</p>';
    if (adm) {
      h += '<div class="hs-admin"><b>Controles de administrador</b><div class="hs-actions"><button type="button" class="hs-btn" data-hs="show" data-t="inc">Reportar incidente</button><button type="button" class="hs-btn ghost" data-hs="show" data-t="mt">Programar mantenimiento</button><button type="button" class="hs-btn ghost" data-hs="reset">Restablecer demo</button></div>' +
        '<form class="hs-form" data-f="inc" hidden><h3>Nuevo incidente</h3><input name="title" placeholder="Título (p. ej. Errores al iniciar sesión)" required>' +
        '<div class="hs-two"><select name="comp">' + opts + '</select><select name="sev"><option value="degraded">Rendimiento degradado</option><option value="partial">Interrupción parcial</option><option value="major">Interrupción mayor</option></select></div>' +
        '<select name="phase">' + PHASES.slice(0, 3).map(function (p) { return '<option>' + p + '</option>'; }).join('') + '</select><textarea name="msg" rows="2" placeholder="Mensaje para los usuarios" required></textarea><button class="hs-btn">Publicar incidente</button></form>' +
        '<form class="hs-form" data-f="mt" hidden><h3>Nuevo mantenimiento</h3><input name="title" placeholder="Título (p. ej. Actualización de seguridad de Debian)" required>' +
        '<div class="hs-two"><select name="comp">' + opts + '</select><input name="hours" type="number" min="0.5" step="0.5" value="1" title="Duración en horas"></div><input name="start" type="datetime-local" required><textarea name="text" rows="2" placeholder="Descripción e impacto esperado" required></textarea><button class="hs-btn">Programar</button></form></div>';
    }
    // Incidentes activos
    S.incidents.forEach(function (i) {
      h += '<div class="hs-card hs-inc"><h3>' + esc(i.title) + '</h3><span class="hs-tag ' + (i.phase === 'Monitoreando' ? 'mon' : i.phase === 'Identificado' ? 'ide' : 'inv') + '">' + esc(i.phase) + '</span> <span class="hs-comp">' + esc(i.comp) + '</span>' +
        i.updates.map(function (u) { return '<p class="hs-upd"><b>' + esc(u.phase) + '</b> – ' + esc(u.msg) + '<time>' + esc(fmtUTC(u.t)) + '</time></p>'; }).join('') +
        (adm ? '<form class="hs-form inline" data-f="upd" data-id="' + i.id + '"><select name="phase">' + PHASES.map(function (p) { return '<option' + (p === i.phase ? ' selected' : '') + '>' + p + '</option>'; }).join('') + '</select><input name="msg" placeholder="Agregar actualización…" required><button class="hs-btn">Publicar</button></form>' : '') + '</div>';
    });
    // Disponibilidad
    h += '<div class="hs-line"><h2>Disponibilidad</h2><span>Últimos ' + DAYS + ' días: <b>' + avg.toFixed(2) + ' %</b></span></div>';
    GROUPS.forEach(function (g) {
      var gs = worst(g.comps.map(function (c) { return S.comps[c[0]]; }));
      h += '<details class="hs-card hs-group" open><summary>' + esc(g.name) + '<span class="hs-st ' + gs + '">' + LBL[gs] + '</span></summary>';
      g.comps.forEach(function (c) {
        var n = c[0], st = S.comps[n];
        h += '<div class="hs-c"><div class="hs-row"><b>' + esc(n) + '</b><span class="hs-d">· ' + esc(c[1]) + '</span>' +
          (adm ? '<select class="hs-sel" data-comp="' + esc(n) + '">' + Object.keys(LBL).map(function (k) { return '<option value="' + k + '"' + (k === st ? ' selected' : '') + '>' + LBL[k] + '</option>'; }).join('') + '</select>' : '<span class="hs-st ' + st + '" style="margin-left:auto">' + LBL[st] + '</span>') + '</div>' +
          '<div class="hs-bars">' + bars(n) + '</div><div class="hs-foot"><span>Hace ' + DAYS + ' días</span><span>' + uptime(n).toFixed(2) + ' % de disponibilidad</span><span>Hoy</span></div></div>';
      });
      h += '</details>';
    });
    h += '<div class="hs-legend"><span><i class="ok"></i>Operativo</span><span><i class="degraded"></i>Rendimiento degradado</span><span><i class="partial"></i>Interrupción parcial</span><span><i class="major"></i>Interrupción mayor</span><span><i class="maintenance"></i>Mantenimiento</span></div>';
    // Mantenimiento
    h += '<h2 class="hs-h">Soporte y mantenimiento programado</h2>';
    var ms = S.maint.slice().sort(function (a, b) { return a.start - b.start; });
    if (!ms.length) h += '<p class="hs-none">No hay mantenimientos programados.</p>';
    ms.forEach(function (m) {
      var e = m.start + m.hours * 36e5;
      h += '<div class="hs-card hs-mt"><h3>' + esc(m.title) + '</h3><span class="hs-tag ' + (m.state === 'progress' ? 'prog' : 'sch') + '">' + (m.state === 'progress' ? 'En curso' : 'Programado') + '</span> <span class="hs-comp">' + esc(m.comp) + '</span>' +
        '<p><b>' + esc(fmtUTC(m.start)) + '</b> – <b>' + esc(fmtUTC(e)) + '</b></p><p class="hs-d">' + esc(m.text) + '</p><p class="hs-d small">Publicado el ' + esc(fmtDay(m.posted || m.start)) + '</p>' +
        (adm ? '<div class="hs-actions">' + (m.state === 'scheduled' ? '<button type="button" class="hs-btn" data-hs="mstart" data-id="' + m.id + '">Iniciar ahora</button>' : '<button type="button" class="hs-btn" data-hs="mdone" data-id="' + m.id + '">Completar</button>') + '<button type="button" class="hs-btn ghost" data-hs="mdel" data-id="' + m.id + '">Cancelar</button></div>' : '') + '</div>';
    });
    // Pasados
    h += '<h2 class="hs-h" id="hs-hist">Incidentes pasados</h2>';
    var byDay = {}; S.past.forEach(function (p) { (byDay[p.day] = byDay[p.day] || []).push(p); });
    for (var i = 0; i < 16; i++) {
      var k = key(Date.now() - i * DAY), arr = byDay[k];
      if (!arr && i > 2 && i % 3) continue;
      h += '<div class="hs-day">' + esc(fmtDay(k + 'T12:00:00Z')) + '</div>' + (arr ? arr.map(function (p) { return '<div class="hs-card hs-past"><h3>' + esc(p.title) + '</h3><span class="hs-tag ok">Resuelto</span><p class="hs-d">' + esc(p.text) + '</p></div>'; }).join('') : '<p class="hs-none">Sin incidentes reportados.</p>');
    }
    h += '<p class="hs-note">Los datos son de demostración y se guardan en este navegador. Para estado real, conecta cada componente a un endpoint de salud.</p></div>';
    return h;
  }
  function refresh() {
    var c = document.getElementById('dh-content'), v = document.getElementById('home-view'), top = v ? v.scrollTop : 0;
    if (!c || !c.querySelector('.hs')) return; c.innerHTML = html(); if (v) v.scrollTop = top;
  }

  /* ---------- acciones ---------- */
  function addIncident(f) {
    var t = Date.now(), inc = { id: t, title: f.title, comp: f.comp, sev: f.sev, phase: f.phase, updates: [{ phase: f.phase, msg: f.msg, t: t }] };
    S.incidents.unshift(inc); recompute(f.comp);
  }
  function addUpdate(id, phase, msg) {
    var i = S.incidents.find(function (x) { return x.id === id; }); if (!i) return;
    i.updates.unshift({ phase: phase, msg: msg, t: Date.now() }); i.phase = phase;
    if (phase === 'Resuelto') { S.incidents = S.incidents.filter(function (x) { return x.id !== id; }); S.past.unshift({ id: id, day: key(Date.now()), title: i.title, text: msg }); recompute(i.comp); }
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-hs]'); if (!b || !document.querySelector('.hs')) return; load();
    var a = b.dataset.hs, id = +b.dataset.id;
    if (a === 'admin') S.admin = !S.admin;
    else if (a === 'show') { var f = document.querySelector('.hs-form[data-f="' + b.dataset.t + '"]'); var was = f && !f.hidden; document.querySelectorAll('.hs-admin .hs-form').forEach(function (x) { x.hidden = true; }); if (f) f.hidden = !!was; return; }
    else if (a === 'reset') { if (!confirm('¿Restablecer el estado a los datos de demostración?')) return; S = seed(); S.admin = true; }
    else if (a === 'mstart') { var m = S.maint.find(function (x) { return x.id === id; }); if (m) { m.state = 'progress'; m.start = Math.min(m.start, Date.now()); recompute(m.comp); } }
    else if (a === 'mdone') { var m2 = S.maint.find(function (x) { return x.id === id; }); if (m2) { S.maint = S.maint.filter(function (x) { return x.id !== id; }); S.past.unshift({ id: id, day: key(Date.now()), title: m2.title + ' (completado)', text: 'Mantenimiento finalizado sin incidencias.' }); recompute(m2.comp); } }
    else if (a === 'mdel') { var m3 = S.maint.find(function (x) { return x.id === id; }); S.maint = S.maint.filter(function (x) { return x.id !== id; }); if (m3) recompute(m3.comp); }
    else return;
    save(); refresh();
  });
  document.addEventListener('change', function (e) {
    var s = e.target.closest('select[data-comp]'); if (!s || !document.querySelector('.hs')) return; load();
    S.comps[s.dataset.comp] = s.value; mark(s.dataset.comp, s.value); save(); refresh();
  });
  document.addEventListener('submit', function (e) {
    var f = e.target.closest('.hs-form'); if (!f) return; e.preventDefault(); load(); var d = {}; new FormData(f).forEach(function (v, k) { d[k] = String(v).trim(); });
    if (f.dataset.f === 'inc') addIncident(d);
    else if (f.dataset.f === 'upd') addUpdate(+f.dataset.id, d.phase, d.msg);
    else if (f.dataset.f === 'mt') { var st = new Date(d.start).getTime(); S.maint.push({ id: Date.now(), title: d.title, comp: d.comp, start: st, hours: +d.hours || 1, text: d.text, state: 'scheduled', posted: Date.now() }); }
    save(); refresh();
  });

  /* ---------- estilos ---------- */
  var css = document.createElement('style'); css.textContent = [
    '.hs{max-width:900px;margin:0 auto;padding:8px 16px 40px;font-size:15px;line-height:1.5}.hs *{box-sizing:border-box}.hs h2,.hs h3{margin:0;font-family:inherit}',
    '.hs-top{display:flex;align-items:center;gap:12px;margin:14px 0 10px}.hs-sub{color:#6d7081;font-size:14px}.hs-top .hs-btn{margin-left:auto}',
    '.hs-btn{border:1px solid #a80030;background:#a80030;color:#fff;padding:7px 14px;border-radius:4px;cursor:pointer;font:600 13px inherit}.hs-btn.ghost{background:transparent;color:#a80030}.hs-btn:hover{opacity:.9}',
    '.hs-banner{display:flex;align-items:center;gap:12px;padding:18px 22px;border-radius:6px;font-size:20px;font-weight:700}.hs-banner.ok{background:#e6f7f3;color:#00705a}.hs-banner.warn{background:#fff4d6;color:#8a5a00}.hs-banner.maint{background:#e3eeff;color:#1d4fa8}.hs-banner.bad{background:#ffe3ea;color:#a3123a}',
    '.hs-dot{width:12px;height:12px;border-radius:50%;background:currentColor}.hs-live{margin:10px 0 0;font-size:13px;color:#6d7081}.hs-live .bad{color:#e5384f}',
    '.hs-card{border:1px solid rgba(128,128,128,.32);border-radius:6px;background:rgba(128,128,128,.05);margin:12px 0}.hs-inc{padding:16px 20px;border-left:4px solid #f4b400}.hs-mt{padding:16px 20px;border-left:4px solid #3b82f6}.hs-past{padding:12px 18px}',
    '.hs-card h3{font-size:16px;margin-bottom:4px}.hs-tag{display:inline-block;font-size:12px;font-weight:700;padding:1px 8px;border-radius:99px;color:#fff;background:#888}.hs-tag.mon{background:#3b82f6}.hs-tag.ide{background:#ff7a1a}.hs-tag.inv{background:#f4b400;color:#3b2a00}.hs-tag.prog{background:#f4b400;color:#3b2a00}.hs-tag.sch{background:#3b82f6}.hs-tag.ok{background:#00b090}',
    '.hs-comp{font-size:12px;color:#6d7081}.hs-upd{margin:10px 0 0;font-size:14px;color:#6d7081}.hs-upd b{color:inherit}.hs-upd time{display:block;font-size:12px}.hs-d{color:#6d7081;font-size:14px;margin:4px 0 0}.hs-d.small{font-size:12px}',
    '.hs-line{display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:6px;margin:28px 0 6px}.hs-line h2,.hs-h{font-size:19px}.hs-line span{color:#6d7081;font-size:14px}.hs-h{margin:32px 0 6px}',
    '.hs-group summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:10px;padding:14px 20px;font-weight:700}.hs-group summary::-webkit-details-marker{display:none}.hs-group summary:before{content:"▸";color:#888;transition:transform .15s}.hs-group[open] summary:before{transform:rotate(90deg)}.hs-group summary .hs-st{margin-left:auto}',
    '.hs-c{padding:12px 20px;border-top:1px solid rgba(128,128,128,.25)}.hs-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.hs-st{font-size:14px;font-weight:600}.hs-st.operational{color:#00a082}.hs-st.degraded{color:#c28a00}.hs-st.partial{color:#e8680a}.hs-st.major{color:#e5384f}.hs-st.maintenance{color:#2f6fe0}',
    '.hs-bars{display:flex;gap:2px;height:32px;margin-top:10px}.hs-bar{flex:1;min-width:2px;border-radius:2px;background:#00b090;position:relative}.hs-bar.degraded{background:#f4b400}.hs-bar.partial{background:#ff7a1a}.hs-bar.major{background:#fc5185}.hs-bar.maintenance{background:#3b82f6}.hs-bar.nodata{background:#c8cbd8}.hs-bar:hover{opacity:.75}',
    '.hs-tip{display:none;position:absolute;bottom:38px;left:50%;transform:translateX(-50%);background:#1d1e20;color:#fff;font-size:12px;padding:5px 9px;border-radius:5px;white-space:nowrap;z-index:6;pointer-events:none}.hs-bar:hover .hs-tip{display:block}',
    '.hs-foot{display:flex;justify-content:space-between;font-size:12px;color:#6d7081;margin-top:5px}.hs-legend{display:flex;flex-wrap:wrap;gap:6px 18px;font-size:13px;color:#6d7081;margin:6px 0}.hs-legend i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:6px}',
    '.hs-legend i.ok{background:#00b090}.hs-legend i.degraded{background:#f4b400}.hs-legend i.partial{background:#ff7a1a}.hs-legend i.major{background:#fc5185}.hs-legend i.maintenance{background:#3b82f6}',
    '.hs-day{margin:18px 0 6px;font-weight:700;border-bottom:1px solid rgba(128,128,128,.3);padding-bottom:4px}.hs-none{color:#6d7081;font-size:14px;margin:6px 0}.hs-note{margin-top:30px;padding:10px 14px;border:1px dashed rgba(128,128,128,.5);border-radius:6px;font-size:12px;color:#6d7081}',
    '.hs-admin{margin:12px 0;padding:14px 18px;border:1px solid #a80030;border-radius:6px;background:rgba(168,0,48,.05)}.hs-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}',
    '.hs-form{display:grid;gap:8px;margin-top:12px}.hs-form[hidden]{display:none}.hs-form.inline{grid-template-columns:150px 1fr auto;margin-top:12px}.hs-two{display:grid;grid-template-columns:1fr 1fr;gap:8px}',
    '.hs input,.hs select,.hs textarea{width:100%;padding:7px 9px;border:1px solid #cfd2de!important;border-radius:4px;background:#fff!important;color:#1d1e20!important;font:14px inherit}.hs .hs-sel{width:auto;margin-left:auto}',
    '@media(max-width:640px){\n.hs-form.inline,.hs-two{grid-template-columns:1fr}\n}',
  ].join('\n');
  // El marco Debian resetea margin/padding con selectores de id: se sube la especificidad anteponiendo #home-view.
  css.textContent = css.textContent.replace(/(^|[}\n])\s*([^{}@\n][^{}]*)\{/g, function (m, pre, sel) { return pre + sel.split(',').map(function (s) { return '#home-view ' + s.trim(); }).join(',') + '{'; });
  document.head.appendChild(css);

  window.__pfStatus = { html: html, refresh: refresh };
})();
