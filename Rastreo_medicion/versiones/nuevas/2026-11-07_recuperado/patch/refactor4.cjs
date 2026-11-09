// Portada de Inicio: foto del login a todo el ancho, interactiva y responsive (reemplaza el h1 "panelpack").
const fs = require('fs'), path = require('path');
const dir = __dirname;
let t = fs.readFileSync(path.join(dir, 'home.js'), 'utf8');
if (t.includes('/*hero*/')) { console.log('ya'); process.exit(0); }
fs.copyFileSync(path.join(dir, 'home.js'), path.join(dir, 'home.js.bak4'));
function rep(a, b, label) {
  const c = t.split(a).length - 1;
  if (c !== 1) throw new Error(label + ': ' + c);
  t = t.replace(a, () => b); console.log('ok', label);
}
rep(`return       '<div id="dh-splash"><h1>panelpack</h1></div>' +`,
  `return       '<div id="dh-splash" class="dh-hero"><div class="hero-bg"></div><div class="hero-shade"></div><div class="hero-txt"><h1>panelpack</h1><p class="hero-sub">Agrícola Las Cabras · El Rosario, Sinaloa</p><div class="hero-chips" id="dh-herochips"></div></div></div>' +`, 'hero html');
rep(`    put('dh-kpis',`, `    put('dh-herochips',
      '<a href="#" class="hero-chip" data-hm-page="mapa"><b>' + (k.running == null ? '—' : k.running) + '</b><span>En marcha</span></a>' +
      '<a href="#" class="hero-chip" data-hm-page="alertas"><b>' + (k.nosignal == null ? '—' : k.nosignal) + '</b><span>Sin señal</span></a>' +
      '<a href="#" class="hero-chip" data-hm-page="reportes"><b>' + (k.hours == null ? '—' : fmt(k.hours, 1) + ' h') + '</b><span>Horas motor hoy</span></a>' +
      '<a href="#" class="hero-chip" data-hm-wx="dh-now"><b>' + (k.temp == null ? '—' : fmt(k.temp) + ' °C') + '</b><span>Temperatura</span></a>' +
      '<a href="#" class="hero-chip" data-hm-wx="dh-rain"><b>' + (k.rain == null ? '—' : fmt(k.rain, 1) + ' mm') + '</b><span>Lluvia hoy</span></a>');
    put('dh-kpis',`, 'chips');
rep(`      var tb = e.target.closest('#dh-toolsbtn');`, `      var wx = e.target.closest('[data-hm-wx]'); if (wx) { e.preventDefault(); var we = document.getElementById(wx.dataset.hmWx); if (we) we.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }\n      var tb = e.target.closest('#dh-toolsbtn');`, 'chip clima');
rep(`    if (p === 'inicio') { renderKpis(); renderFleet(); renderWeather(); loadNews(false); }`, `    if (p === 'inicio') { heroWire(); renderKpis(); renderFleet(); renderWeather(); loadNews(false); }`, 'hero wire');
rep(`  /* --- Tools: el menú se abre`, `  // Portada interactiva: el puntero (o el dedo) recorre la foto; al hacer scroll se desplaza más lento (paralaje).
  function heroWire() {
    var h = $('#dh-splash.dh-hero', view); if (!h) return;
    var set = function (x, y) { h.style.setProperty('--px', x.toFixed(3)); h.style.setProperty('--py', y.toFixed(3)); };
    h.addEventListener('pointermove', function (e) { var r = h.getBoundingClientRect(); set((e.clientX - r.left) / r.width * 2 - 1, (e.clientY - r.top) / r.height * 2 - 1); });
    h.addEventListener('pointerleave', function () { set(0, 0); });
  }
  /* --- Tools: el menú se abre`, 'heroWire fn');
rep(`    gsWire();\n`, `    gsWire();\n    view.addEventListener('scroll', function () { var h = $('#dh-splash.dh-hero', view); if (h) h.style.setProperty('--sy', Math.min(1.2, view.scrollTop / 500).toFixed(3)); }, { passive: true });\n`, 'scroll');
fs.writeFileSync(path.join(dir, 'home.js'), '/*hero*/\n' + t);
console.log('listo');
