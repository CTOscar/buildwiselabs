  /* ---------- páginas con componente propio (misma arquitectura de Debian) ----------
   * Cada enlace de la navbar renderiza su componente dentro de #dh-content:
   *   inicio · lotes · alertas · reportes. Mapa, Simulador y Vista 3D abren sus vistas de la app. */
  var PAGE_TITLE = { inicio: 'Inicio', lotes: 'Lotes', alertas: 'Alertas', reportes: 'Reportes' };
  var STATUS_LBL = { running: 'En marcha', idle: 'Apagado', nosignal: 'Sin señal' };
  var P = function () { return window.__pf; };
  var devList = function () { return [...P().w.devices.values()]; };
  var statusOf = function (id) { return P().At(id); };
  var hoursOf = function (id) { return (P().w.engineToday.get(id) || 0) / 36e5; };
  var devName = function (id) { var d = P().w.devices.get(id); return d ? d.name : '#' + id; };
  var kpiCell = function (cls, v, l, attr) { return '<a href="#" class="column dh-kpi ' + cls + '" ' + (attr || '') + '><h1>' + v + '</h1><h2>' + l + '</h2></a>'; };
  var splash = function (t) { return '<div id="dh-splash"><h1>' + t + '</h1></div>'; };
  var colHead = function (h1, h2) { return '<div style="text-align:center"><h1>' + h1 + '</h1><h2>' + h2 + '</h2></div>'; };
  var emptyBox = function (t, p) { return '<p class="dh-emptybox"><b>' + t + '</b>' + p + '</p>'; };

  // Superficie (ha) de una geocerca WKT de Traccar ("lat lon").
  function geoArea(g) {
    var a = g.area || '', m = a.match(/POLYGON\s*\(\((.+)\)\)/i);
    if (m) {
      var pts = m[1].split(',').map(function (t) { return t.trim().split(/\s+/).map(Number); }).filter(function (p) { return p.length >= 2 && isFinite(p[0]) && isFinite(p[1]); });
      if (pts.length < 3) return 0;
      var lat0 = pts.reduce(function (s, p) { return s + p[0]; }, 0) / pts.length * Math.PI / 180;
      var xy = pts.map(function (p) { return [p[1] * 111320 * Math.cos(lat0), p[0] * 110540]; }), s = 0;
      xy.forEach(function (p, i) { var q = xy[(i + 1) % xy.length]; s += p[0] * q[1] - q[0] * p[1]; });
      return Math.abs(s) / 2 / 1e4;
    }
    m = a.match(/CIRCLE\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*,\s*([\d.]+)\s*\)/i);
    return m ? Math.PI * Math.pow(+m[3], 2) / 1e4 : 0;
  }
  function loteStats() {
    var w = P().w, pos = [...w.positions.values()];
    return (w.geofences || []).map(function (g) {
      var ids = pos.filter(function (p) { return (p.geofenceIds || []).indexOf(g.id) >= 0; }).map(function (p) { return p.deviceId; });
      return { g: g, ids: ids, n: ids.length, run: ids.filter(function (id) { return statusOf(id) === 'running'; }).length, hours: ids.reduce(function (s, id) { return s + hoursOf(id); }, 0), ha: geoArea(g) };
    });
  }

  /* --- Lotes --- */
  function buildLotes() {
    var L = loteStats();
    if (!L.some(function (x) { return x.g.id === state.lote; })) state.lote = L[0] ? L[0].g.id : null;
    var sel = L.filter(function (x) { return x.g.id === state.lote; })[0];
    var tot = L.reduce(function (a, x) { a.n += x.n; a.run += x.run; a.ha += x.ha; return a; }, { n: 0, run: 0, ha: 0 });
    var all = P().w.positions.size;
    var rows = L.map(function (x) {
      var on = x.g.id === state.lote ? ' dh-on' : '';
      return '<div class="row' + on + '"><div class="community column"><a href="#" data-hm-sel="' + x.g.id + '" aria-hidden="true">' + svg('lotes') + '</a></div>' +
        '<div class="styled-href-blue column-4-parts"><h2><a href="#" data-hm-sel="' + x.g.id + '">' + esc(x.g.name) + '</a></h2><p>' + x.n + ' tractor' + (x.n === 1 ? '' : 'es') + ' · ' + x.run + ' en marcha · ' + fmt(x.ha, 1) + ' ha</p></div></div>';
    }).join('');
    var detail = '';
    if (sel) {
      var tr = sel.ids.map(function (id) { return { id: id, st: statusOf(id), h: hoursOf(id) }; }).sort(function (a, b) { return b.h - a.h; });
      var m = function (l, v) { return '<div class="dh-m"><small>' + l + '</small><b>' + v + '</b></div>'; };
      detail = '<div class="dh-detail"><div class="dh-metrics">' + m('Tractores dentro', sel.n) + m('En marcha', sel.run) + m('Horas motor hoy', fmt(sel.hours, 1) + ' h') + m('Superficie', fmt(sel.ha, 1) + ' ha') + m('Promedio por tractor', fmt(sel.n ? sel.hours / sel.n : 0, 1) + ' h') + m('Eficiencia', fmt(sel.n ? sel.run / sel.n * 100 : 0) + ' %') + '</div>' +
        (tr.length ? '<ul class="dh-list" style="margin-top:10px">' + tr.map(function (t) {
          return '<li><span class="dh-dot ' + (t.st === 'running' ? 'ok' : t.st === 'nosignal' ? 'crit' : '') + '"></span><div><b><a href="#" data-hm-event="' + t.id + '">' + esc(devName(t.id)) + '</a></b><small>' + STATUS_LBL[t.st] + '</small></div><em>' + fmt(t.h, 1) + ' h</em></li>';
        }).join('') + '</ul>' : emptyBox('Sin tractores en este lote', 'Ahora mismo ningún tractor reporta posición dentro del lote.')) + '</div>' +
        '<div class="dh-actions"><a href="#" class="dh-btn" data-hm-map="' + sel.g.id + '">Ver en el mapa</a><a href="#" class="dh-other" data-hm-page="reportes">Reportes</a></div>';
    }
    var table = '<div class="tabular"><table><thead><tr><th>Lote</th><th>Tractores</th><th>En marcha</th><th>Horas hoy</th><th>Superficie</th></tr></thead><tbody>' + L.map(function (x) {
      return '<tr class="' + (x.g.id === state.lote ? 'dh-on' : '') + '"><td><a href="#" data-hm-sel="' + x.g.id + '">' + esc(x.g.name) + '</a></td><td>' + x.n + '</td><td>' + x.run + '</td><td>' + fmt(x.hours, 1) + ' h</td><td>' + fmt(x.ha, 1) + ' ha</td></tr>';
    }).join('') + '</tbody></table></div>';
    return splash('Lotes') +
      '<div class="row">' + kpiCell('', L.length, 'Lotes', 'data-hm-page="lotes"') + kpiCell('ok', tot.n, 'Tractores en lotes', '') + kpiCell('', tot.run, 'En marcha', '') + kpiCell('', Math.max(0, all - tot.n), 'Fuera de lotes', '') + kpiCell('', fmt(tot.ha, 1) + ' ha', 'Superficie', '') + '</div>' +
      '<div class="row">' +
        '<div class="column column-left">' + colHead('Tus lotes', 'Elige un lote para ver su detalle') + (L.length ? rows : emptyBox('Aún no hay lotes', 'Dibuje lotes en el mapa para verlos aquí.')) + '</div>' +
        '<div class="column column-right">' + colHead(sel ? esc(sel.g.name) : 'Detalle', 'Tractores y horas de motor de hoy') + detail + '</div>' +
      '</div><hr>' +
      '<div class="row"><div class="column">' + colHead('Todos los lotes', 'Resumen comparativo') + table + '</div></div>';
  }

  /* --- Alertas --- */
  function evInfo(e) {
    var t = e.type, a = (e.attributes && e.attributes.alarm) || '';
    if (t === 'deviceFuelDrop') return { k: 'combustible', label: 'Caída de combustible', high: true };
    if (t === 'alarm') return a === 'powerCut' ? { k: 'energia', label: 'Corte de energía', high: true } : { k: 'alarma', label: 'Alarma' + (a ? ' · ' + a : ''), high: true };
    if (t === 'ignitionOn') return { k: 'encendido', label: 'Encendido' };
    if (t === 'ignitionOff') return { k: 'apagado', label: 'Apagado' };
    if (t === 'geofenceEnter') return { k: 'geocerca', label: 'Entró a un lote' };
    if (t === 'geofenceExit') return { k: 'geocerca', label: 'Salió de un lote' };
    if (t === 'deviceOverspeed') return { k: 'alarma', label: 'Exceso de velocidad', high: true };
    return { k: 'otros', label: t };
  }
  var AL_FILTERS = [['todos', 'Todos'], ['altas', 'Altas'], ['combustible', 'Combustible'], ['energia', 'Energía'], ['encendido', 'Encendido'], ['apagado', 'Apagado'], ['geocerca', 'Lotes']];
  function calBox(ms) {
    var d = new Date(ms);
    return '<time datetime="' + d.toISOString().slice(0, 10) + '" class="date-as-calendar position-em size1_25x"><span class="day">' + String(d.getDate()).padStart(2, '0') + '</span><span class="month">' + d.toLocaleDateString('es-MX', { month: 'long' }) + '</span><span class="year">' + d.getFullYear() + '</span></time>';
  }
  function buildAlertas() {
    var w = P().w, fences = {}; (w.geofences || []).forEach(function (g) { fences[g.id] = g.name; });
    var ev = (w.events || []).map(function (e) { return { e: e, i: evInfo(e), at: new Date(e.eventTime).getTime() }; }).sort(function (a, b) { return b.at - a.at; });
    var cnt = { todos: ev.length, altas: 0 }; ev.forEach(function (x) { if (x.i.high) cnt.altas++; cnt[x.i.k] = (cnt[x.i.k] || 0) + 1; });
    var match = function (x) { var f = state.alFilter; return f === 'todos' || (f === 'altas' ? x.i.high : x.i.k === f); };
    var shown = ev.filter(match), lim = state.alLimit, list = shown.slice(0, lim);
    var filters = '<p class="dh-topics">' + AL_FILTERS.map(function (f) { return '<a href="#" data-hm-flt="' + f[0] + '"' + (f[0] === state.alFilter ? ' aria-current="true"' : '') + '>' + f[1] + ' (' + (cnt[f[0]] || 0) + ')</a>'; }).join('|') + '</p>';
    var rows = list.map(function (x) {
      var lote = x.e.geofenceId && fences[x.e.geofenceId] ? ' · ' + esc(fences[x.e.geofenceId]) : '';
      return '<div class="project-news">' + calBox(x.at) + '<div class="project-news-content"><a href="#" data-hm-event="' + x.e.deviceId + '">' + esc(devName(x.e.deviceId)) + ' — ' + esc(x.i.label) + '</a><small>' +
        new Date(x.at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false }) + ' · ' + ago(x.at) + lote + (x.i.high ? ' · <b style="color:#c70036">alta</b>' : '') + '</small></div></div>';
    }).join('');
    var more = shown.length > lim ? '<div class="project-news"><div class="end-of-list-arrow"></div><div class="project-news-content project-news-content-end"><a href="#" data-hm-more="1">Mostrar más (' + (shown.length - lim) + ')</a></div></div>' : '';
    var byType = {}; ev.forEach(function (x) { byType[x.i.label] = (byType[x.i.label] || 0) + 1; });
    var types = Object.keys(byType).sort(function (a, b) { return byType[b] - byType[a]; }), mx = types.length ? byType[types[0]] : 1;
    var byDev = {}; ev.forEach(function (x) { if (x.i.high) byDev[x.e.deviceId] = (byDev[x.e.deviceId] || 0) + 1; });
    var worst = Object.keys(byDev).sort(function (a, b) { return byDev[b] - byDev[a]; }).slice(0, 6);
    var summary = '<ul class="dh-bars">' + types.map(function (t) { return '<li><span>' + esc(t) + '</span><i><u style="width:' + (byType[t] / mx * 100) + '%"></u></i><b>' + byType[t] + '</b></li>'; }).join('') + '</ul>';
    var top = worst.length ? '<ul class="dh-list">' + worst.map(function (id) { return '<li><span class="dh-dot crit"></span><div><b><a href="#" data-hm-event="' + id + '">' + esc(devName(id)) + '</a></b><small>' + statusLabel(id) + '</small></div><em>' + byDev[id] + ' alertas</em></li>'; }).join('') + '</ul>' : emptyBox('Sin alertas altas', 'Ningún tractor tiene alertas altas recientes.');
    return splash('Alertas') +
      '<div class="row">' + kpiCell('', cnt.todos, 'Eventos', 'data-hm-flt="todos"') + kpiCell('bad', cnt.altas, 'Alertas altas', 'data-hm-flt="altas"') + kpiCell('', cnt.combustible || 0, 'Combustible', 'data-hm-flt="combustible"') + kpiCell('', cnt.energia || 0, 'Corte de energía', 'data-hm-flt="energia"') + kpiCell('', cnt.geocerca || 0, 'Lotes', 'data-hm-flt="geocerca"') + '</div>' +
      '<div class="row">' +
        '<div class="column column-2-parts styled-href-blue">' + colHead('Eventos recientes', 'Alertas y avisos de tus tractores') + filters + (rows || emptyBox('Sin eventos', 'No hay eventos para este filtro.')) + more + '</div>' +
        '<div class="column column-right styled-href-blue">' + colHead('Resumen', 'Por tipo de evento') + summary + '<div style="margin-top:1.5em">' + colHead('Más alertas', 'Tractores con más alertas altas') + '</div>' + top + '</div>' +
      '</div>';
  }
  function statusLabel(id) { return STATUS_LBL[statusOf(id)] || ''; }

  /* --- Reportes --- */
  function buildReportes() {
    var w = P().w, devs = devList(), st = { running: 0, idle: 0, nosignal: 0 };
    devs.forEach(function (d) { st[statusOf(d.id)] = (st[statusOf(d.id)] || 0) + 1; });
    var withH = devs.map(function (d) { return { d: d, h: hoursOf(d.id) }; }).sort(function (a, b) { return b.h - a.h; });
    var totalH = withH.reduce(function (s, x) { return s + x.h; }, 0), working = withH.filter(function (x) { return x.h > 0.05; }).length, top = withH.slice(0, 10), mx = top.length ? Math.max(top[0].h, 0.1) : 1;
    var tot = devs.length || 1;
    var group = function (key) {
      var g = {}; devs.forEach(function (d) { var v = (d.attributes && d.attributes[key]) || '—'; g[v] = g[v] || { n: 0, h: 0 }; g[v].n++; g[v].h += hoursOf(d.id); });
      var ks = Object.keys(g).sort(function (a, b) { return g[b].n - g[a].n; }), m = ks.length ? g[ks[0]].n : 1;
      return '<ul class="dh-bars">' + ks.map(function (k) { return '<li><span>' + esc(k) + '</span><i><u style="width:' + (g[k].n / m * 100) + '%"></u></i><b>' + g[k].n + '</b></li>'; }).join('') + '</ul>';
    };
    var fuel = devs.map(function (d) { var p = w.positions.get(d.id); return { d: d, f: p && p.attributes ? p.attributes.fuel : null }; }).filter(function (x) { return typeof x.f === 'number'; }).sort(function (a, b) { return a.f - b.f; }).slice(0, 10);
    var table = fuel.length ? '<div class="tabular"><table><thead><tr><th>Tractor</th><th>Marca</th><th>Nivel de combustible</th><th>Estado</th></tr></thead><tbody>' + fuel.map(function (x) {
      return '<tr><td><a href="#" data-hm-event="' + x.d.id + '">' + esc(x.d.name) + '</a></td><td>' + esc((x.d.attributes && x.d.attributes.marca) || '—') + '</td><td>' + fmt(x.f) + '</td><td>' + statusLabel(x.d.id) + '</td></tr>';
    }).join('') + '</tbody></table></div>' : emptyBox('Sin lecturas de combustible', 'Ningún tractor reporta nivel de combustible por ahora.');
    return splash('Reportes') +
      '<div class="row">' + kpiCell('', fmt(totalH, 1) + ' h', 'Horas motor hoy', '') + kpiCell('ok', working + ' de ' + devs.length, 'Tractores trabajando', '') + kpiCell('', fmt(working ? totalH / working : 0, 1) + ' h', 'Promedio', '') + kpiCell('', st.running, 'En marcha', '') + kpiCell('bad', st.nosignal, 'Sin señal', '') + '</div>' +
      '<div class="row">' +
        '<div class="column column-left">' + colHead('Horas de motor', 'Los 10 tractores con más horas hoy') +
          (top.length ? '<ul class="dh-bars dh-bars-lg">' + top.map(function (x) { return '<li><span><a href="#" data-hm-event="' + x.d.id + '">' + esc(x.d.name) + '</a></span><i><u style="width:' + (x.h / mx * 100) + '%"></u></i><b>' + fmt(x.h, 1) + ' h</b></li>'; }).join('') + '</ul>' : emptyBox('Sin datos', 'No hay horas de motor registradas hoy.')) + '</div>' +
        '<div class="column column-right">' + colHead('La flota', 'Estado, nivel y marca') +
          '<div class="dh-stack" role="img" aria-label="Estado de la flota"><i class="ok" style="width:' + st.running / tot * 100 + '%"></i><i class="idle" style="width:' + st.idle / tot * 100 + '%"></i><i class="bad" style="width:' + st.nosignal / tot * 100 + '%"></i></div>' +
          '<p class="dh-note">En marcha ' + st.running + ' · Apagados ' + st.idle + ' · Sin señal ' + st.nosignal + '</p>' +
          '<h3>Por nivel</h3>' + group('nivel') + '<h3>Por marca</h3>' + group('marca') + '</div>' +
      '</div><hr>' +
      '<div class="row"><div class="column">' + colHead('Combustible', 'Los 10 tractores con menor nivel') + table + '</div></div>' +
      '<div class="row">' +
        '<div class="column column-left">' + item('list', 'data-hm-go="reports"', 'Reportes detallados', 'Recorridos, eventos y resúmenes por rango de fechas') + '</div>' +
        '<div class="column column-right">' + item('fuel', 'data-hm-go="stats"', 'Combustible y velocidad', 'Consumo, cargas, descargas y velocidad') + '</div>' +
      '</div>';
  }

  /* --- Cambio de página y renderizado --- */
  function setPage(p) {
    if (!PAGE_TITLE[p]) p = 'inicio';
    state.page = p;
    var c = $('#dh-content', view);
    c.innerHTML = p === 'inicio' ? buildInicio() : p === 'lotes' ? buildLotes() : p === 'alertas' ? buildAlertas() : buildReportes();
    document.querySelectorAll('#dh-navbar a[data-hm-page]').forEach(function (a) { a.removeAttribute('aria-current'); if (a.dataset.hmPage === p) a.setAttribute('aria-current', 'page'); });
    var cr = $('#dh-crumb', view);
    if (cr) cr.innerHTML = p === 'inicio' ? 'Inicio' : '<a href="#" data-hm-page="inicio">Inicio</a> / ' + PAGE_TITLE[p];
    view.scrollTop = 0;
    if (p === 'inicio') { renderKpis(); renderFleet(); renderWeather(); loadNews(false); }
  }
  // Refresca los datos en vivo de la página visible (sin perder filtros ni selección).
  function refreshPage() {
    if (!state.visible) return;
    if (state.page === 'inicio') { renderFleet(); return; }
    var top = view.scrollTop;
    $('#dh-content', view).innerHTML = state.page === 'lotes' ? buildLotes() : state.page === 'alertas' ? buildAlertas() : buildReportes();
    view.scrollTop = top;
  }
  function openDevice(id) {
    hide(); railClick('fleet');
    setTimeout(function () { try { P().mapApi.focusDevice(id); } catch (e) { /* sin mapa */ } }, 120);
  }

