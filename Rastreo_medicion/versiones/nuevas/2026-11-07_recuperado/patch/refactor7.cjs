// Eventos de la interfaz con jQuery (delegación de eventos, un manejador por acción).
const fs = require('fs'), path = require('path');
const dir = __dirname;
let t = fs.readFileSync(path.join(dir, 'home.js'), 'utf8');
if (t.includes('/*jquery*/')) { console.log('ya'); process.exit(0); }
fs.copyFileSync(path.join(dir, 'home.js'), path.join(dir, 'home.js.bak7'));
function rep(a, b, label) {
  const c = t.split(a).length - 1;
  if (c !== 1) throw new Error(label + ': ' + c);
  t = t.replace(a, () => b); console.log('ok', label);
}
function cut(a, b, nw, label) { // reemplaza desde a hasta el final de b (incluido)
  const i = t.indexOf(a), j = t.indexOf(b, i);
  if (i < 0 || j < 0) throw new Error(label + ': marcadores');
  t = t.slice(0, i) + nw + t.slice(j + b.length); console.log('ok', label);
}

rep(`  'use strict';\n`, `  'use strict';\n  var jq = window.jQuery; // jQuery 3.x (assets/jquery.min.js)\n`, 'alias jq');

// 1) Clics de la vista: delegación con jQuery
cut(`    view.addEventListener('click', function (e) {\n      var el = e.target.closest('[data-earth-l]`, `if (e.target.closest('[data-hm-refresh]')) { loadWeather(true); loadNews(true); }\n    });\n`,
`    var $view = jq(view), stop = function (e) { e.preventDefault(); };
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
`, 'clics vista');
cut(`    // Búsqueda: reutiliza el buscador de la app (tractor, IMEI o lote)\n`, `b && b.click(); });\n`, ``, 'quitar búsqueda y tema nativos');

// 2) Ventana de búsqueda global
rep(`gsBox.addEventListener('mousedown', function (e) { e.preventDefault(); }); gsBox.addEventListener('click', function (e) { var a = e.target.closest('a'); if (!a) return; e.preventDefault(); if (a.dataset.gsAll) return gsSubmit(); if (a.dataset.gsI) gsGo(gsFlat[Number(a.dataset.gsI)]); }); }`,
  `jq(gsBox).on('mousedown', function (e) { e.preventDefault(); }).on('click', 'a', function (e) { e.preventDefault(); if (this.dataset.gsAll) return gsSubmit(); if (this.dataset.gsI) gsGo(gsFlat[Number(this.dataset.gsI)]); }); }`, 'gsBox jq');
rep(`    qi.addEventListener('focus', function () { if (norm(qi.value).trim()) gsDrop(); });`, `    jq(qi).on('focus', function () { if (norm(qi.value).trim()) gsDrop(); });`, 'focus jq');
rep(`    var cl = document.getElementById('q-clear'); if (cl) cl.addEventListener('click', closeGS);`, `    jq('#q-clear').on('click', closeGS);`, 'clear jq');

// 3) Portada interactiva
rep(`    h.addEventListener('pointermove', function (e) { var r = h.getBoundingClientRect(), x`, `    jq(h).on('pointermove', function (e) { var r = h.getBoundingClientRect(), x`, 'hero move');
rep(`h.style.setProperty('--gy', ((y + 1) * 50).toFixed(1) + '%'); });\n    h.addEventListener('pointerleave', function () { set(0, 0); });`, `h.style.setProperty('--gy', ((y + 1) * 50).toFixed(1) + '%'); })\n      .on('pointerleave', function () { set(0, 0); });`, 'hero leave');

// 4) Sidebar, campana, teclado y ventana
rep(`      bd.addEventListener('click', closeMenus);`, `      jq(bd).on('click', closeMenus);`, 'backdrop');
rep(`      bell.addEventListener('click', function (e) {
        var a = e.target.closest('a'); if (!a) return; e.preventDefault();
        if (a.dataset.bellF) { bellAll = a.dataset.bellF === 'todos'; return fillBell(); }
        if (a.dataset.bellAll) { closeBell(); return show('alertas'); }
        if (a.dataset.bellEv) { closeBell(); openAlert(Number(a.dataset.bellEv)); }
      });`, `      jq(bell).on('click', 'a', function (e) {
        e.preventDefault(); var d = this.dataset;
        if (d.bellF) { bellAll = d.bellF === 'todos'; return fillBell(); }
        if (d.bellAll) { closeBell(); return show('alertas'); }
        if (d.bellEv) { closeBell(); openAlert(Number(d.bellEv)); }
      });`, 'campana');
rep(`    view.addEventListener('scroll', function () { var h = $('#dh-splash.dh-hero', view); if (h) h.style.setProperty('--sy', Math.min(1.2, view.scrollTop / 500).toFixed(3)); }, { passive: true });`,
  `    jq(view).on('scroll', function () { var h = $('#dh-splash.dh-hero', view); if (h) h.style.setProperty('--sy', Math.min(1.2, view.scrollTop / 500).toFixed(3)); });`, 'scroll');
rep(`    var tbn = $('#dh-toolsbtn', view); if (tbn) tbn.addEventListener('pointerdown', function () { var m = toolsMenu(); toolsWas = !!(m && !m.hidden); }, true);`,
  `    jq(view).on('pointerdown', '#dh-toolsbtn', function () { var m = toolsMenu(); toolsWas = !!(m && !m.hidden); }); // el menú se cierra en el pointerdown de document (burbuja): este manejador corre antes`, 'pointerdown tools');
rep(`    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeBell(); });
    window.addEventListener('resize', closeBell);`, `    jq(document).on('keydown', function (e) { if (e.key === 'Escape') closeBell(); });
    jq(window).on('resize', closeBell);`, 'teclado');
fs.writeFileSync(path.join(dir, 'home.js'), '/*jquery*/\n' + t);
console.log('listo');
