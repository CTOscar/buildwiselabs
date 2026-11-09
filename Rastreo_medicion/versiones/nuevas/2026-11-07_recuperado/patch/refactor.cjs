// Convierte home.js en un mini-router de páginas (inicio, lotes, alertas, reportes).
const fs = require('fs'), path = require('path');
const dir = __dirname, f = path.join(dir, 'home.js');
let t = fs.readFileSync(f, 'utf8');
if (t.includes('function buildInicio')) { console.log('ya refactorizado'); process.exit(0); }
fs.copyFileSync(f, f + '.bak');
function cut(a, b, label) {
  const i = t.indexOf(a), j = t.indexOf(b, i + a.length);
  if (i < 0 || j < 0) throw new Error('marcadores no hallados: ' + label);
  return [i, j];
}
function rep(a, b, label, all) {
  const n = t.split(a).length - 1;
  if (n < 1 || (!all && n !== 1)) throw new Error(`${label}: ${n} coincidencias`);
  t = t.split(a).join(b); console.log('ok', label, n > 1 ? `(x${n})` : '');
}

// 3) enlaces internos de Inicio hacia las páginas nuevas
rep("item('lotes', 'data-hm-go=\"lotes\"'", "item('lotes', 'data-hm-page=\"lotes\"'", 'item lotes');
rep("item('bell', 'data-hm-go=\"alerts\"'", "item('bell', 'data-hm-page=\"alertas\"'", 'item alertas');
rep("item('list', 'data-hm-go=\"reports\"'", "item('list', 'data-hm-page=\"reportes\"'", 'item reportes');
rep('<a href="#" data-hm-go="reports" class="os-other-download">', '<a href="#" data-hm-page="reportes" class="os-other-download">', 'otros reportes');
rep('<a href="#" data-hm-go="alerts">Alertas</a>', '<a href="#" data-hm-page="alertas">Alertas</a>', 'vacío alertas');
rep('<a href="#" data-hm-go="alerts">Todas las alertas</a>', '<a href="#" data-hm-page="alertas">Todas las alertas</a>', 'todas las alertas');
// KPIs: alertas/reportes abren su página
rep("var k = kpiState, c = function (go, cls, v, l) { return '<a href=\"#\" class=\"column dh-kpi ' + cls + '\" data-hm-go=\"' + go + '\"><h1>' + v + '</h1><h2>' + l + '</h2></a>'; };",
  "var k = kpiState, PG = { alerts: 'alertas', reports: 'reportes' }, c = function (go, cls, v, l) { return '<a href=\"#\" class=\"column dh-kpi ' + cls + '\" ' + (PG[go] ? 'data-hm-page=\"' + PG[go] + '\"' : 'data-hm-go=\"' + go + '\"') + '><h1>' + v + '</h1><h2>' + l + '</h2></a>'; };", 'kpis');

// 1) Contenido de Inicio -> buildInicio()
const startMark = "'<section id=\"dh-content\">' +\n";
const endMark = "'<div class=\"clr\"></div></section>' +\n";
const [i0, i1] = cut(startMark, endMark, 'contenido inicio');
const inicioExpr = t.slice(i0 + startMark.length, i1).trimEnd();
t = t.slice(0, i0) + "'<section id=\"dh-content\"></section>' +\n" + t.slice(i1 + endMark.length);
// radios/puntos/flechas del carrusel pasan a buildInicio
const rm = "    var radios = '', dots = '', arrows = '';\n    for (var i = 1; i <= 5; i++) {\n      radios += '<input ' + (i === 1 ? 'checked=\"\" ' : '') + 'type=\"radio\" name=\"dh-slider\" id=\"dh-s' + i + '\">';\n      dots += '<label for=\"dh-s' + i + '\"></label>'; arrows += '<label for=\"dh-s' + i + '\"></label>';\n    }\n";
rep(rm, '', 'carrusel fuera de build');
const buildInicio = "  function buildInicio() {\n" + rm + "    return " + inicioExpr + " +\n      '<div class=\"clr\"></div>';\n  }\n";

