// Tools en la barra Debian, sección "Comenzar" con los enlaces del proyecto, alertas -> componente Alertas.
const fs = require('fs'), path = require('path');
const dir = __dirname;
const rd = (f) => fs.readFileSync(path.join(dir, f), 'utf8');
const wr = (f, t) => fs.writeFileSync(path.join(dir, f), t);

// --- navrow.html ---
let n = rd('navrow.html');
if (!n.includes('<span>Comenzar</span>')) {
  const old = '<button type="button" class="jd-sub" data-go="links">Enlaces</button></div>';
  if (n.split(old).length !== 2) throw new Error('enlaces en Más');
  n = n.replace(old, '</div>');
  const grid = '<svg viewBox="0 0 24 24" class="h-5 w-5" aria-hidden="true"><path d="M11 11H4V4h7zm9-7h-7v7h7zm-9 9H4v7h7zm9 0h-7v7h7z" fill="currentColor"/></svg>';
  const sec = '<div class="jd-sec2"><h4>' + grid + '<span>Comenzar</span></h4><button type="button" class="jd-sub" data-go="links">Enlaces del proyecto</button></div>';
  const m = /<div class="jd-sec2"><h4>(?:(?!<\/div>)[\s\S])*?<span>M[^<]*s<\/span>/.exec(n);
  if (!m) throw new Error('sección Más');
  n = n.slice(0, m.index) + sec + n.slice(m.index);
  wr('navrow.html', n);
  console.log('navrow ok');
}

// --- home.js ---
let t = rd('home.js');
if (t.includes('/*tools-nav*/')) { console.log('home.js ya parcheado'); process.exit(0); }
fs.copyFileSync(path.join(dir, 'home.js'), path.join(dir, 'home.js.bak3'));
function rep(a, b, label) {
  const c = t.split(a).length - 1;
  if (c !== 1) throw new Error(label + ': ' + c + ' coincidencias');
  t = t.replace(a, () => b); console.log('ok', label);
}
rep(`'<li><a href="#" data-hm-page="mapa" title="Mapa de la flota">Mapa</a></li>' +`,
  `'<li class="dh-tools"><a href="#" id="dh-toolsbtn" aria-haspopup="true" aria-expanded="false" title="Tools">Tools &#9662;</a></li>' +\n          '<li><a href="#" data-hm-page="mapa" title="Mapa de la flota">Mapa</a></li>' +`, 'li tools');
rep(`      var pg = e.target.closest('[data-hm-page]');`,
  `      var tb = e.target.closest('#dh-toolsbtn'); if (tb) { e.preventDefault(); return toggleTools(tb); }\n      var pg = e.target.closest('[data-hm-page]');`, 'clic tools');
rep(`  /* --- Campana de alertas (ventana bajo el icono, estilo Debian) --- */`, `  /* --- Tools: el menú se abre desde la barra de navegación Debian --- */
  var toolsWas = false;
  function toolsMenu() { return document.querySelector('.jd-toolsmenu'); }
  function toolsReset() { var m = toolsMenu(); if (m) { m.style.position = m.style.left = m.style.top = m.style.maxHeight = ''; } }
  function toggleTools(btn) {
    var m = toolsMenu(), hb = document.querySelector('.jd-tools'); if (!m || !hb) return;
    if (toolsWas) { toolsWas = false; btn.setAttribute('aria-expanded', 'false'); return; }
    closeBell(); hb.click();
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
  /* --- Campana de alertas (ventana bajo el icono, estilo Debian) --- */`, 'funciones');
rep(`return '<div class="project-news">' + calBox(x.at) + '<div class="project-news-content"><a href="#" data-hm-event="' + x.e.deviceId + '">'`,
  `return '<div class="project-news' + (state.alFocus === x.e.id ? ' dh-hit' : '') + '" id="al-' + x.e.id + '">' + calBox(x.at) + '<div class="project-news-content"><a href="#" data-hm-event="' + x.e.deviceId + '">'`, 'filas alertas');
rep(`<div><a href="#" data-bell-ev="' + x.e.deviceId + '">'`, `<div><a href="#" data-bell-ev="' + x.e.id + '">'`, 'campana id');
rep(`if (a.dataset.bellEv) { closeBell(); openDevice(Number(a.dataset.bellEv)); }`, `if (a.dataset.bellEv) { closeBell(); openAlert(Number(a.dataset.bellEv)); }`, 'campana abre alerta');
rep(`e: ago(x.at), dot: x.i.high ? 'crit' : '', go: ['dev', x.e.deviceId] };`, `e: ago(x.at), dot: x.i.high ? 'crit' : '', go: ['alert', x.e.id] };`, 'busqueda alertas');
rep(`e: ago(x.at), dot: 'crit', go: ['dev', x.e.deviceId] };`, `e: ago(x.at), dot: 'crit', go: ['alert', x.e.id] };`, 'busqueda combustible');
rep(`    if (k === 'dev') return openDevice(g[1]);`, `    if (k === 'dev') return openDevice(g[1]);\n    if (k === 'alert') return openAlert(g[1]);`, 'go alert');
rep(`view.classList.remove('dh-map'); root.classList.remove('dh-mapmode'); setActive(false); }`, `view.classList.remove('dh-map'); root.classList.remove('dh-mapmode'); setActive(false); toolsReset(); }`, 'hide reset');
rep(`      var al = e.target.closest('.jd-toolsmenu [data-go="alerts"]');`, `      if (e.target.closest('.jd-toolsmenu [data-go="links"]')) anchorLinks();\n      var al = e.target.closest('.jd-toolsmenu [data-go="alerts"]');`, 'anclaje enlaces');
rep(`    gsWire();`, `    gsWire();\n    var tbn = $('#dh-toolsbtn', view); if (tbn) tbn.addEventListener('pointerdown', function () { var m = toolsMenu(); toolsWas = !!(m && !m.hidden); }, true);`, 'pointerdown tools');
wr('home.js', '/*tools-nav*/\n' + t);
console.log('listo');
