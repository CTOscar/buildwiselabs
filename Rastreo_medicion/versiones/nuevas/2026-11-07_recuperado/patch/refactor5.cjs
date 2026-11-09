// Flota (panel izquierdo) con arquitectura Debian + Tools como sidebar en responsive (menú hamburguesa).
const fs = require('fs'), path = require('path');
const dir = __dirname;
let t = fs.readFileSync(path.join(dir, 'home.js'), 'utf8');
if (t.includes('/*side-tools*/')) { console.log('ya'); process.exit(0); }
fs.copyFileSync(path.join(dir, 'home.js'), path.join(dir, 'home.js.bak5'));
function rep(a, b, label) {
  const c = t.split(a).length - 1;
  if (c !== 1) throw new Error(label + ': ' + c);
  t = t.replace(a, () => b); console.log('ok', label);
}
// toggleTools: en pantallas angostas se abre como sidebar
rep(`    closeBell(); hb.click();
    var r = btn.getBoundingClientRect();`, `    closeBell(); hb.click();
    if (window.innerWidth < 1024) { sideOn(m); return; }
    var r = btn.getBoundingClientRect();`, 'toggle sidebar');
rep(`  function toolsReset() { var m = toolsMenu(); if (m) { m.style.position = m.style.left = m.style.top = m.style.maxHeight = ''; } }`,
`  function toolsReset() { var m = toolsMenu(); if (m) { m.style.position = m.style.left = m.style.top = m.style.maxHeight = ''; m.classList.remove('dh-side'); } var bd = document.getElementById('dh-sidebd'); if (bd) bd.hidden = true; }
  // Sidebar de Tools (responsive): el menú ocupa un panel lateral con fondo oscurecido.
  function sideOn(m) {
    m.style.position = m.style.left = m.style.top = m.style.maxHeight = ''; m.classList.add('dh-side');
    var bd = document.getElementById('dh-sidebd');
    if (!bd) {
      bd = document.createElement('div'); bd.id = 'dh-sidebd'; document.body.appendChild(bd);
      bd.addEventListener('click', closeMenus);
      try { new MutationObserver(function () { var mm = toolsMenu(); if (mm && mm.hidden) { mm.classList.remove('dh-side'); bd.hidden = true; } }).observe(m, { attributes: true, attributeFilter: ['hidden'] }); } catch (e) { /* sin observer */ }
    }
    bd.hidden = false;
  }
  function openSide() { var m = toolsMenu(), hb = document.querySelector('.jd-tools'); if (!m || !hb) return; closeBell(); if (m.hidden) hb.click(); sideOn(m); }`, 'sidebar fns');
// botón hamburguesa del header -> sidebar con solo Tools
rep(`      var bb = e.target.closest('.jd-top [data-go="alerts"][aria-label="Notificaciones"]');`,
`      if (e.target.closest('#menu-btn')) { e.preventDefault(); e.stopPropagation(); var mm0 = toolsMenu(); if (mm0 && !mm0.hidden && mm0.classList.contains('dh-side')) closeMenus(); else openSide(); return; }
      var bb = e.target.closest('.jd-top [data-go="alerts"][aria-label="Notificaciones"]');`, 'hamburguesa');
fs.writeFileSync(path.join(dir, 'home.js'), '/*side-tools*/\n' + t);
console.log('listo');
