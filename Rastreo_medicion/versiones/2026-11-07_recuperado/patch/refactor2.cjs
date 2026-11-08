// Añade la página "mapa": marco Debian (header + banner + pie) alrededor del mapa existente.
const fs = require('fs'), path = require('path');
const dir = __dirname;
const rd = (f) => fs.readFileSync(path.join(dir, f), 'utf8');
function patch(file, steps) {
  let t = rd(file);
  if (t.includes('/*mapa-frame*/')) { console.log(file, 'ya parcheado'); return; }
  fs.copyFileSync(path.join(dir, file), path.join(dir, file + '.bak2'));
  for (const [a, b, label] of steps) {
    const n = t.split(a).length - 1;
    if (n !== 1) throw new Error(`${file} · ${label}: ${n} coincidencias`);
    t = t.replace(a, () => b);
    console.log('ok', file, label);
  }
  fs.writeFileSync(path.join(dir, file), t.replace(/^/, '/*mapa-frame*/\n'));
}

patch('home.js', [
  ["var PAGE_TITLE = { inicio: 'Inicio', lotes: 'Lotes',", "var PAGE_TITLE = { inicio: 'Inicio', mapa: 'Mapa', lotes: 'Lotes',", 'titulos'],
  ['<li><a href="#" data-hm-go="fleet" title="Mapa de la flota">Mapa</a></li>', '<li><a href="#" data-hm-page="mapa" title="Mapa de la flota">Mapa</a></li>', 'navbar mapa'],
  ["      '<section id=\"dh-content\"></section>' +", "      '<div id=\"dh-mapsplash\"><h1>Mapa de la flota</h1></div><div id=\"dh-mapspacer\"></div>' +\n      '<section id=\"dh-content\"></section>' +", 'banner del mapa'],
  ["c.innerHTML = p === 'inicio' ? buildInicio() : p === 'lotes' ? buildLotes() : p === 'alertas' ? buildAlertas() : buildReportes();\n    document.querySelectorAll",
   "c.innerHTML = p === 'inicio' ? buildInicio() : p === 'mapa' ? '' : p === 'lotes' ? buildLotes() : p === 'alertas' ? buildAlertas() : buildReportes();\n    view.classList.toggle('dh-map', p === 'mapa'); root.classList.toggle('dh-mapmode', p === 'mapa'); setActive(p); if (p === 'mapa') measure();\n    document.querySelectorAll", 'setPage mapa'],
  ["    if (state.page === 'inicio') { renderFleet(); return; }\n    var top = view.scrollTop;", "    if (state.page === 'inicio') { renderFleet(); return; }\n    if (state.page === 'mapa') return;\n    var top = view.scrollTop;", 'refresh mapa'],
  ["  function nav(g) { hide(); railClick(g); }", "  function nav(g) { if (g === 'fleet') return setPage('mapa'); hide(); railClick(g); }\n  // Reserva el espacio del marco (header + banner arriba, pie abajo) para que el mapa no quede tapado.\n  function measure() {\n    var h = ($('#dh-header', view) || {}).offsetHeight + ($('#dh-mapsplash', view) || {}).offsetHeight, f = ($('#dh-footer', view) || {}).offsetHeight;\n    root.style.setProperty('--dh-top', (h || 0) + 'px'); root.style.setProperty('--dh-bot', (f || 0) + 'px');\n  }", 'nav y measure'],
  ["    document.querySelectorAll('.jd-toolsmenu .jd-row').forEach(function (b) { b.classList.toggle('is-active', b.dataset.key === (home ? 'home' : 'map')); });",
   "    var key = home === 'inicio' ? 'home' : home === 'mapa' ? 'map' : home ? '' : 'map';\n    document.querySelectorAll('.jd-toolsmenu .jd-row').forEach(function (b) { b.classList.toggle('is-active', b.dataset.key === key); });", 'setActive'],
  ["  function show() {\n    railClick('fleet');\n    view.hidden = false; state.visible = true; setActive(true); syncTheme(); view.scrollTop = 0;\n    setPage('inicio'); loadWeather(false);\n  }",
   "  function show(p) {\n    railClick('fleet');\n    view.hidden = false; state.visible = true; syncTheme(); view.scrollTop = 0;\n    setPage(p || 'inicio'); if (!p || p === 'inicio') loadWeather(false);\n  }", 'show'],
  ["function hide() { if (!view || view.hidden) return; view.hidden = true; state.visible = false; setActive(false); }",
   "function hide() { if (!view || view.hidden) return; view.hidden = true; state.visible = false; view.classList.remove('dh-map'); root.classList.remove('dh-mapmode'); setActive(false); }", 'hide'],
  ["if (e.target.closest('#rail .menu-btn, #appbar a[data-view], .jd-top [data-go]:not([data-go=\"home\"])')) hide();",
   "if (e.target.closest('#rail .menu-btn, #appbar a[data-view], .jd-top [data-go=\"alerts\"], .jd-top [data-go=\"lotes\"], .jd-top [data-go=\"reports\"], .jd-top [data-go=\"stats\"], .jd-top [data-go=\"sim\"], .jd-top [data-go=\"3d\"]')) hide();", 'hide al navegar'],
  ["    clock();\n  }\n  var tries = 0,", "    try { new ResizeObserver(function () { if (state.page === 'mapa' && state.visible) measure(); }).observe(view); } catch (e) { /* sin observer */ }\n    clock();\n    show('mapa'); // la app arranca en Mapa: queda dentro del marco\n  }\n  var tries = 0,", 'arranque en mapa'],
]);

patch('navwire.js', [
  ['function go(g){if(g==="home")return void(window.__pfHome&&window.__pfHome.show());window.__pfHome&&window.__pfHome.hide();if(g==="map-settings")',
   'function go(g){if(g==="home")return void(window.__pfHome&&window.__pfHome.show("inicio"));if(g==="fleet")return void(window.__pfHome&&window.__pfHome.show("mapa"));if({alerts:1,lotes:1,reports:1,stats:1,sim:1,"3d":1}[g]&&window.__pfHome)window.__pfHome.hide();if(g==="map-settings")', 'go() de Tools'],
]);
console.log('listo');
