// "Combustible y velocidad" dentro del marco Debian (header + banner + pie), igual que Data Center.
const fs = require('fs'), path = require('path');
const dir = __dirname;
let t = fs.readFileSync(path.join(dir, 'home.js'), 'utf8');
if (t.includes('/*combustible-frame*/')) { console.log('ya'); process.exit(0); }
fs.copyFileSync(path.join(dir, 'home.js'), path.join(dir, 'home.js.bak6'));
function rep(a, b, label) {
  const c = t.split(a).length - 1;
  if (c !== 1) throw new Error(label + ': ' + c);
  t = t.replace(a, () => b); console.log('ok', label);
}
rep(`buscar: 'Búsqueda' };`, `buscar: 'Búsqueda', combustible: 'Combustible y velocidad' };`, 'titulo');
rep(`'<li><a href="#" data-hm-page="reportes" title="Reportes de horas y recorridos">Reportes</a></li>' +`,
  `'<li><a href="#" data-hm-page="reportes" title="Reportes de horas y recorridos">Reportes</a></li>' +\n          '<li><a href="#" data-hm-page="combustible" title="Combustible y velocidad">Combustible</a></li>' +`, 'navbar');
rep(`    state.page = p;
    var c = $('#dh-content', view);
    c.innerHTML = p === 'inicio' ? buildInicio() : p === 'mapa' ? '' :`, `    var prevPage = state.page;
    state.page = p;
    var c = $('#dh-content', view);
    c.innerHTML = p === 'inicio' ? buildInicio() : (p === 'mapa' || p === 'combustible') ? '' :`, 'setPage 1');
rep(`    view.classList.toggle('dh-map', p === 'mapa'); root.classList.toggle('dh-mapmode', p === 'mapa'); setActive(p); if (p === 'mapa') measure();`,
`    var frame = p === 'mapa' || p === 'combustible';
    view.classList.toggle('dh-map', frame); root.classList.toggle('dh-mapmode', frame); setActive(p);
    var sp = $('#dh-mapsplash h1', view); if (sp) sp.textContent = p === 'combustible' ? 'Combustible y velocidad' : 'Data Center';
    if (frame) measure();
    // La vista de informes de la app vive debajo del marco: se abre/cierra según la página.
    state.keep = true;
    if (p === 'combustible' && prevPage !== 'combustible') railClick('stats');
    else if (p !== 'combustible' && prevPage === 'combustible') railClick('fleet');
    state.keep = false;`, 'setPage 2');
rep(`    if (state.page === 'mapa') return;`, `    if (state.page === 'mapa' || state.page === 'combustible') return;`, 'refresh');
rep(`  function nav(g) { if (g === 'fleet') return setPage('mapa');`, `  function nav(g) { if (g === 'fleet') return setPage('mapa'); if (g === 'stats') return show('combustible');`, 'nav');
rep(`      if (!state.visible) return;
      if (e.target.closest('#rail .menu-btn,`, `      var st0 = e.target.closest('.jd-toolsmenu [data-go="stats"]');
      if (st0) { e.preventDefault(); e.stopPropagation(); closeMenus(); show('combustible'); return; }
      if (e.target.closest('[data-act="stats-close"]') && state.visible && state.page === 'combustible') { setTimeout(function () { setPage('mapa'); }, 30); return; }
      if (!state.visible || state.keep) return;
      if (e.target.closest('#rail .menu-btn,`, 'captura');
rep(`if (state.page === 'mapa' && state.visible) measure();`, `if ((state.page === 'mapa' || state.page === 'combustible') && state.visible) measure();`, 'resize');
fs.writeFileSync(path.join(dir, 'home.js'), '/*combustible-frame*/\n' + t);
console.log('listo');
