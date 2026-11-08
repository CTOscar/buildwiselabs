// Perfil / sesión: ventana bajo el icono de usuario (no en el panel izquierdo).
const fs = require('fs'), path = require('path');
const dir = __dirname;
// navwire: exponer setView
let nw = fs.readFileSync(path.join(dir, 'navwire.js'), 'utf8');
if (!nw.includes('setView:Wt')) { nw = nw.replace('select:Le};', 'select:Le,setView:Wt};'); fs.writeFileSync(path.join(dir, 'navwire.js'), nw); console.log('ok navwire'); }

let t = fs.readFileSync(path.join(dir, 'home.js'), 'utf8');
if (t.includes('/*perfil*/')) { console.log('ya'); process.exit(0); }
fs.copyFileSync(path.join(dir, 'home.js'), path.join(dir, 'home.js.bak9'));
function rep(a, b, label) {
  const c = t.split(a).length - 1;
  if (c !== 1) throw new Error(label + ': ' + c);
  t = t.replace(a, () => b); console.log('ok', label);
}
rep(`  /* --- Campana de alertas (ventana bajo el icono, estilo Debian) --- */`, `  /* --- Perfil y sesión: ventana bajo el icono de usuario --- */
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
    var av = document.querySelector('[data-avatar]'); if (av) av.click();
    setTimeout(function () {
      try { if (prevView === 'device' && prevSel != null && P0.select) P0.select(prevSel); else if (P0.setView) P0.setView(prevView === 'profile' ? 'fleet' : prevView); } catch (e) { /* sin vista previa */ }
    }, 0);
    var r = btn.getBoundingClientRect();
    prof.style.top = r.bottom + 'px'; prof.style.right = Math.max(8, window.innerWidth - r.right - 8) + 'px';
    prof.hidden = false; btn.setAttribute('aria-expanded', 'true');
  }
  /* --- Campana de alertas (ventana bajo el icono, estilo Debian) --- */`, 'funciones perfil');
rep(`      var bb = e.target.closest('.jd-top [data-go="alerts"][aria-label="Notificaciones"]');`, `      var ub = e.target.closest('.jd-top .jd-user');
      if (ub) { e.preventDefault(); e.stopPropagation(); toggleProfile(ub); return; }
      if (prof && !prof.hidden && !e.target.closest('#dh-prof')) closeProfile();
      var bb = e.target.closest('.jd-top [data-go="alerts"][aria-label="Notificaciones"]');`, 'captura perfil');
rep(`jq(document).on('keydown', function (e) { if (e.key === 'Escape') closeBell(); });
    jq(window).on('resize', closeBell);`, `jq(document).on('keydown', function (e) { if (e.key === 'Escape') { closeBell(); closeProfile(); } });
    jq(window).on('resize', function () { closeBell(); closeProfile(); });`, 'teclado');
fs.writeFileSync(path.join(dir, 'home.js'), '/*perfil*/\n' + t);
console.log('listo');
