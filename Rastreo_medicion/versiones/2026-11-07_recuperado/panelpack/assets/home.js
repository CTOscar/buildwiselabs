/*perfil*/
/*frames*/
/*jquery*/
/*combustible-frame*/
/*side-tools*/
/*hero*/
/*tools-nav*/
/*mapa-frame*/
/* panelpack · Inicio — réplica del frontend de www.debian.org (index.es.html):
 * #header (logo + búsqueda + navbar + migas), #splash, filas de 2 columnas con carrusel,
 * bloque "sistema operativo" con botón, filas con ícono, noticias con fecha tipo calendario y pie.
 * Datos: Open-Meteo (clima), Google News vía rss2json (noticias), window.__pf (flota). */
(function () {
  'use strict';
  var jq = window.jQuery; // jQuery 3.x (assets/jquery.min.js)
  // Requisitos de contraseña del registro de clientes (login)
  var PW = [/.{8,}/, /[A-ZÑ]/, /[a-zñ]/, /\d/, /[^A-Za-z0-9ñÑ\s]/];
  window.__pwOk = function (p) { return PW.every(function (r) { return r.test(p); }); };
  window.__pwReq = function (f) {
    var p = f.password.value;
    f.querySelectorAll('#pw-req li').forEach(function (li, i) { var ok = PW[i].test(p); li.querySelector('span').textContent = ok ? '✓ ' : '○ '; li.style.color = ok ? '#1a7a3a' : ''; });
  };
  var TZ = 'America/Mazatlan';
  // Earth (earth.nullschool.net): su estado vive en el hash de la URL; se cambia desde botones propios (solo visualización).
  var EARTH_BASE = 'https://earth.nullschool.net/es/#current/';
  var EARTH_LAYERS = [
    ['wind', 'Viento', 'wind/surface/level'], ['temp', 'Temperatura', 'wind/surface/level/overlay=temp'], ['hum', 'Humedad', 'wind/surface/level/overlay=relative_humidity'],
    ['rain', 'Lluvia', 'wind/surface/level/overlay=precip_3hr'], ['cloud', 'Nubes', 'wind/surface/level/overlay=total_cloud_water'], ['tpw', 'Vapor de agua', 'wind/surface/level/overlay=total_precipitable_water'],
    ['cur', 'Corrientes', 'ocean/surface/currents'], ['sst', 'Temp. del mar', 'ocean/surface/currents/overlay=sea_surface_temp'], ['ssta', 'Anomalía del mar', 'ocean/surface/currents/overlay=sea_surface_temp_anomaly'],
    ['bleach', 'Blanqueamiento', 'ocean/surface/level/overlay=bleaching_alert_area'], ['wave', 'Oleaje', 'ocean/primary/waves/overlay=significant_wave_height'],
  ];
  var EARTH_VIEWS = [['rosario', 'El Rosario', -105.9012, 22.73834, 5000], ['pacifico', 'Pacífico mexicano', -106, 21, 2600], ['mexico', 'México', -102, 23, 1700], ['mundo', 'Mundo', -103.33, 20.58, 450]];
  var earth = { layer: 'bleach', view: 'pacifico', proj: 'orthographic', on: false };
  function earthUrl() {
    var L = EARTH_LAYERS.filter(function (x) { return x[0] === earth.layer; })[0], V = EARTH_VIEWS.filter(function (x) { return x[0] === earth.view; })[0];
    return EARTH_BASE + L[2] + '/' + earth.proj + '=' + V[2] + ',' + V[3] + ',' + V[4] + '/loc=-105.9012,22.73834';
  }
  var EARTH_URL = earthUrl();
  function earthCtl() {
    var pipe = function (list, cur, attr) { return list.map(function (x) { return '<a href="#" ' + attr + '="' + x[0] + '"' + (x[0] === cur ? ' aria-current="true"' : '') + '>' + x[1] + '</a>'; }).join('|'); };
    return '<p class="dh-topics">Capa: ' + pipe(EARTH_LAYERS, earth.layer, 'data-earth-l') + '</p>' +
      '<p class="dh-topics">Vista: ' + pipe(EARTH_VIEWS, earth.view, 'data-earth-v') + '|' + pipe([['orthographic', 'Globo'], ['equirectangular', 'Plano']], earth.proj, 'data-earth-p') + '</p>';
  }
  function earthFrame(eb) { eb.innerHTML = '<span class="dh-earth-wait">Cargando mapa…</span><iframe src="' + earthUrl() + '" title="Earth · corrientes del océano y alerta de blanqueamiento" loading="lazy" referrerpolicy="no-referrer" allow="fullscreen"></iframe>'; }
  function earthRender() {
    var box = document.getElementById('dh-earthctl'); if (box) box.innerHTML = earthCtl();
    var a = document.getElementById('dh-earthlink'); if (a) a.href = earthUrl();
    var eb = document.getElementById('dh-earth'); if (eb && eb.querySelector('iframe')) earthFrame(eb); // Earth no reacciona a cambios de hash dentro del iframe: se recarga con el nuevo estado
  }
  var DEFAULT_LL = [22.73834, -105.9012];
  var TOPICS = [
    { id: 'agro', label: 'Agro Sinaloa', q: 'agricultura Sinaloa' },
    { id: 'clima', label: 'Clima', q: 'pronóstico clima Sinaloa' },
    { id: 'maq', label: 'Maquinaria', q: 'maquinaria agrícola tractores México' },
  ];
  var WMO = {
    0: ['Despejado', '☀️'], 1: ['Mayormente despejado', '🌤️'], 2: ['Parcialmente nublado', '⛅'], 3: ['Nublado', '☁️'],
    45: ['Niebla', '🌫️'], 48: ['Niebla con escarcha', '🌫️'], 51: ['Llovizna ligera', '🌦️'], 53: ['Llovizna', '🌦️'], 55: ['Llovizna densa', '🌦️'],
    56: ['Llovizna helada', '🌦️'], 57: ['Llovizna helada', '🌦️'], 61: ['Lluvia ligera', '🌧️'], 63: ['Lluvia', '🌧️'], 65: ['Lluvia fuerte', '🌧️'],
    66: ['Lluvia helada', '🌧️'], 67: ['Lluvia helada', '🌧️'], 71: ['Nieve ligera', '❄️'], 73: ['Nieve', '❄️'], 75: ['Nieve fuerte', '❄️'], 77: ['Granizo fino', '❄️'],
    80: ['Chubascos ligeros', '🌦️'], 81: ['Chubascos', '🌧️'], 82: ['Chubascos fuertes', '🌧️'], 85: ['Chubascos de nieve', '❄️'], 86: ['Chubascos de nieve', '❄️'],
    95: ['Tormenta eléctrica', '⛈️'], 96: ['Tormenta con granizo', '⛈️'], 99: ['Tormenta con granizo', '⛈️'],
  };
  // Íconos sólidos de 60 px (mismo estilo que los de debian.org: glifos negros)
  var ICON = {
    map: '<path d="M12 2a7.5 7.5 0 0 0-7.5 7.5C4.5 15 12 22 12 22s7.5-7 7.5-12.5A7.5 7.5 0 0 0 12 2zm0 10.2a2.7 2.7 0 1 1 0-5.4 2.7 2.7 0 0 1 0 5.4z"/>',
    lotes: '<path d="M12 2 3 7.2v9.6L12 22l9-5.2V7.2zm0 3.1 5.6 3.2v6.4L12 17.9l-5.6-3.2V8.3z"/>',
    bell: '<path d="M12 22a2.5 2.5 0 0 0 2.5-2.5h-5A2.5 2.5 0 0 0 12 22zm7-6V11a7 7 0 0 0-5.5-6.8V3.5a1.5 1.5 0 0 0-3 0v.7A7 7 0 0 0 5 11v5l-2 2v1h18v-1z"/>',
    list: '<path d="M3 5h3v3H3zm5 .5h13v2H8zM3 10.5h3v3H3zm5 .5h13v2H8zM3 16h3v3H3zm5 .5h13v2H8z"/>',
    cloud: '<path d="M7 19a5 5 0 0 1-.7-9.95A6.5 6.5 0 0 1 19 9.5 4.75 4.75 0 0 1 18 19z"/>',
    rain: '<path d="M7 14a5 5 0 0 1-.7-9.95A6.5 6.5 0 0 1 19 4.5 4.75 4.75 0 0 1 18 14zM8.5 16l-1.5 4h2l1.5-4zm4.5 0-1.5 4h2l1.5-4zm4.5 0L16 20h2l1.5-4z"/>',
    fuel: '<path d="M4 21V4a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v17H4zm2-11h6V5H6zm9-1h2l2 2v6a1 1 0 0 0 2 0V9l-3-3-1.4 1.4L17 8.8V9h-2z"/>',
    sim: '<path d="M22.7 19 13.6 9.9a5.5 5.5 0 0 0-1.3-5.9 5.4 5.4 0 0 0-5.4-1.3l3.2 3.2-2.2 2.2L4.7 4.9a5.4 5.4 0 0 0 1.3 5.4 5.5 5.5 0 0 0 5.9 1.3l9.1 9.1a1 1 0 0 0 1.4 0l.3-.3a1 1 0 0 0 0-1.4z"/>',
  };
  var svg = function (k) { return '<svg viewBox="0 0 24 24" fill="#000" aria-hidden="true">' + ICON[k] + '</svg>'; };

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var wmo = function (code, day) { var x = WMO[code] || ['—', '🌡️']; return day === 0 && (code === 0 || code === 1) ? [x[0], '🌙'] : x; };
  var DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
  var dir = function (d) { return DIRS[Math.round(((d % 360) / 45)) % 8]; };
  var fmt = function (n, d) { return n == null || isNaN(n) ? '—' : Number(n).toFixed(d == null ? 0 : d); };
  var wd = function (iso, long) { return new Date(iso + 'T12:00:00').toLocaleDateString('es-MX', { weekday: long ? 'long' : 'short' }).replace('.', ''); };
  function ago(ms) {
    var m = Math.max(0, Math.round((Date.now() - ms) / 60000));
    if (m < 1) return 'ahora'; if (m < 60) return 'hace ' + m + ' min';
    var h = Math.round(m / 60); if (h < 24) return 'hace ' + h + ' h';
    return 'hace ' + Math.round(h / 24) + ' d';
  }

  // WordPress sirve miniaturas (-150x150, -300x200...): se pide la imagen original para que no se vea pixelada.
  var hiRes = function (u) { return u ? String(u).replace(/-\d{2,4}x\d{2,4}(\.(?:jpe?g|png|webp))(\?.*)?$/i, '$1$2') : u; };
  var state = { weather: null, wAt: 0, wErr: false, news: {}, topic: 'agro', visible: false, ll: DEFAULT_LL, page: 'inicio', lote: null, alFilter: 'todos', alLimit: 15 };
  var root, view;

  /* ---------- estructura: misma jerarquía de index.es.html ---------- */
  function item(ic, go, title, text) {
    return '<div class="row"><div class="community column"><a href="#" ' + go + ' aria-hidden="true">' + svg(ic) + '</a></div>' +
      '<div class="styled-href-blue column-4-parts"><h2><a href="#" ' + go + '>' + title + '</a></h2><p>' + text + '</p></div></div>';
  }
  function slide(title, id) {
    return '<article><div class="info top-left"><h3>' + title + '</h3></div><div class="slide" id="' + id + '"><p class="dh-empty">Cargando…</p></div></article>';
  }
  function build() {
    view = document.createElement('section');
    view.id = 'home-view'; view.hidden = true; view.setAttribute('aria-label', 'Inicio');
    view.innerHTML =
      '<div id="dh-header">' +
        '<div id="dh-upperheader">' +
                    '<div id="dh-searchbox"><form id="dh-search" name="p"><p><input name="P" value="" size="14" aria-label="Buscar tractor, IMEI o lote"> <input type="submit" value="Búsqueda"></p></form></div>' +
        '</div>' +
        '<div id="dh-navbar"><p class="hidecss"><a href="#dh-content">Omitir navegación rápida</a></p><ul>' +
          '<li class="dh-tools"><a href="#" id="dh-toolsbtn" aria-haspopup="true" aria-expanded="false" title="Tools">Tools &#9662;</a></li>' +
          '<li><a href="#" data-hm-page="mapa" title="Mapa de la flota">Mapa</a></li>' +
          '<li><a href="#" data-hm-page="lotes" title="Lotes y geocercas">Lotes</a></li>' +
          '<li><a href="#" data-hm-page="alertas" title="Alertas de la flota">Alertas</a></li>' +
          '<li><a href="#" data-hm-page="reportes" title="Reportes de horas y recorridos">Reportes</a></li>' +
          '<li><a href="#" data-hm-page="combustible" title="Combustible y velocidad">Combustible</a></li>' +
          '<li><a href="#" data-hm-page="simulador" title="Simulador de instalación">Simulador</a></li>' +
          '<li><a href="#" data-hm-page="vista3d" title="Tractor en 3D">Vista 3D</a></li>' +
          '<li><a href="#" data-hm-page="estado" title="Estado del servicio">Status</a></li>' +
        '</ul></div>' +
        '<p id="dh-breadcrumbs"><span id="dh-crumb">Inicio</span><span id="hm-clock">En vivo</span></p>' +
      '</div>' +
      '<div id="dh-mapsplash"><h1>Data Center</h1></div><div id="dh-mapspacer"></div>' +
      '<section id="dh-content"></section>' +
      '<footer id="dh-footer"><hr class="hidecss">' +
        '<div id="dh-pageLang"><div id="dh-langSelector">Esta pantalla también está disponible en los siguientes temas de color:' +
          '<div id="dh-langContainer"><select id="dh-theme" aria-label="Elija su tema"><option value="" disabled>Elija su tema</option><option value="blanco">Blanco</option><option value="verde">Verde</option><option value="negro">Negro</option></select></div>' +
        '</div></div><hr>' +
        '<div id="dh-fineprint"><p>Si desea comunicarse con nosotros, visite <a href="https://buildwiselabs.net" target="_blank" rel="noopener">buildwiselabs.net</a>. ' +
          'Clima: <a href="https://open-meteo.com" target="_blank" rel="noopener">Open-Meteo</a> · Noticias: Google Noticias.</p>' +
          '<p>Datos actualizados: <span id="dh-upd">—</span><br>Copyright © 2026 Agrícola Las Cabras · Hecho por <a href="https://buildwiselabs.net" target="_blank" rel="noopener">BuildWise Labs</a></p></div>' +
      '</footer>';
    root.appendChild(view);

    var $view = jq(view), stop = function (e) { e.preventDefault(); };
    $view
      .on('click', '[data-earth-l],[data-earth-v],[data-earth-p]', function (e) {
        stop(e); var d = this.dataset;
        if (d.earthL) earth.layer = d.earthL; if (d.earthV) earth.view = d.earthV; if (d.earthP) earth.proj = d.earthP;
        var eb0 = document.getElementById('dh-earth'); earthRender(); if (eb0 && !eb0.querySelector('iframe')) earthFrame(eb0);
      })
      .on('click', '[data-hm-earth]', function (e) { stop(e); earthFrame(jq(this).closest('.dh-earth')[0]); })
      .on('click', '[data-hm-wx]', function (e) { stop(e); var we = document.getElementById(this.dataset.hmWx); if (we) we.scrollIntoView({ behavior: 'smooth', block: 'center' }); })
      .on('click', '#dh-toolsbtn', function (e) { stop(e); toggleTools(this); })
      .on('click', '[data-hm-page]', function (e) { stop(e); setPage(this.dataset.hmPage); })
      .on('click', '[data-hm-sel]', function (e) { stop(e); state.lote = Number(this.dataset.hmSel); setPage('lotes', state.page === 'lotes'); })
      .on('click', '[data-hm-flt]', function (e) { stop(e); state.alFilter = this.dataset.hmFlt; state.alLimit = 15; setPage('alertas', state.page === 'alertas'); })
      .on('click', '[data-hm-more]', function (e) { stop(e); state.alLimit += 15; refreshPage(); })
      .on('click', '[data-hm-event]', function (e) { stop(e); openDevice(Number(this.dataset.hmEvent)); })
      .on('click', '[data-hm-map]', function (e) { stop(e); openLote(Number(this.dataset.hmMap)); })
      .on('click', '[data-hm-go]', function (e) { stop(e); nav(this.dataset.hmGo); })
      .on('click', '[data-gs-i]', function (e) { stop(e); gsGo(gsFlat[Number(this.dataset.gsI)]); })
      .on('click', '[data-gs-jump]', function (e) { stop(e); var ge = document.getElementById(this.dataset.gsJump); if (ge) ge.scrollIntoView({ behavior: 'smooth', block: 'start' }); })
      .on('click', '[data-hm-slide]', function (e) { stop(e); var r = $('#dh-s' + this.dataset.hmSlide, view); if (r) { r.checked = true; $('.wrapper', view).scrollIntoView({ behavior: 'smooth', block: 'center' }); } })
      .on('click', '[data-hm-lote]', function () { state.lote = Number(this.dataset.hmLote); setPage('lotes'); })
      .on('click', '[data-nw-cat]', function (e) { stop(e); state.topic = this.dataset.nwCat; loadNews(); })
      .on('click', '[data-hm-refresh]', function () { loadWeather(true); loadNews(true); })
      // Búsqueda del marco (oculta) y selector de tema
      .on('submit', '#dh-search', function (e) {
        stop(e);
        var q = this.P.value.trim(), inp = document.querySelector('#search-form input');
        show('mapa');
        if (inp) { inp.value = q; inp.dispatchEvent(new Event('input', { bubbles: true })); inp.focus(); }
      })
      .on('change', '#dh-theme', function () { var b = document.querySelector('[data-theme-btn="' + this.value + '"]'); if (b) b.click(); });
  }

  function buildInicio() {
    var radios = '', dots = '', arrows = '';
    for (var i = 1; i <= 5; i++) {
      radios += '<input ' + (i === 1 ? 'checked="" ' : '') + 'type="radio" name="dh-slider" id="dh-s' + i + '">';
      dots += '<label for="dh-s' + i + '"></label>'; arrows += '<label for="dh-s' + i + '"></label>';
    }
    return       '<div id="dh-splash" class="dh-hero"><div class="hero-bg"></div><div class="hero-shade"></div><div class="hero-stage"><div class="hero-card"><img src="/brand/las-cabras-logo-hd.webp" alt="Las Cabras Sinaloa · panelpack" draggable="false"><span class="hero-glare"></span></div></div></div>' +
      '<div class="row" id="dh-kpis"></div>' +
      '<div class="row">' +
        '<div class="column column-left"><div style="text-align:center"><h1>La flota</h1><h2>¡Tus tractores, en tiempo real!</h2>' +
          '<div class="wrapper">' + radios +
            '<div class="slider-wrapper"><div class="inner">' +
              slide('Equipo activo', 'dh-equip') + slide('Pronóstico · próximos 7 días', 'dh-fc') + slide('Precipitación', 'dh-rain') +
              slide('Alertas altas', 'dh-alerts') + slide('Resumen del trabajo diario', 'dh-work') +
            '</div></div>' +
            '<div class="slider-prev-next-control">' + arrows + '</div><div class="slider-dot-control">' + dots + '</div>' +
          '</div></div>' +
          item('map', 'data-hm-go="fleet"', 'Mapa de la flota', 'Ubicación y estado en tiempo real') +
          item('lotes', 'data-hm-page="lotes"', 'Lotes', 'Geocercas y tractores por lote') +
          item('bell', 'data-hm-page="alertas"', 'Alertas', 'Combustible, energía y eventos') +
          item('list', 'data-hm-page="reportes"', 'Más...', 'Reportes de horas, recorridos y combustible') +
        '</div>' +
        '<div class="column column-right"><div style="text-align:center"><h1>El campo</h1><h2>¡Clima y condiciones de trabajo, en vivo!</h2>' +
          '<div class="os-img-container"><div class="os-img" id="dh-now"><p class="dh-empty">Cargando…</p></div>' +
            '<a href="#" data-hm-go="fleet" class="os-dl-btn">Ver mapa</a><a href="#" data-hm-page="reportes" class="os-other-download">Otros reportes</a></div>' +
          '<h3>Océano, clima y corrientes</h3><div id="dh-earthctl">' + earthCtl() + '</div>' +
          '<div class="dh-earth" id="dh-earth"><img src="/brand/earth-poster.jpg" alt="Corrientes y alerta de blanqueamiento en el Pacífico mexicano" loading="lazy"><button type="button" class="dh-earth-btn" data-hm-earth>&#9654; Activar mapa interactivo</button></div>' +
          '<p class="dh-note">Visualización de viento, clima y océano · <a id="dh-earthlink" href="' + earthUrl() + '" target="_blank" rel="noopener">earth.nullschool.net</a></p></div>' +
          item('cloud', 'data-hm-slide="2"', 'Pronóstico', 'Próximos 7 días y probabilidad de lluvia') +
          item('rain', 'data-hm-slide="3"', 'Precipitación', 'Registrada y esperada por día') +
          item('fuel', 'data-hm-go="stats"', 'Combustible y velocidad', 'Consumo, cargas y descargas') +
          item('sim', 'data-hm-go="sim"', 'Más...', 'Simulador de instalación del rastreador') +
        '</div>' +
      '</div>' +
      '<hr>' +
      '<div class="nw-wrap"><div id="dh-news" class="nw"><p class="dh-empty">Cargando noticias…</p></div></div>' +
      '<div class="row">' +
        '<div class="column styled-href-blue column-left"><div style="text-align:center"><h1>Alertas recientes</h1><h2>Eventos altos de tus tractores</h2></div><div id="dh-alerts2"></div></div>' +
        '<div class="column styled-href-blue column-right"><div style="text-align:center"><h1>Tus lotes</h1><h2>Tractores dentro de cada lote</h2></div><div id="dh-lotes"></div></div>' +
      '</div>' + +
      '<div class="clr"></div>';
  }

  /* ---------- páginas con componente propio (misma arquitectura de Debian) ----------
   * Cada enlace de la navbar renderiza su componente dentro de #dh-content:
   *   inicio · lotes · alertas · reportes. Mapa, Simulador y Vista 3D abren sus vistas de la app. */
  var PAGE_TITLE = { inicio: 'Inicio', mapa: 'Data Center', lotes: 'Lotes', alertas: 'Alertas', reportes: 'Reportes', buscar: 'Búsqueda', combustible: 'Combustible y velocidad', simulador: 'Simulador de instalación', vista3d: 'Vista 3D', estado: 'Status' };
  // Páginas que viven dentro del marco Debian y dejan visible una vista de la app (rail = vista de la app).
  var FRAMES = { mapa: { t: 'Data Center' }, combustible: { rail: 'stats', t: 'Combustible y velocidad' }, simulador: { rail: 'sim', t: 'Simulador de instalación' }, vista3d: { rail: '3d', t: 'Vista 3D' } };
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
  // Malla del lote: vértices, perímetro (m) y centro, a partir del WKT de Traccar ("lat lon").
  function geoMesh(g) {
    var a = g.area || '', m = a.match(/POLYGON\s*\(\((.+)\)\)/i), c = a.match(/CIRCLE\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*,\s*([\d.]+)\s*\)/i);
    if (m) {
      var pts = m[1].split(',').map(function (t) { return t.trim().split(/\s+/).map(Number); }).filter(function (p) { return p.length >= 2 && isFinite(p[0]) && isFinite(p[1]); });
      if (pts.length > 1 && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1]) pts.pop();
      if (pts.length < 3) return null;
      var la = pts.reduce(function (s, p) { return s + p[0]; }, 0) / pts.length, lo = pts.reduce(function (s, p) { return s + p[1]; }, 0) / pts.length;
      var xy = pts.map(function (p) { return [p[1] * 111320 * Math.cos(la * Math.PI / 180), p[0] * 110540]; }), per = 0;
      xy.forEach(function (p, i) { var q = xy[(i + 1) % xy.length]; per += Math.hypot(q[0] - p[0], q[1] - p[1]); });
      return { kind: 'Polígono', pts: pts, per: per, c: [la, lo] };
    }
    if (c) return { kind: 'Círculo', pts: [], per: 2 * Math.PI * +c[3], c: [+c[1], +c[2]], r: +c[3] };
    return null;
  }
  function loteStats() {
    var w = P().w, pos = [...w.positions.values()];
    return (w.geofences || []).map(function (g) {
      var ids = pos.filter(function (p) { return (p.geofenceIds || []).indexOf(g.id) >= 0; }).map(function (p) { return p.deviceId; });
      return { g: g, ids: ids, n: ids.length, run: ids.filter(function (id) { return statusOf(id) === 'running'; }).length, hours: ids.reduce(function (s, id) { return s + hoursOf(id); }, 0), ha: geoArea(g) };
    });
  }

  /* --- Lotes --- */
  function meshHtml(sel) {
    var g = sel.g, at = g.attributes || {}, mesh = geoMesh(g), m = function (l, v) { return '<div class="dh-m"><small>' + l + '</small><b>' + v + '</b></div>'; };
    var h = '<h3 style="margin:1.2em 0 .4em">Malla del lote</h3><div class="dh-metrics">' +
      m('Cultivo', at.cultivo ? esc(at.cultivo) : '—') + m('Etapa', at.etapa ? esc(at.etapa) : '—') + m('Responsable', at.responsable ? esc(at.responsable) : '—') + m('Superficie registrada', at.superficie ? esc(at.superficie) + ' ha' : '—') + m('Superficie de la malla', fmt(sel.ha, 2) + ' ha') + m('Hectáreas por tractor', sel.n ? fmt((+at.superficie || sel.ha) / sel.n, 1) + ' ha' : '—') + m('Horas máx. por tractor', at.horasMax ? esc(at.horasMax) + ' h' : 'Sin límite') + m('Alertas de lote', [at.alertaEntrada && 'entrada', at.alertaSalida && 'salida'].filter(Boolean).join(' y ') || 'Ninguna');
    if (mesh) h += m('Tipo', mesh.kind) + m('Perímetro', fmt(mesh.per, 0) + ' m') + (mesh.pts.length ? m('Vértices', mesh.pts.length) : m('Radio', fmt(mesh.r, 0) + ' m')) + m('Centro', mesh.c[0].toFixed(5) + ', ' + mesh.c[1].toFixed(5));
    h += '</div>';
    if (!mesh) return h + '<p class="dh-note">Este lote no tiene una malla (polígono) dibujada.</p>';
    if (mesh.pts.length) h += '<details style="margin-top:8px"><summary>Ver vértices de la malla</summary><ol class="dh-note" style="font-family:monospace;padding-left:2em">' + mesh.pts.map(function (p) { return '<li>' + p[0].toFixed(5) + ', ' + p[1].toFixed(5) + '</li>'; }).join('') + '</ol></details>';
    return h;
  }
  function logHtml(sel) {
    var w = P().w, ids = {}; sel.ids.forEach(function (id) { ids[id] = 1; });
    var ev = (w.events || []).filter(function (e) { return e.geofenceId === sel.g.id || ids[e.deviceId]; })
      .map(function (e) { return { e: e, i: evInfo(e), at: new Date(e.eventTime).getTime() }; }).sort(function (a, b) { return b.at - a.at; }).slice(0, 15);
    var h = '<h3 style="margin:1.2em 0 .4em">Registros del lote</h3>';
    if (!ev.length) return h + emptyBox('Sin registros recientes', 'No hay eventos de este lote ni de sus tractores.');
    return h + '<ul class="dh-list">' + ev.map(function (x) {
      return '<li><span class="dh-dot ' + (x.i.high ? 'crit' : '') + '"></span><div><b><a href="#" data-hm-event="' + x.e.deviceId + '">' + esc(devName(x.e.deviceId)) + ' — ' + esc(x.i.label) + '</a></b><small>' +
        new Date(x.at).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }) + ' · ' + ago(x.at) + '</small></div></li>';
    }).join('') + '</ul>';
  }
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
        }).join('') + '</ul>' : emptyBox('Sin tractores en este lote', 'Ahora mismo ningún tractor reporta posición dentro del lote.')) + meshHtml(sel) + logHtml(sel) + '</div>' +
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
      return '<div class="project-news' + (state.alFocus === x.e.id ? ' dh-hit' : '') + '" id="al-' + x.e.id + '">' + calBox(x.at) + '<div class="project-news-content"><a href="#" data-hm-event="' + x.e.deviceId + '">' + esc(devName(x.e.deviceId)) + ' — ' + esc(x.i.label) + '</a><small>' +
        new Date(x.at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false }) + ' · ' + ago(x.at) + lote + (x.i.high ? ' · <b style="color:#c70036">alta</b>' : '') + '</small></div></div>';
    }).join('');
    var more = shown.length > lim ? '<div class="project-news"><div class="end-of-list-arrow"></div><div class="project-news-content project-news-content-end"><a href="#" data-hm-more="1">Mostrar más (' + (shown.length - lim) + ')</a></div></div>' : '';
    var byType = {}; ev.forEach(function (x) { byType[x.i.label] = (byType[x.i.label] || 0) + 1; });
    var types = Object.keys(byType).sort(function (a, b) { return byType[b] - byType[a]; }), mx = types.length ? byType[types[0]] : 1;
    var byDev = {}; ev.forEach(function (x) { if (x.i.high) byDev[x.e.deviceId] = (byDev[x.e.deviceId] || 0) + 1; });
    var worst = Object.keys(byDev).map(Number).sort(function (a, b) { return byDev[b] - byDev[a]; }).slice(0, 6);
    var summary = '<ul class="dh-bars">' + types.map(function (t) { return '<li><span>' + esc(t) + '</span><i><u style="width:' + (byType[t] / mx * 100) + '%"></u></i><b>' + byType[t] + '</b></li>'; }).join('') + '</ul>';
    var top = worst.length ? '<ul class="dh-list">' + worst.map(function (id) { return '<li><span class="dh-dot crit"></span><div><b><a href="#" data-hm-event="' + id + '">' + esc(devName(id)) + '</a></b><small>' + statusLabel(id) + '</small></div><em>' + byDev[id] + (byDev[id] === 1 ? ' alerta' : ' alertas') + '</em></li>'; }).join('') + '</ul>' : emptyBox('Sin alertas altas', 'Ningún tractor tiene alertas altas recientes.');
    return splash('Alertas') +
      '<div class="row">' + kpiCell('', cnt.todos, 'Eventos', 'data-hm-flt="todos"') + kpiCell('bad', cnt.altas, 'Alertas altas', 'data-hm-flt="altas"') + kpiCell('', cnt.combustible || 0, 'Combustible', 'data-hm-flt="combustible"') + kpiCell('', cnt.energia || 0, 'Corte de energía', 'data-hm-flt="energia"') + kpiCell('', cnt.geocerca || 0, 'Eventos de lote', 'data-hm-flt="geocerca"') + '</div>' +
      '<div class="row">' +
        '<div class="column column-2-parts styled-href-blue">' + colHead('Eventos recientes', 'Alertas y avisos de tus tractores') + filters + (rows || emptyBox('Sin eventos', 'No hay eventos para este filtro.')) + more + '</div>' +
        '<div class="column column-right styled-href-blue">' + colHead('Resumen', 'Por tipo de evento') + summary + '<div style="margin-top:1.5em">' + colHead('Más alertas', 'Tractores con más alertas altas') + '</div>' + top + '</div>' +
      '</div>';
  }
  /* --- Búsqueda global: tractores, IMEI, etiquetas, lotes, combustible, alertas, reportes, pronóstico, noticias --- */
  var norm = function (s) { return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); };
  var GS_PAGES = [
    { t: 'Inicio', s: 'Clima, pronóstico, noticias y resumen de la flota', k: 'inicio portada resumen clima noticias', go: ['page', 'inicio'] },
    { t: 'Mapa de la flota', s: 'Ubicación en vivo de los tractores', k: 'mapa flota tractores ubicacion gps posicion', go: ['page', 'mapa'] },
    { t: 'Lotes', s: 'Geocercas, superficie y tractores por lote', k: 'lotes geocercas ranchos superficie hectareas', go: ['page', 'lotes'] },
    { t: 'Alertas', s: 'Eventos y avisos de tus tractores', k: 'alertas eventos avisos notificaciones', go: ['page', 'alertas'] },
    { t: 'Reportes', s: 'Horas de motor, utilización y combustible', k: 'reportes reporte horas motor utilizacion promedio informe', go: ['page', 'reportes'] },
    { t: 'Reportes detallados', s: 'Recorridos, eventos y resúmenes por rango de fechas', k: 'reportes reporte recorridos eventos resumenes rango fechas informe detallado', go: ['nav', 'reports'] },
    { t: 'Combustible y velocidad', s: 'Consumo, cargas, descargas y velocidad', k: 'combustible velocidad consumo cargas descargas diesel litros', go: ['nav', 'stats'] },
    { t: 'Simulador de instalación', s: 'Prueba de instalación del dispositivo', k: 'simulador instalacion dispositivo gps', go: ['nav', 'sim'] },
    { t: 'Vista 3D', s: 'Tractor en 3D', k: 'vista 3d tractor modelo', go: ['nav', '3d'] },
    { t: 'Status', s: 'Estado del servicio, incidentes y mantenimiento programado', k: 'status estado servicio incidentes mantenimiento disponibilidad uptime soporte', go: ['page', 'estado'] },
    { t: 'Ajustes de mapa', s: 'Capas y opciones del mapa', k: 'ajustes configuracion mapa capas opciones', go: ['settings'] },
    { t: 'Enlaces del proyecto', s: 'Accesos directos', k: 'enlaces links proyecto accesos', go: ['links'] },
  ];
  var gsFlat = [], gsSel = -1, gsBox = null, gsQ = null, GS_CAP = 60;
  function gsRun(q) {
    var toks = norm(q).split(/\s+/).filter(Boolean), groups = [];
    if (!toks.length) return groups;
    var ok = function (hay) { hay = ' ' + hay; for (var i = 0; i < toks.length; i++) { var tk = toks[i]; if (tk.length < 3 ? hay.indexOf(' ' + tk) < 0 : hay.indexOf(tk) < 0) return false; } return true; };
    var w = P().w, fences = {}; (w.geofences || []).forEach(function (g) { fences[g.id] = g.name; });
    var devs = devList();
    var add = function (key, label, items) { if (items.length) groups.push({ key: key, label: label, n: items.length, items: items.slice(0, GS_CAP) }); };
    var loteOf = function (id) { var p = w.positions.get(id), gid = p && p.geofenceIds && p.geofenceIds[0]; return gid && fences[gid] ? fences[gid] : ''; };
    var fuelOf = function (id) { var p = w.positions.get(id); return p && p.attributes && typeof p.attributes.fuel === 'number' ? p.attributes.fuel : null; };
    var dot = function (st) { return st === 'running' ? 'ok' : st === 'nosignal' ? 'crit' : ''; };
    // Tractores (nombre, IMEI, marca, nivel, estado, lote, sonda)
    var tr = devs.map(function (d) {
      var st = statusOf(d.id), at = d.attributes || {}, lote = loteOf(d.id);
      var hay = norm([d.name, d.uniqueId, 'marca ' + (at.marca || ''), 'nivel ' + (at.nivel || ''), Object.keys(at).map(function (k) { return at[k]; }).join(' '), STATUS_LBL[st], lote, fuelOf(d.id) != null ? 'con sonda' : '', 'tractor horas motor imei'].join(' '));
      return { d: d, st: st, lote: lote, hay: hay, h: hoursOf(d.id) };
    }).filter(function (x) { return ok(x.hay); });
    tr.sort(function (a, b) { var A = norm(a.d.name).indexOf(toks[0]) === 0 ? 0 : 1, B = norm(b.d.name).indexOf(toks[0]) === 0 ? 0 : 1; return A - B || b.h - a.h; });
    add('tractores', 'Tractores', tr.map(function (x) { return { t: x.d.name, s: STATUS_LBL[x.st] + (x.lote ? ' · ' + x.lote : '') + ' · IMEI ' + x.d.uniqueId, e: fmt(x.h, 1) + ' h hoy', dot: dot(x.st), go: ['dev', x.d.id] }; }));
    // Lotes
    add('lotes', 'Lotes', loteStats().filter(function (x) { return ok(norm(x.g.name + ' lote geocerca rancho')); }).map(function (x) {
      return { t: x.g.name, s: x.n + ' tractor' + (x.n === 1 ? '' : 'es') + ' · ' + x.run + ' en marcha · ' + fmt(x.ha, 1) + ' ha', e: fmt(x.hours, 1) + ' h hoy', go: ['lote', x.g.id] };
    }));
    // Etiquetas (marca, nivel, sonda, estado)
    var tags = {}, tg = function (label, q) { tags[label] = tags[label] || { n: 0, q: q }; tags[label].n++; };
    devs.forEach(function (d) { var at = d.attributes || {}; if (at.marca) tg('Marca: ' + at.marca, at.marca); if (at.nivel) tg('Nivel ' + at.nivel, 'Nivel ' + at.nivel); if (fuelOf(d.id) != null) tg('Con sonda', 'con sonda'); tg('Estado: ' + STATUS_LBL[statusOf(d.id)], STATUS_LBL[statusOf(d.id)]); });
    add('etiquetas', 'Etiquetas', Object.keys(tags).filter(function (l) { return ok(norm(l + ' etiqueta')); }).map(function (l) { return { t: l, s: 'Ver los tractores con esta etiqueta', e: tags[l].n + ' tractores', go: ['q', tags[l].q] }; }));
    // Combustible (nivel por tractor + caídas)
    var fu = devs.map(function (d) { return { d: d, f: fuelOf(d.id) }; }).filter(function (x) { return x.f != null && ok(norm(x.d.name + ' combustible diesel fuel tanque sonda nivel de combustible')); }).sort(function (a, b) { return a.f - b.f; });
    var evs = (w.events || []).map(function (e) { return { e: e, i: evInfo(e), at: new Date(e.eventTime).getTime() }; }).sort(function (a, b) { return b.at - a.at; });
    var drops = evs.filter(function (x) { return x.i.k === 'combustible' && ok(norm(devName(x.e.deviceId) + ' caida baja combustible diesel fuel')); });
    add('combustible', 'Combustible', fu.map(function (x) { return { t: x.d.name + ' · nivel de combustible', s: 'Lectura de la sonda · ' + STATUS_LBL[statusOf(x.d.id)], e: fmt(x.f), dot: dot(statusOf(x.d.id)), go: ['dev', x.d.id] }; }).concat(drops.map(function (x) {
      return { t: devName(x.e.deviceId) + ' — Caída de combustible', s: new Date(x.at).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }), e: ago(x.at), dot: 'crit', go: ['alert', x.e.id] };
    })));
    // Alertas y eventos
    add('alertas', 'Alertas y eventos', evs.filter(function (x) { return ok(norm(devName(x.e.deviceId) + ' ' + x.i.label + ' ' + (x.e.geofenceId ? fences[x.e.geofenceId] || '' : '') + ' alerta evento ' + (x.i.high ? 'alta' : ''))); }).map(function (x) {
      return { t: devName(x.e.deviceId) + ' — ' + x.i.label, s: new Date(x.at).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) + (x.e.geofenceId && fences[x.e.geofenceId] ? ' · ' + fences[x.e.geofenceId] : ''), e: ago(x.at), dot: x.i.high ? 'crit' : '', go: ['alert', x.e.id] };
    }));
    // Clima, pronóstico y precipitación
    var wx = state.weather;
    if (wx && wx.daily) {
      var dy = wx.daily, T = 7, wi = [];
      for (var k = T; k < Math.min(T + 7, dy.time.length); k++) {
        var x = wmo(dy.weather_code[k], 1), lbl = (k === T ? 'Hoy' : wd(dy.time[k], true)), dt = new Date(dy.time[k] + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long' });
        if (ok(norm(lbl + ' ' + dt + ' ' + dy.time[k] + ' pronostico precipitacion lluvia clima temperatura dia ' + x[0]))) wi.push({ t: lbl.charAt(0).toUpperCase() + lbl.slice(1) + ' · ' + dt, s: x[0] + ' · ' + fmt(dy.temperature_2m_min[k]) + '° – ' + fmt(dy.temperature_2m_max[k]) + '° · probabilidad de lluvia ' + fmt(dy.precipitation_probability_max[k]) + ' %', e: fmt(dy.precipitation_sum[k], 1) + ' mm', go: ['wx', 'dh-fc'] });
      }
      var c = wx.current;
      if (c && ok(norm('clima actual ahora temperatura humedad viento sensacion ' + wmo(c.weather_code, c.is_day)[0]))) wi.unshift({ t: 'Clima actual · El Rosario, Sinaloa', s: wmo(c.weather_code, c.is_day)[0] + ' · humedad ' + fmt(c.relative_humidity_2m) + ' % · viento ' + fmt(c.wind_speed_10m) + ' km/h ' + dir(c.wind_direction_10m), e: fmt(c.temperature_2m) + ' °C', go: ['wx', 'dh-now'] });
      add('clima', 'Pronóstico y precipitación', wi);
    } else if (!state.wErr) loadWeather(false);
    // Noticias ya cargadas
    var nw = []; Object.keys(state.news).forEach(function (id) { var dd = state.news[id]; ((dd && dd.items) || []).forEach(function (n) { if (n.url && ok(norm(n.title + ' ' + (n.source || '') + ' ' + (n.summary || '') + ' noticias'))) nw.push({ t: n.title, s: n.source || 'Noticias', e: isNaN(n.publishedAt) ? '' : ago(n.publishedAt), go: ['url', n.url] }); }); });
    add('noticias', 'Noticias', nw);
    // Reportes y páginas
    add('paginas', 'Reportes y páginas', GS_PAGES.filter(function (p) { return ok(norm(p.t + ' ' + p.s + ' ' + p.k)); }).map(function (p) { return { t: p.t, s: p.s, go: p.go }; }));
    gsFlat = []; groups.forEach(function (g) { g.items.forEach(function (it) { it.i = gsFlat.length; gsFlat.push(it); }); });
    return groups;
  }
  function gsRow(it, cls) {
    return '<li><span class="dh-dot ' + (it.dot || '') + '"></span><div><b><a href="#" data-gs-i="' + it.i + '">' + esc(it.t) + '</a></b><small>' + esc(it.s || '') + '</small></div>' + (it.e ? '<em>' + esc(it.e) + '</em>' : '') + '</li>';
  }
  function buildBuscar() {
    var q = state.q || '', groups = gsRun(q), total = groups.reduce(function (s, g) { return s + g.n; }, 0);
    if (!q) return splash('Búsqueda') + '<div class="row"><div class="column">' + emptyBox('Escribe en el buscador', 'Busca tractores, IMEI, etiquetas, lotes, combustible, alertas, reportes, pronóstico, precipitación y noticias.') + '</div></div>';
    var jump = '<p class="dh-topics">' + groups.map(function (g) { return '<a href="#" data-gs-jump="gs-' + g.key + '">' + g.label + ' (' + g.n + ')</a>'; }).join('|') + '</p>';
    var body = groups.map(function (g) {
      return '<div class="row" id="gs-' + g.key + '"><div class="column styled-href-blue">' + colHead(g.label, g.n + (g.n === 1 ? ' resultado' : ' resultados')) + '<ul class="dh-list">' + g.items.map(gsRow).join('') + '</ul>' + (g.n > g.items.length ? '<p class="dh-note">Se muestran los primeros ' + g.items.length + '. Afina la búsqueda para ver el resto.</p>' : '') + '</div></div>';
    }).join('<hr>');
    return splash('Búsqueda') + '<div class="row"><div class="column"><div style="text-align:center"><h2>' + total + (total === 1 ? ' resultado' : ' resultados') + ' para «' + esc(q) + '»</h2></div>' + (groups.length ? jump : '') + '</div></div>' +
      (groups.length ? body : '<div class="row"><div class="column">' + emptyBox('Sin resultados', 'Prueba con otro nombre, un IMEI, un lote o una palabra como «combustible» o «lluvia».') + '</div></div>');
  }
  function closeGS() { if (gsBox) gsBox.hidden = true; gsSel = -1; }
  function gsDrop() {
    var qi = document.getElementById('q'); if (!qi) return;
    if (!norm(qi.value).trim()) return closeGS();
    var groups = gsRun(qi.value), total = groups.reduce(function (s, g) { return s + g.n; }, 0);
    if (!gsBox) { gsBox = document.createElement('div'); gsBox.id = 'dh-gs'; gsBox.hidden = true; document.body.appendChild(gsBox); jq(gsBox).on('mousedown', function (e) { e.preventDefault(); }).on('click', 'a', function (e) { e.preventDefault(); if (this.dataset.gsAll) return gsSubmit(); if (this.dataset.gsI) gsGo(gsFlat[Number(this.dataset.gsI)]); }); }
    gsBox.innerHTML = groups.length ? groups.map(function (g) { return '<h3>' + g.label + ' <small>(' + g.n + ')</small></h3><ul>' + g.items.slice(0, 3).map(function (it) { return '<li><span class="dh-dot ' + (it.dot || '') + '"></span><a href="#" data-gs-i="' + it.i + '">' + esc(it.t) + '</a><small>' + esc(it.s || '') + '</small></li>'; }).join('') + '</ul>'; }).join('') + '<p class="gs-foot"><a href="#" data-gs-all="1">Ver los ' + total + ' resultados »</a></p>'
      : '<p class="gs-empty">Sin resultados para «' + esc(qi.value) + '».</p>';
    var r = qi.closest('form').getBoundingClientRect(), wd2 = Math.min(440, window.innerWidth - 16);
    gsBox.style.top = r.bottom + 4 + 'px'; gsBox.style.left = Math.max(8, Math.min(r.left, window.innerWidth - wd2 - 8)) + 'px'; gsBox.style.width = wd2 + 'px';
    gsBox.hidden = false; gsSel = -1;
  }
  function gsRefresh() {
    if (state.visible && state.page === 'buscar') { var t = view.scrollTop; $('#dh-content', view).innerHTML = buildBuscar(); view.scrollTop = t; }
    else if (gsBox && !gsBox.hidden) gsDrop();
  }
  function gsSubmit() {
    var qi = document.getElementById('q'); state.q = qi ? qi.value.trim() : ''; closeGS();
    if (!state.q) return; show('buscar');
  }
  function gsGo(it) {
    if (!it) return; closeGS(); var g = it.go, k = g[0];
    if (k === 'dev') return openDevice(g[1]);
    if (k === 'alert') return openAlert(g[1]);
    if (k === 'lote') { state.lote = g[1]; return show('lotes'); }
    if (k === 'page') return show(g[1]);
    if (k === 'nav') return nav(g[1]);
    if (k === 'q') { var qi = document.getElementById('q'); if (qi) qi.value = g[1]; return gsSubmit(); }
    if (k === 'wx') { show('inicio'); return void setTimeout(function () { var e = $('#' + g[1], view); if (e) e.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 450); }
    if (k === 'url') return void window.open(g[1], '_blank', 'noopener');
    if (k === 'settings') { hide(); var b = document.getElementById('ctl-settings'); if (b) b.click(); return; }
    if (k === 'links') { var l = document.querySelector('[data-links-btn]'); if (l) l.click(); }
  }
  function gsWire() {
    var qi = document.getElementById('q'), form = document.getElementById('search-form'); if (!qi || !form) return;
    qi.addEventListener('input', function (e) { e.stopImmediatePropagation(); clearTimeout(gsWire.t); gsWire.t = setTimeout(gsDrop, 120); }, true);
    jq(qi).on('focus', function () { if (norm(qi.value).trim()) gsDrop(); });
    qi.addEventListener('keydown', function (e) {
      var links = gsBox && !gsBox.hidden ? [].slice.call(gsBox.querySelectorAll('[data-gs-i]')) : [];
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (!links.length) return; e.preventDefault(); e.stopImmediatePropagation();
        gsSel = e.key === 'ArrowDown' ? Math.min(links.length - 1, gsSel + 1) : Math.max(0, gsSel - 1);
        links.forEach(function (a, i) { a.classList.toggle('sel', i === gsSel); }); links[gsSel].scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter' && gsSel >= 0 && links[gsSel]) { e.preventDefault(); e.stopImmediatePropagation(); gsGo(gsFlat[Number(links[gsSel].dataset.gsI)]); }
      else if (e.key === 'Escape') { closeGS(); }
    }, true);
    form.addEventListener('submit', function (e) { e.preventDefault(); e.stopImmediatePropagation(); gsSubmit(); }, true);
    jq('#q-clear').on('click', closeGS);
  }

  // Portada interactiva: el puntero (o el dedo) recorre la foto; al hacer scroll se desplaza más lento (paralaje).
  function heroWire() {
    var h = $('#dh-splash.dh-hero', view); if (!h) return;
    var set = function (x, y) { h.style.setProperty('--px', x.toFixed(3)); h.style.setProperty('--py', y.toFixed(3)); };
    jq(h).on('pointermove', function (e) { var r = h.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * 2 - 1, y = (e.clientY - r.top) / r.height * 2 - 1; set(x, y); h.style.setProperty('--gx', ((x + 1) * 50).toFixed(1) + '%'); h.style.setProperty('--gy', ((y + 1) * 50).toFixed(1) + '%'); })
      .on('pointerleave', function () { set(0, 0); });
  }
  /* --- Tools: el menú se abre desde la barra de navegación Debian --- */
  var toolsWas = false;
  function toolsMenu() { return document.querySelector('.jd-toolsmenu'); }
  function toolsReset() { var m = toolsMenu(); if (m) { m.style.position = m.style.left = m.style.top = m.style.maxHeight = ''; m.classList.remove('dh-side'); } var bd = document.getElementById('dh-sidebd'); if (bd) bd.hidden = true; }
  // Sidebar de Tools (responsive): el menú ocupa un panel lateral con fondo oscurecido.
  function sideOn(m) {
    m.style.position = m.style.left = m.style.top = m.style.maxHeight = ''; m.classList.add('dh-side');
    var bd = document.getElementById('dh-sidebd');
    if (!bd) {
      bd = document.createElement('div'); bd.id = 'dh-sidebd'; document.body.appendChild(bd);
      jq(bd).on('click', closeMenus);
      try { new MutationObserver(function () { var mm = toolsMenu(); if (mm && mm.hidden) { mm.classList.remove('dh-side'); bd.hidden = true; } }).observe(m, { attributes: true, attributeFilter: ['hidden'] }); } catch (e) { /* sin observer */ }
    }
    bd.hidden = false;
  }
  function openSide() { var m = toolsMenu(), hb = document.querySelector('.jd-tools'); if (!m || !hb) return; closeBell(); if (m.hidden) hb.click(); sideOn(m); }
  function toggleTools(btn) {
    var m = toolsMenu(), hb = document.querySelector('.jd-tools'); if (!m || !hb) return;
    if (toolsWas) { toolsWas = false; btn.setAttribute('aria-expanded', 'false'); return; }
    closeBell(); hb.click();
    if (window.innerWidth < 1024) { sideOn(m); return; }
    var r = btn.getBoundingClientRect();
    m.style.position = 'fixed'; m.style.left = Math.max(4, Math.min(r.left, window.innerWidth - 310)) + 'px'; m.style.top = r.bottom + 'px'; m.style.maxHeight = 'calc(100vh - ' + (r.bottom + 12) + 'px)';
    btn.setAttribute('aria-expanded', String(!m.hidden));
  }
  // El panel "Enlaces del proyecto" se ancla bajo el botón Tools visible.
  function anchorLinks() {
    var host = document.querySelector('.jd-top > .jd-item:has([data-links-btn])'), t = $('#dh-toolsbtn', view), vis = state.visible && t && t.offsetParent;
    var r = (vis ? t : document.querySelector('.jd-tools')).getBoundingClientRect();
    if (host) { host.style.left = r.left + 'px'; host.style.top = r.bottom + 'px'; }
  }
  // Alerta: abre el componente Alertas y resalta el evento.
  function openAlert(eid) {
    var w = P().w, ev = (w.events || []).slice().sort(function (a, b) { return new Date(b.eventTime) - new Date(a.eventTime); }), ix = ev.findIndex(function (e) { return e.id === eid; });
    state.alFilter = 'todos'; state.alFocus = eid; state.alLimit = Math.max(15, Math.ceil((ix + 1) / 15) * 15);
    show('alertas');
    setTimeout(function () { var el = document.getElementById('al-' + eid); if (el) el.scrollIntoView({ block: 'center' }); }, 120);
  }
  /* --- Perfil y sesión: ventana bajo el icono de usuario --- */
  var prof = null, profBtn = null;
  function closeProfile() { if (prof && !prof.hidden) { prof.hidden = true; if (profBtn) profBtn.setAttribute('aria-expanded', 'false'); } }
  function toggleProfile(btn) {
    profBtn = btn;
    if (prof && !prof.hidden) return closeProfile();
    var P0 = window.__pf, w = P0.w, prevView = w.view, prevSel = w.selected;
    closeBell(); closeMenus();
    if (!prof) {
      prof = document.createElement('div'); prof.id = 'dh-prof'; prof.hidden = true; prof.setAttribute('role', 'dialog'); prof.setAttribute('aria-label', 'Mi cuenta');
      document.body.appendChild(prof);
      var sec = document.querySelector('#panel [data-section="profile"]'); // la app sigue pintando aquí su formulario
      if (sec) { sec.removeAttribute('hidden'); sec.classList.remove('hidden'); prof.appendChild(sec); }
    }
    // La app dibuja el formulario cuando su vista es "perfil": se abre y se regresa a la vista anterior.
    root.classList.add('dh-profbusy'); var av = document.querySelector('[data-avatar]'); if (av) av.click();
    setTimeout(function () {
      try { if (prevView === 'device' && prevSel != null && P0.select) P0.select(prevSel); else if (P0.setView) P0.setView(prevView === 'profile' ? 'fleet' : prevView); } catch (e) { /* sin vista previa */ }
      root.classList.remove('dh-profbusy');
    }, 350);
    var r = btn.getBoundingClientRect();
    prof.style.top = r.bottom + 'px'; prof.style.right = Math.max(8, window.innerWidth - r.right - 8) + 'px';
    prof.hidden = false; btn.setAttribute('aria-expanded', 'true');
  }
  /* --- Campana de alertas (ventana bajo el icono, estilo Debian) --- */
  var bell = null, bellAll = false, bellBtn = null;
  function closeMenus() {
    document.querySelectorAll('.jd-dd').forEach(function (m) { m.hidden = true; });
    document.querySelectorAll('.jd-has-dd .jd-ni').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
  }
  function bellEvents() {
    var w = P().w;
    return (w.events || []).map(function (e) { return { e: e, i: evInfo(e), at: new Date(e.eventTime).getTime() }; }).sort(function (a, b) { return b.at - a.at; });
  }
  function bellBadge() {
    var btn = document.querySelector('.jd-top [data-go="alerts"][aria-label="Notificaciones"]'); if (!btn) return;
    var t0 = new Date(); t0.setHours(0, 0, 0, 0);
    var n = 0; try { bellEvents().forEach(function (x) { if (x.i.high && x.at >= t0.getTime()) n++; }); } catch (e) { /* sin datos */ }
    var b = btn.querySelector('.jd-bellbadge');
    if (!b) { b = document.createElement('b'); b.className = 'jd-bellbadge'; btn.appendChild(b); }
    b.textContent = n > 99 ? '99+' : String(n); b.hidden = !n;
  }
  function fillBell() {
    var w = P().w, fences = {}; (w.geofences || []).forEach(function (g) { fences[g.id] = g.name; });
    var ev = bellEvents(), t0 = new Date(); t0.setHours(0, 0, 0, 0);
    var high = ev.filter(function (x) { return x.i.high; }), today = high.filter(function (x) { return x.at >= t0.getTime(); });
    var list = (bellAll ? ev : high).slice(0, 8);
    var rows = list.map(function (x) {
      var lote = x.e.geofenceId && fences[x.e.geofenceId] ? ' · ' + esc(fences[x.e.geofenceId]) : '';
      return '<li><span class="bl-dot' + (x.i.high ? ' crit' : '') + '"></span><div><a href="#" data-bell-ev="' + x.e.id + '">' + esc(devName(x.e.deviceId)) + ' — ' + esc(x.i.label) + '</a><small>' +
        new Date(x.at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false }) + ' · ' + ago(x.at) + lote + '</small></div></li>';
    }).join('');
    bell.innerHTML = '<h2>Alertas</h2><p class="bl-sub">' + today.length + (today.length === 1 ? ' alerta alta hoy' : ' alertas altas hoy') + '</p>' +
      '<p class="bl-tabs"><a href="#" data-bell-f="altas"' + (!bellAll ? ' aria-current="true"' : '') + '>Altas (' + high.length + ')</a>|<a href="#" data-bell-f="todos"' + (bellAll ? ' aria-current="true"' : '') + '>Todos los eventos (' + ev.length + ')</a></p>' +
      '<ul>' + (rows || '<li class="bl-empty">Sin eventos para mostrar.</li>') + '</ul>' +
      '<p class="bl-foot"><a href="#" data-bell-all="1">Todas las alertas »</a></p>';
  }
  function closeBell() { if (bell && !bell.hidden) { bell.hidden = true; if (bellBtn) bellBtn.setAttribute('aria-expanded', 'false'); } }
  function toggleBell(btn) {
    bellBtn = btn;
    if (!bell) {
      bell = document.createElement('div'); bell.id = 'dh-bell'; bell.hidden = true; bell.setAttribute('role', 'dialog'); bell.setAttribute('aria-label', 'Alertas');
      document.body.appendChild(bell);
      jq(bell).on('click', 'a', function (e) {
        e.preventDefault(); var d = this.dataset;
        if (d.bellF) { bellAll = d.bellF === 'todos'; return fillBell(); }
        if (d.bellAll) { closeBell(); return show('alertas'); }
        if (d.bellEv) { closeBell(); openAlert(Number(d.bellEv)); }
      });
    }
    if (!bell.hidden) return closeBell();
    closeMenus(); fillBell();
    var r = btn.getBoundingClientRect();
    bell.style.top = r.bottom + 'px'; bell.style.right = Math.max(8, window.innerWidth - r.right - 8) + 'px';
    bell.hidden = false; btn.setAttribute('aria-expanded', 'true');
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
  function setPage(p, keep, noRail) {
    if (!PAGE_TITLE[p]) p = 'inicio';
    var prevPage = state.page;
    state.page = p;
    var c = $('#dh-content', view);
    c.innerHTML = p === 'inicio' ? buildInicio() : FRAMES[p] ? '' : p === 'buscar' ? buildBuscar() : p === 'lotes' ? buildLotes() : p === 'alertas' ? buildAlertas() : p === 'estado' && window.__pfStatus ? window.__pfStatus.html() : buildReportes();
    var frame = !!FRAMES[p];
    view.classList.toggle('dh-map', frame); root.classList.toggle('dh-mapmode', frame); setActive(p);
    var sp = $('#dh-mapsplash h1', view); if (sp) sp.textContent = frame ? FRAMES[p].t : 'Data Center';
    if (frame) measure();
    // La vista de informes de la app vive debajo del marco: se abre/cierra según la página.
    state.keep = true;
    if (!noRail) {
      var cur = FRAMES[p], was = FRAMES[prevPage];
      if (cur && cur.rail) { if (p !== prevPage) { state.hashOk = Date.now() + 900; railClick(cur.rail); } }
      else if (was && was.rail) railClick('fleet');
    }
    state.keep = false;
    document.querySelectorAll('#dh-navbar a[data-hm-page]').forEach(function (a) { a.removeAttribute('aria-current'); if (a.dataset.hmPage === p) a.setAttribute('aria-current', 'page'); });
    var cr = $('#dh-crumb', view);
    if (cr) cr.innerHTML = p === 'inicio' ? 'Inicio' : '<a href="#" data-hm-page="inicio">Inicio</a> / ' + PAGE_TITLE[p];
    if (!keep) view.scrollTop = 0;
    if (p === 'inicio') { heroWire(); renderKpis(); renderFleet(); renderWeather(); loadNews(false); }
  }
  // Refresca los datos en vivo de la página visible (sin perder filtros ni selección).
  function refreshPage() {
    if (!state.visible) return;
    if (state.page === 'inicio') { renderFleet(); return; }
    if (FRAMES[state.page] || state.page === 'estado') return;
    var top = view.scrollTop;
    $('#dh-content', view).innerHTML = state.page === 'buscar' ? buildBuscar() : state.page === 'lotes' ? buildLotes() : state.page === 'alertas' ? buildAlertas() : buildReportes();
    view.scrollTop = top;
  }
  function openDevice(id) {
    show('mapa');
    setTimeout(function () { try { if (P().select) P().select(id); P().mapApi.focusDevice(id); } catch (e) { /* sin mapa */ } }, 150);
  }

  /* ---------- navegación ---------- */
  function railClick(v) { var b = $('#rail [data-view="' + v + '"]') || $('#appbar a[data-view="' + v + '"]'); if (b) b.click(); }
  function nav(g) { if (g === 'fleet') return setPage('mapa'); if (g === 'stats') return show('combustible'); if (g === 'sim') return show('simulador'); if (g === '3d') return show('vista3d'); hide(); railClick(g); }
  // Reserva el espacio del marco (header + banner arriba, pie abajo) para que el mapa no quede tapado.
  function measure() {
    var h = ($('#dh-header', view) || {}).offsetHeight + ($('#dh-mapsplash', view) || {}).offsetHeight, f = ($('#dh-footer', view) || {}).offsetHeight;
    root.style.setProperty('--dh-top', (h || 0) + 'px'); root.style.setProperty('--dh-bot', (f || 0) + 'px');
  }
  function openLote(id) {
    show('mapa');
    setTimeout(function () { try { window.__pf.mapApi.fitFence(id); } catch (e) { /* sin mapa */ } }, 80);
  }
  function setActive(home) {
    var key = home === 'inicio' ? 'home' : home === 'mapa' ? 'map' : home ? '' : 'map';
    document.querySelectorAll('.jd-toolsmenu .jd-row').forEach(function (b) { b.classList.toggle('is-active', b.dataset.key === key); });
  }
  function syncTheme() {
    var on = document.querySelector('[data-theme-btn][aria-pressed="true"]'), s = $('#dh-theme', view);
    if (on && s) s.value = on.dataset.themeBtn;
  }
  function show(p) {
    railClick('fleet');
    view.hidden = false; state.visible = true; syncTheme(); view.scrollTop = 0;
    setPage(p || 'inicio'); if (!p || p === 'inicio') loadWeather(false);
  }
  function hide() { if (!view || view.hidden) return; view.hidden = true; state.visible = false; view.classList.remove('dh-map'); root.classList.remove('dh-mapmode'); setActive(false); toolsReset(); }

  /* ---------- clima ---------- */
  function fleetCentroid() {
    try {
      var p = [...window.__pf.w.positions.values()]; if (!p.length) return DEFAULT_LL;
      var la = 0, lo = 0; p.forEach(function (x) { la += x.latitude; lo += x.longitude; });
      return [Math.round(la / p.length * 100) / 100, Math.round(lo / p.length * 100) / 100];
    } catch (e) { return DEFAULT_LL; }
  }
  function loadWeather(force) {
    if (!force && state.weather && Date.now() - state.wAt < 10 * 60000) { renderWeather(); return; }
    state.ll = fleetCentroid();
    var u = 'https://api.open-meteo.com/v1/forecast?latitude=' + state.ll[0] + '&longitude=' + state.ll[1] +
      '&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m' +
      '&hourly=temperature_2m,precipitation_probability,weather_code,is_day' +
      '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,sunrise,sunset,uv_index_max,wind_speed_10m_max' +
      '&past_days=7&forecast_days=8&timezone=' + encodeURIComponent(TZ) + '&wind_speed_unit=kmh';
    fetch(u).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (d) {
      state.weather = d; state.wAt = Date.now(); state.wErr = false; renderWeather();
    }).catch(function () { state.wErr = true; renderWeather(); });
  }
  function put(id, html) { var el = $('#' + id, view); if (el) el.innerHTML = html; }
  function errBox(what) { return '<p class="dh-empty">No se pudo cargar ' + what + '. Revisa tu conexión.</p><button type="button" class="dh-retry" data-hm-refresh>Reintentar</button>'; }
  function windowRisk(cur, rainMax) {
    var w = cur.wind_speed_10m, g = cur.wind_gusts_10m, t = cur.temperature_2m;
    if (w > 25 || g > 40 || rainMax >= 60 || t > 38 || cur.precipitation > 0.2) return ['bad', 'No recomendable', 'Viento, lluvia o calor fuera de rango.'];
    if (w > 15 || g > 28 || rainMax >= 30 || t > 35) return ['warn', 'Con precaución', 'Revisa viento y probabilidad de lluvia.'];
    return ['ok', 'Favorable', 'Condiciones adecuadas para aplicar.'];
  }
  window.__earthUrl = function (l, v, p) { if (l) earth.layer = l; if (v) earth.view = v; if (p) earth.proj = p; return earthUrl(); };
  var kpiState = {};
  function renderKpis() {
    var k = kpiState, PG = { alerts: 'alertas', reports: 'reportes' }, c = function (go, cls, v, l) { return '<a href="#" class="column dh-kpi ' + cls + '" ' + (PG[go] ? 'data-hm-page="' + PG[go] + '"' : 'data-hm-go="' + go + '"') + '><h1>' + v + '</h1><h2>' + l + '</h2></a>'; };
    put('dh-herochips',
      '<a href="#" class="hero-chip" data-hm-page="mapa"><b>' + (k.running == null ? '—' : k.running) + '</b><span>En marcha</span></a>' +
      '<a href="#" class="hero-chip" data-hm-page="alertas"><b>' + (k.nosignal == null ? '—' : k.nosignal) + '</b><span>Sin señal</span></a>' +
      '<a href="#" class="hero-chip" data-hm-page="reportes"><b>' + (k.hours == null ? '—' : fmt(k.hours, 1) + ' h') + '</b><span>Horas motor hoy</span></a>' +
      '<a href="#" class="hero-chip" data-hm-wx="dh-now"><b>' + (k.temp == null ? '—' : fmt(k.temp) + ' °C') + '</b><span>Temperatura</span></a>' +
      '<a href="#" class="hero-chip" data-hm-wx="dh-rain"><b>' + (k.rain == null ? '—' : fmt(k.rain, 1) + ' mm') + '</b><span>Lluvia hoy</span></a>');
    put('dh-kpis',
      c('fleet', 'ok', k.running == null ? '—' : k.running, 'En marcha') + c('fleet', '', k.idle == null ? '—' : k.idle, 'Apagados') +
      c('alerts', 'bad', k.nosignal == null ? '—' : k.nosignal, 'Sin señal') + c('reports', '', k.hours == null ? '—' : fmt(k.hours, 1) + ' h', 'Horas motor hoy') +
      c('fleet', '', k.temp == null ? '—' : fmt(k.temp) + ' °C', 'Temperatura') + c('fleet', '', k.rain == null ? '—' : fmt(k.rain, 1) + ' mm', 'Lluvia hoy'));
  }
  function renderWeather() {
    if (!state.weather) { if (state.wErr) { put('dh-now', errBox('el clima')); put('dh-fc', errBox('el pronóstico')); put('dh-rain', errBox('la precipitación')); } return; }
    var d = state.weather, c = d.current, dy = d.daily, h = d.hourly, now = Date.now(), T = 7;
    var i0 = h.time.findIndex(function (t) { return new Date(t).getTime() >= now - 30 * 60000; }); if (i0 < 0) i0 = 0;
    var next = []; for (var i = i0; i < Math.min(i0 + 24, h.time.length); i++) next.push(i);
    var rainMax = Math.max.apply(null, next.slice(0, 6).map(function (i) { return h.precipitation_probability[i] || 0; }).concat([0]));
    var cond = wmo(c.weather_code, c.is_day), risk = windowRisk(c, rainMax);
    kpiState.temp = c.temperature_2m; kpiState.rain = dy.precipitation_sum[T] || 0; renderKpis();
    var mm = function (l, v) { return '<div class="dh-m"><small>' + l + '</small><b>' + v + '</b></div>'; };

    put('dh-now',
      '<div class="dh-big"><span class="dh-wico">' + cond[1] + '</span><div><div class="dh-temp">' + fmt(c.temperature_2m) + '<small>°C</small></div><div class="dh-cond">' + cond[0] + ' · El Rosario, Sinaloa</div></div></div>' +
      '<div class="dh-metrics">' + mm('Sensación', fmt(c.apparent_temperature) + ' °C') + mm('Humedad', fmt(c.relative_humidity_2m) + ' %') + mm('Viento', fmt(c.wind_speed_10m) + ' km/h ' + dir(c.wind_direction_10m)) + '</div>' +
      '<div class="dh-risk is-' + risk[0] + '"><b>Ventana de aplicación: ' + risk[1] + '</b><span>' + risk[2] + '</span></div>');

    var lo = Math.min.apply(null, dy.temperature_2m_min.slice(T)), hi = Math.max.apply(null, dy.temperature_2m_max.slice(T)), span = Math.max(1, hi - lo), days = '';
    for (var k = T; k < Math.min(T + 7, dy.time.length); k++) {
      var x = wmo(dy.weather_code[k], 1), a = dy.temperature_2m_min[k], b = dy.temperature_2m_max[k];
      days += '<li><span class="dh-dn">' + (k === T ? 'Hoy' : wd(dy.time[k])) + '</span><i>' + x[1] + '</i><em>' + fmt(dy.precipitation_probability_max[k]) + '%</em>' +
        '<span class="dh-bar"><u style="left:' + ((a - lo) / span * 100) + '%;width:' + Math.max(6, (b - a) / span * 100) + '%"></u></span><b>' + fmt(a) + '°</b><b>' + fmt(b) + '°</b></li>';
    }
    put('dh-fc', '<ul class="dh-days">' + days + '</ul>');

    var past = 0, fut = 0; for (var q = 0; q < dy.time.length; q++) { var v0 = dy.precipitation_sum[q] || 0; if (q < T) past += v0; else if (q > T) fut += v0; }
    var maxmm = Math.max(2, Math.max.apply(null, dy.precipitation_sum.map(function (v) { return v || 0; })));
    var W = 300, H = 70, bw = W / dy.time.length, bars = '';
    dy.time.forEach(function (t, q) {
      var v = dy.precipitation_sum[q] || 0, bh = Math.max(v > 0 ? 2 : 0, v / maxmm * (H - 18));
      bars += '<rect class="' + (q < T ? 'p' : q === T ? 't' : 'f') + '" x="' + (q * bw + 2) + '" y="' + (H - 14 - bh) + '" width="' + (bw - 4) + '" height="' + bh + '" rx="2"><title>' + wd(t, true) + ': ' + fmt(v, 1) + ' mm</title></rect><text x="' + (q * bw + bw / 2) + '" y="' + (H - 2) + '" text-anchor="middle">' + wd(t).charAt(0).toUpperCase() + '</text>';
    });
    put('dh-rain', '<div class="dh-metrics">' + mm('Hoy', fmt(dy.precipitation_sum[T], 1) + ' mm') + mm('Últimos 7 días', fmt(past, 1) + ' mm') + mm('Próximos 7 días', fmt(fut, 1) + ' mm') + '</div>' +
      '<svg class="dh-chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Precipitación diaria">' + bars + '</svg>' +
      '<p class="dh-legend"><i class="p"></i>Registrado <i class="t"></i>Hoy <i class="f"></i>Pronóstico</p>');
    if (state.page === 'buscar' || (gsBox && !gsBox.hidden)) setTimeout(gsRefresh, 0);
    var u = $('#dh-upd', view); if (u) u.textContent = new Date(state.wAt).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
  }

  /* ---------- noticias: misma presentación que la sección Actualidad de buildwiselabs.net ----------
   * Portada con foto, lista lateral con miniaturas y cuadrícula. Economía, Negocios, Tecnología y Mercados
   * salen de la API de buildwiselabs.net (con fotos); "Agro Sinaloa" sale de Google Noticias (sin foto). */
  var NW_API = 'https://buildwiselabs.net/api/news';
  var NW_ICON = {
    agro: '<path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14"/><path d="M5 19c2-4 5-7 9-9"/>',
    economia: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    negocios: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>',
    tecnologia: '<rect x="6" y="6" width="12" height="12" rx="1.5"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
    mercados: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
  };
  var NW_CATS = [
    { id: 'agro', label: 'Agro Sinaloa', color: '#65a30d', q: 'agricultura Sinaloa' },
    { id: 'economia', label: 'Economía', color: '#34d399' },
    { id: 'negocios', label: 'Negocios', color: '#fbbf24' },
    { id: 'tecnologia', label: 'Tecnología', color: '#60a5fa' },
    { id: 'mercados', label: 'Mercados', color: '#2dd4bf' },
  ];
  var nwIcon = function (id, size, color) { return '<svg viewBox="0 0 24 24" width="' + size + '" height="' + size + '" fill="none" stroke="' + color + '" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + NW_ICON[id] + '</svg>'; };
  function nwImg(n, c, ratio, cls) {
    var ph = '<span class="nw-ph" style="background-image:linear-gradient(135deg,' + c.color + '33,' + c.color + '0d)">' + nwIcon(c.id, cls === 'lead' ? 56 : cls === 'thumb' ? 22 : 34, c.color) + '</span>';
    var img = n.image ? '<img src="' + esc(n.image) + '" alt="" loading="lazy" referrerpolicy="no-referrer" data-lo="' + esc(n.imageLo || '') + '" onerror="if(this.dataset.lo&&this.src!==this.dataset.lo){this.src=this.dataset.lo;this.dataset.lo=\'\'}else{this.parentNode.classList.add(\'nw-broken\')}">' : '';
    return '<div class="nw-img nwi-' + cls + (n.image ? '' : ' nw-broken') + '" style="aspect-ratio:' + ratio + '">' + img + ph + '</div>';
  }
  var nwMeta = function (n) { return '<div class="nw-meta"><b>' + esc(n.source) + '</b>' + (n.publishedAt && !isNaN(n.publishedAt) ? '<span>· ' + ago(n.publishedAt) + '</span>' : '') + '</div>'; };
  var nwSafe = function (u) { return /^https?:\/\//i.test(u) ? esc(u) : '#'; };

  function loadNews(force) {
    var c = NW_CATS.filter(function (t) { return t.id === state.topic; })[0] || NW_CATS[0];
    var cached = state.news[c.id];
    if (!force && cached && Date.now() - cached.at < 10 * 60000) { renderNews(c, cached); return; }
    if (!cached) renderNews(c, null, 'loading');
    // API de noticias de buildwiselabs.net (con fotos). "agro" usa la categoría nueva del backend
    // (E:\PYME\backend\src\news.js); en localhost apunta al servidor de desarrollo (puerto 3100).
    var fromApi = function (base, id) {
      return fetch(base + '?cat=' + encodeURIComponent(id) + '&limit=18').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (d) {
        if (!d.items || !d.items.length) throw new Error('vacio');
        return { items: d.items.map(function (x) { return { title: x.title, url: x.url, source: x.source, image: hiRes(x.image), imageLo: x.image, summary: x.summary, publishedAt: x.publishedAt ? new Date(x.publishedAt).getTime() : NaN }; }), sources: d.sources || [], updatedAt: d.updatedAt ? new Date(d.updatedAt).getTime() : Date.now() };
      });
    };
    // Respaldo para "agro" si el backend aún no tiene la categoría: Google Noticias (sin fotos).
    var fromGoogle = function () {
      var feed = 'https://news.google.com/rss/search?q=' + encodeURIComponent(c.q + ' when:14d') + '&hl=es-419&gl=MX&ceid=MX:es-419';
      return fetch('https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(feed)).then(function (r) { return r.json(); }).then(function (j) {
        if (j.status !== 'ok') throw new Error('rss');
        var srcs = {};
        var items = (j.items || []).slice(0, 17).map(function (x) {
          var parts = String(x.title || '').split(' - '), src = parts.length > 1 ? parts.pop() : (x.author || 'Google Noticias');
          srcs[src] = 1;
          return { title: parts.join(' - '), url: x.link, source: src, image: null, summary: '', publishedAt: new Date((x.pubDate || '').replace(' ', 'T') + 'Z').getTime() };
        });
        return { items: items, sources: Object.keys(srcs).slice(0, 6), updatedAt: Date.now() };
      });
    };
    var local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? 'http://localhost:3100/api/news' : null;
    var req = c.id === 'agro' ? fromApi(local || NW_API, 'agro').catch(function () { return local ? fromApi(NW_API, 'agro').catch(fromGoogle) : fromGoogle(); }) : fromApi(NW_API, c.id);
    req.then(function (data) { data.at = Date.now(); state.news[c.id] = data; if (state.topic === c.id) renderNews(c, data); })
      .catch(function () { if (state.topic === c.id) renderNews(c, state.news[c.id] || null, 'error'); });
  }
  function renderNews(c, data, mode) {
    var tabs = '<div class="nw-tabs" role="tablist">' + NW_CATS.map(function (t) {
      return '<button type="button" role="tab" data-nw-cat="' + t.id + '" aria-selected="' + (t.id === c.id) + '" style="' + (t.id === c.id ? 'border-bottom-color:' + t.color : '') + '">' + t.label + '</button>';
    }).join('') + '</div>';
    var head = '<div class="nw-eyebrow"><i></i><span>Actualidad</span><em><u></u>En vivo</em></div><h2 class="nw-title">Lo que está pasando en el campo y la economía</h2>' + tabs;
    var items = data && data.items || [];
    var body;
    if (mode === 'error' && !items.length) {
      body = '<div class="nw-error"><p>No pudimos cargar las noticias ahora mismo.</p><button type="button" data-hm-refresh>Reintentar</button></div>';
    } else if (!items.length && mode === 'loading') {
      body = '<div class="nw-skel"><div class="nw-skel-lead"></div><div class="nw-skel-side"><i></i><i></i><i></i><i></i></div></div>';
    } else if (!items.length) {
      body = '<div class="nw-error"><p>Sin noticias recientes para este tema.</p></div>';
    } else {
      var lead = items[0], side = items.slice(1, 5), grid = items.slice(5, 17);
      body = '<div class="nw-top"><a class="nw-lead" href="' + nwSafe(lead.url) + '" target="_blank" rel="noopener noreferrer">' + nwImg(lead, c, '16/9', 'lead') +
        '<div class="nw-lead-b">' + nwMeta(lead) + '<h3>' + esc(lead.title) + '</h3>' + (lead.summary ? '<p>' + esc(lead.summary) + '</p>' : '') + '</div></a>' +
        (side.length ? '<div class="nw-side"><h4>Más noticias</h4>' + side.map(function (n) {
          return '<a class="nw-sitem" href="' + nwSafe(n.url) + '" target="_blank" rel="noopener noreferrer"><div>' + nwMeta(n) + '<h5>' + esc(n.title) + '</h5></div>' + nwImg(n, c, '4/3', 'thumb') + '</a>';
        }).join('') + '</div>' : '') + '</div>' +
        (grid.length ? '<div class="nw-grid">' + grid.map(function (n) {
          return '<div class="nw-cell"><a class="nw-card" href="' + nwSafe(n.url) + '" target="_blank" rel="noopener noreferrer" aria-label="' + esc(n.title) + '">' + nwImg(n, c, '16/9', 'card') + '<div class="nw-card-b">' + nwMeta(n) + '<h5>' + esc(n.title) + '</h5></div></a></div>';
        }).join('') + '</div>' : '');
    }
    var foot = data ? '<p class="nw-foot">' + (data.sources && data.sources.length ? 'Fuentes: ' + esc(data.sources.join(', ')) : 'Fuentes: medios y agencias') + ' · actualizado ' + ago(data.updatedAt) + '. Cada nota se abre en el sitio del medio.</p>' : '';
    put('dh-news', head + body + foot);
  }
  /* ---------- flota (estado en vivo del panel) ---------- */
  function renderFleet() {
    var pf = window.__pf; if (!pf) return;
    var w = pf.w, devs = [...w.devices.values()], st = { running: 0, idle: 0, nosignal: 0 };
    devs.forEach(function (d) { var s = pf.At(d.id); st[s] = (st[s] || 0) + 1; });
    var name = function (id) { var d = w.devices.get(id); return d ? d.name : '#' + id; };
    var hrs = function (id) { return (w.engineToday.get(id) || 0) / 36e5; };
    var totalH = 0, working = 0; devs.forEach(function (d) { var x = hrs(d.id); totalH += x; if (x > 0.05) working++; });
    kpiState.running = st.running; kpiState.idle = st.idle; kpiState.nosignal = st.nosignal; kpiState.hours = totalH; renderKpis();
    var mm = function (l, v) { return '<div class="dh-m"><small>' + l + '</small><b>' + v + '</b></div>'; };

    var HIGH = { alarm: 1, deviceFuelDrop: 1 }, ev = (w.events || []).filter(function (e) { return HIGH[e.type]; });
    var altLi = function (e) {
      var t = e.type === 'deviceFuelDrop' ? 'Caída de combustible' : (e.attributes && e.attributes.alarm === 'powerCut' ? 'Corte de energía' : 'Alarma');
      return '<li><span class="dh-dot crit"></span><div><b>' + esc(name(e.deviceId)) + '</b><small>' + t + ' · ' + ago(new Date(e.eventTime).getTime()) + '</small></div></li>';
    };
    var empty = '<p class="dh-emptybox"><b>No hay alertas altas recientes</b>Para ver otras alertas y avisos, visite <a href="#" data-hm-page="alertas">Alertas</a>.</p>';
    put('dh-alerts', ev.length ? '<ul class="dh-list">' + ev.slice(0, 4).map(altLi).join('') + '</ul>' : empty);
    put('dh-alerts2', ev.length ? '<ul class="dh-list">' + ev.slice(0, 6).map(altLi).join('') + '</ul><p class="dh-more"><a href="#" data-hm-page="alertas">Todas las alertas</a></p>' : empty);

    var tot = devs.length || 1;
    var running = devs.filter(function (d) { return pf.At(d.id) === 'running'; }).sort(function (a, b) { return hrs(b.id) - hrs(a.id); }).slice(0, 3);
    put('dh-equip', devs.length ? '<div class="dh-stack" role="img" aria-label="Estado de la flota"><i class="ok" style="width:' + st.running / tot * 100 + '%"></i><i class="idle" style="width:' + st.idle / tot * 100 + '%"></i><i class="bad" style="width:' + st.nosignal / tot * 100 + '%"></i></div>' +
      '<div class="dh-metrics">' + mm('En marcha', st.running) + mm('Apagados', st.idle) + mm('Sin señal', st.nosignal) + '</div>' +
      '<ul class="dh-list" style="margin-top:6px">' + running.map(function (d) { return '<li><span class="dh-dot ok"></span><div><b>' + esc(d.name) + '</b><small>En marcha</small></div><em>' + fmt(hrs(d.id), 1) + ' h</em></li>'; }).join('') + '</ul>'
      : '<p class="dh-emptybox"><b>No se ha encontrado ningún equipo</b>Añada equipos para ver su estado en tiempo real.</p>');

    put('dh-work', '<div class="dh-metrics">' + mm('Horas motor', fmt(totalH, 1) + ' h') + mm('Tractores trabajando', working + ' de ' + devs.length) + mm('Promedio', fmt(working ? totalH / working : 0, 1) + ' h') + '</div>' +
      '<p class="dh-note">Calculado con las horas de motor reportadas hoy por cada tractor.</p>');

    var fences = w.geofences || [], pos = [...w.positions.values()];
    put('dh-lotes', fences.length ? '<ul class="dh-list dh-lotes">' + fences.map(function (g) {
      var n = pos.filter(function (p) { return (p.geofenceIds || []).indexOf(g.id) >= 0; }).length, c = (g.attributes && g.attributes.color) || '#367C2B';
      return '<li><button type="button" data-hm-lote="' + g.id + '"><span class="dh-dot" style="background:' + esc(c) + '"></span><div><b>' + esc(g.name) + '</b><small>' + n + ' tractor' + (n === 1 ? '' : 'es') + ' dentro</small></div><em>Ver</em></button></li>';
    }).join('') + '</ul>' : '<p class="dh-emptybox"><b>Aún no hay lotes</b>Dibuje lotes para ver cuántos tractores trabajan en cada uno.</p>');
  }

  /* ---------- arranque ---------- */
  function clock() {
    var el = $('#hm-clock', view); if (!el) return;
    el.textContent = 'En vivo · ' + new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false }) + ' · El Rosario, Sinaloa';
  }
  function init() {
    root = document.getElementById('root');
    build(); renderKpis();
    window.__pfHome = { show: show, hide: hide };
    document.addEventListener('click', function (e) {
      // Campana: las alertas se muestran ahí mismo (ventana bajo el icono), no en el panel izquierdo.
      if (e.target.closest('#menu-btn')) { e.preventDefault(); e.stopPropagation(); var mm0 = toolsMenu(); if (mm0 && !mm0.hidden && mm0.classList.contains('dh-side')) closeMenus(); else openSide(); return; }
      var ub = e.target.closest('.jd-top .jd-user');
      if (ub) { e.preventDefault(); e.stopPropagation(); toggleProfile(ub); return; }
      if (prof && !prof.hidden && !e.target.closest('#dh-prof')) closeProfile();
      var bb = e.target.closest('.jd-top [data-go="alerts"][aria-label="Notificaciones"]');
      if (bb) { e.preventDefault(); e.stopPropagation(); toggleBell(bb); return; }
      if (bell && !bell.hidden && !e.target.closest('#dh-bell')) closeBell();
      if (gsBox && !gsBox.hidden && !e.target.closest('#dh-gs, #searchbox')) closeGS();
      if (e.target.closest('.jd-toolsmenu [data-go="links"]')) anchorLinks();
      var al = e.target.closest('.jd-toolsmenu [data-go="alerts"]');
      if (al) { e.preventDefault(); e.stopPropagation(); closeMenus(); show('alertas'); return; }
      var pgm = e.target.closest('.jd-toolsmenu [data-go="lotes"], .jd-toolsmenu [data-go="reports"]');
      if (pgm) { e.preventDefault(); e.stopPropagation(); closeMenus(); show(pgm.dataset.go === 'lotes' ? 'lotes' : 'reportes'); return; }
      var st0 = e.target.closest('.jd-toolsmenu [data-go="stats"], .jd-toolsmenu [data-go="sim"], .jd-toolsmenu [data-go="3d"]');
      if (st0) { e.preventDefault(); e.stopPropagation(); closeMenus(); show({ stats: 'combustible', sim: 'simulador', '3d': 'vista3d' }[st0.dataset.go]); return; }
      // Cerrar una vista de la app (Volver al mapa) -> Data Center; abrir 3D desde el simulador/tractor -> el marco sigue a Vista 3D
      if (e.target.closest('[data-act="stats-close"],[data-act="sim-close"],[data-act="v3-close"]') && state.visible && FRAMES[state.page] && state.page !== 'mapa') { setTimeout(function () { setPage('mapa'); }, 30); return; }
      if (!state.visible || state.keep) return;
      if (e.target.closest('#rail .menu-btn, #appbar a[data-view], .jd-top [data-go="lotes"], .jd-top [data-go="reports"], .jd-top [data-go="stats"], .jd-top [data-go="sim"], .jd-top [data-go="3d"]')) hide();
    }, true);
    window.addEventListener('hashchange', function () { if (state.visible && Date.now() > (state.hashOk || 0)) hide(); });
    setInterval(function () { if (!state.visible) return; clock(); if (Date.now() - state.wAt > 10 * 60000) loadWeather(true); }, 15000);
    gsWire();
    var jt = document.querySelector('.jd-title'); if (jt) jt.textContent = 'panelpack.net';
    jq(view).on('scroll', function () { var h = $('#dh-splash.dh-hero', view); if (h) h.style.setProperty('--sy', Math.min(1.2, view.scrollTop / 500).toFixed(3)); });
    jq(view).on('pointerdown', '#dh-toolsbtn', function () { var m = toolsMenu(); toolsWas = !!(m && !m.hidden); }); // el menú se cierra en el pointerdown de document (burbuja): este manejador corre antes
    jq(document).on('keydown', function (e) { if (e.key === 'Escape') { closeBell(); closeProfile(); } });
    jq(window).on('resize', function () { closeBell(); closeProfile(); });
    try { window.__pf.subscribe(function () {
      clearTimeout(init.b); init.b = setTimeout(function () { bellBadge(); if (bell && !bell.hidden) fillBell(); }, 600);
      if (state.visible) { clearTimeout(init.t); init.t = setTimeout(refreshPage, state.page === 'inicio' ? 800 : 2500); }
    }); } catch (e) { /* sin estado */ }
    bellBadge();
    try { new ResizeObserver(function () { if (FRAMES[state.page] && state.visible) measure(); }).observe(view); } catch (e) { /* sin observer */ }
    clock();
    show('mapa'); // la app arranca en Mapa: queda dentro del marco
  }
  var tries = 0, wait = setInterval(function () {
    if (document.getElementById('root') && document.querySelector('.jd-top') && window.__pf) { clearInterval(wait); init(); }
    else if (++tries > 150) clearInterval(wait);
  }, 200);
})();