// 2) navbar y migas
rep('data-hm-go="lotes" title="Lotes y geocercas"', 'data-hm-page="lotes" title="Lotes y geocercas"', 'navbar lotes');
rep('data-hm-go="alerts" title="Alertas de la flota"', 'data-hm-page="alertas" title="Alertas de la flota"', 'navbar alertas');
rep('data-hm-go="reports" title="Reportes de horas y recorridos"', 'data-hm-page="reportes" title="Reportes de horas y recorridos"', 'navbar reportes');
rep('<p id="dh-breadcrumbs"><span id="hm-clock">En vivo</span></p>', '<p id="dh-breadcrumbs"><span id="dh-crumb">Inicio</span><span id="hm-clock">En vivo</span></p>', 'migas');

// 4) bloque de páginas antes de la navegación
const block = fs.readFileSync(path.join(dir, 'pages-block.js'), 'utf8')
  .replace('function setPage(p) {', 'function setPage(p, keep) {')
  .replace('view.scrollTop = 0;\n    if (p === \'inicio\')', 'if (!keep) view.scrollTop = 0;\n    if (p === \'inicio\')');
const nav = '  /* ---------- navegación ---------- */';
if (!t.includes(nav)) throw new Error('marcador navegación');
t = t.replace(nav, buildInicio + '\n' + block + nav);

// 5) estado, clics, show y suscripción
rep("var state = { weather: null, wAt: 0, wErr: false, news: {}, topic: 'agro', visible: false, ll: DEFAULT_LL };",
  "var state = { weather: null, wAt: 0, wErr: false, news: {}, topic: 'agro', visible: false, ll: DEFAULT_LL, page: 'inicio', lote: null, alFilter: 'todos', alLimit: 15 };", 'estado');
rep("      var g = e.target.closest('[data-hm-go]'); if (g) { e.preventDefault(); return nav(g.dataset.hmGo); }",
  "      var pg = e.target.closest('[data-hm-page]'); if (pg) { e.preventDefault(); return setPage(pg.dataset.hmPage); }\n" +
  "      var sl = e.target.closest('[data-hm-sel]'); if (sl) { e.preventDefault(); state.lote = Number(sl.dataset.hmSel); return setPage('lotes', state.page === 'lotes'); }\n" +
  "      var fl = e.target.closest('[data-hm-flt]'); if (fl) { e.preventDefault(); state.alFilter = fl.dataset.hmFlt; state.alLimit = 15; return setPage('alertas', state.page === 'alertas'); }\n" +
  "      var mo = e.target.closest('[data-hm-more]'); if (mo) { e.preventDefault(); state.alLimit += 15; return refreshPage(); }\n" +
  "      var dv = e.target.closest('[data-hm-event]'); if (dv) { e.preventDefault(); return openDevice(Number(dv.dataset.hmEvent)); }\n" +
  "      var mp = e.target.closest('[data-hm-map]'); if (mp) { e.preventDefault(); return openLote(Number(mp.dataset.hmMap)); }\n" +
  "      var g = e.target.closest('[data-hm-go]'); if (g) { e.preventDefault(); return nav(g.dataset.hmGo); }", 'clics');
rep("var l = e.target.closest('[data-hm-lote]'); if (l) return openLote(Number(l.dataset.hmLote));",
  "var l = e.target.closest('[data-hm-lote]'); if (l) { state.lote = Number(l.dataset.hmLote); return setPage('lotes'); }", 'lote desde inicio');
rep("    renderFleet(); loadWeather(false); loadNews(false);\n  }\n  function hide()", "    setPage('inicio'); loadWeather(false);\n  }\n  function hide()", 'show');
rep("clearTimeout(init.t); init.t = setTimeout(renderFleet, 800);", "clearTimeout(init.t); init.t = setTimeout(refreshPage, state.page === 'inicio' ? 800 : 2500);", 'suscripción');
fs.writeFileSync(f, t);
console.log('listo');
