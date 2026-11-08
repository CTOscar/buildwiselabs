// Simulador y Vista 3D dentro del marco Debian (misma mecánica que Combustible y velocidad).
const fs = require('fs'), path = require('path');
const dir = __dirname;
let t = fs.readFileSync(path.join(dir, 'home.js'), 'utf8');
if (t.includes('/*frames*/')) { console.log('ya'); process.exit(0); }
fs.copyFileSync(path.join(dir, 'home.js'), path.join(dir, 'home.js.bak8'));
function rep(a, b, label) {
  const c = t.split(a).length - 1;
  if (c !== 1) throw new Error(label + ': ' + c);
  t = t.replace(a, () => b); console.log('ok', label);
}
rep(`buscar: 'Búsqueda', combustible: 'Combustible y velocidad' };`,
  `buscar: 'Búsqueda', combustible: 'Combustible y velocidad', simulador: 'Simulador de instalación', vista3d: 'Vista 3D' };
  // Páginas que viven dentro del marco Debian y dejan visible una vista de la app (rail = vista de la app).
  var FRAMES = { mapa: { t: 'Data Center' }, combustible: { rail: 'stats', t: 'Combustible y velocidad' }, simulador: { rail: 'sim', t: 'Simulador de instalación' }, vista3d: { rail: '3d', t: 'Vista 3D' } };`, 'FRAMES');
rep(`'<li><a href="#" data-hm-go="sim" title="Simulador de instalación">Simulador</a></li>'`, `'<li><a href="#" data-hm-page="simulador" title="Simulador de instalación">Simulador</a></li>'`, 'navbar sim');
rep(`'<li><a href="#" data-hm-go="3d" title="Tractor en 3D">Vista 3D</a></li>'`, `'<li><a href="#" data-hm-page="vista3d" title="Tractor en 3D">Vista 3D</a></li>'`, 'navbar 3d');
rep(`  function setPage(p, keep) {`, `  function setPage(p, keep, noRail) {`, 'firma setPage');
rep(`(p === 'mapa' || p === 'combustible') ? '' : p === 'buscar'`, `FRAMES[p] ? '' : p === 'buscar'`, 'contenido');
rep(`    var frame = p === 'mapa' || p === 'combustible';`, `    var frame = !!FRAMES[p];`, 'frame');
rep(`sp.textContent = p === 'combustible' ? 'Combustible y velocidad' : 'Data Center';`, `sp.textContent = frame ? FRAMES[p].t : 'Data Center';`, 'banner');
rep(`    if (p === 'combustible' && prevPage !== 'combustible') railClick('stats');
    else if (p !== 'combustible' && prevPage === 'combustible') railClick('fleet');`, `    if (!noRail) {
      var cur = FRAMES[p], was = FRAMES[prevPage];
      if (cur && cur.rail) { if (p !== prevPage) railClick(cur.rail); }
      else if (was && was.rail) railClick('fleet');
    }`, 'rail');
rep(`    if (state.page === 'mapa' || state.page === 'combustible') return;`, `    if (FRAMES[state.page]) return;`, 'refresh');
rep(`if (g === 'stats') return show('combustible');`, `if (g === 'stats') return show('combustible'); if (g === 'sim') return show('simulador'); if (g === '3d') return show('vista3d');`, 'nav');
rep(`      var st0 = e.target.closest('.jd-toolsmenu [data-go="stats"]');
      if (st0) { e.preventDefault(); e.stopPropagation(); closeMenus(); show('combustible'); return; }
      if (e.target.closest('[data-act="stats-close"]') && state.visible && state.page === 'combustible') { setTimeout(function () { setPage('mapa'); }, 30); return; }`,
`      var st0 = e.target.closest('.jd-toolsmenu [data-go="stats"], .jd-toolsmenu [data-go="sim"], .jd-toolsmenu [data-go="3d"]');
      if (st0) { e.preventDefault(); e.stopPropagation(); closeMenus(); show({ stats: 'combustible', sim: 'simulador', '3d': 'vista3d' }[st0.dataset.go]); return; }
      // Cerrar una vista de la app (Volver al mapa) -> Data Center; abrir 3D desde el simulador/tractor -> el marco sigue a Vista 3D
      if (e.target.closest('[data-act="stats-close"],[data-act="sim-close"],[data-act="v3-close"]') && state.visible && FRAMES[state.page] && state.page !== 'mapa') { setTimeout(function () { setPage('mapa'); }, 30); return; }
      if (e.target.closest('[data-act="sim-3d"],[data-act="scene"]') && state.visible) { setTimeout(function () { setPage('vista3d', true, true); }, 40); return; }`, 'capturas');
rep(`if ((state.page === 'mapa' || state.page === 'combustible') && state.visible) measure();`, `if (FRAMES[state.page] && state.visible) measure();`, 'resize');
fs.writeFileSync(path.join(dir, 'home.js'), '/*frames*/\n' + t);

// CSS: mismas reglas de Combustible para #sim-view y #scene-view
let css = fs.readFileSync(path.join(dir, 'extra6.css'), 'utf8');
css = css.replace(/\/\*combustible-debian\*\/[\s\S]*?\n(?=#root)/, '');
const lines = css.split('\n').filter((l) => l.trim() && !l.startsWith('#stats-view header h2') && !l.startsWith('#stats-view li button'));
const out = lines.map((l) => l.replace(/#root\.dh-mapmode #stats-view/g, '#root.dh-mapmode #sim-view,#root.dh-mapmode #scene-view').replace(/#stats-view/g, '#sim-view,#scene-view')).map((l) => {
  // lista de selectores: repite el prefijo del selector para cada vista (selectores "#a,#b .x" -> "#a .x,#b .x")
  const m = l.match(/^([^{]+)\{(.*)$/);
  if (!m || !m[1].includes('#sim-view,#scene-view')) return l;
  const sels = m[1].split(',').map((s) => s.trim());
  const res = [];
  sels.forEach((s) => { if (s.startsWith('#sim-view') || s.startsWith('#scene-view') || s.startsWith('#root')) res.push(s); else res.push(s); });
  return l;
});
// reescritura simple y segura: generar por vista
let gen = '\n/*sim3d-debian*/\n';
for (const id of ['#sim-view', '#scene-view']) {
  gen += css.split('\n').filter((l) => l.includes('#stats-view') && !l.includes('header h2') && !l.includes('li button') && !l.includes('#root.dh-mapmode')).map((l) => l.replace(/#stats-view/g, id)).join('\n') + '\n';
}
gen += '#root.dh-mapmode #sim-view,#root.dh-mapmode #scene-view{top:calc(45px + var(--dh-top,127px))!important;bottom:var(--dh-bot,40px)!important;left:0!important;right:0!important;height:auto!important;z-index:36}\n';
gen += '#scene-view [data-stage]{background:#0f1416}\n#sim-view h2,#scene-view h2{color:#000!important}\n#sim-view .eyebrow,#scene-view .eyebrow{color:#54638c;font-family:sans-serif}\n';
gen += '@media (max-width:700px){#sim-view header .btn span,#scene-view header .btn{font-size:12px}#scene-view header{padding:8px}#scene-view [data-stage]{min-height:50vh}}\n';
fs.writeFileSync(path.join(dir, 'extra8.css'), gen);
console.log('listo');
