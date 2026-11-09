// Login: sección "Crear cuenta de cliente nuevo" con requisitos (estilo map.deere.com).
module.exports = function (rep) {
  const sel = (id, label, ph, opts, ic) => `
      <div>
        <label for="${id}" class="mb-1.5 inline-block text-sm font-medium">${label}</label>
        <div class="relative">
          <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">\${G("${ic}","h-[18px] w-[18px]")}</span>
          <select id="${id}" name="${id}" required class="\${Na} appearance-none pr-9">
            <option value="">${ph}</option>${opts.map((o) => `<option>${o}</option>`).join('')}
          </select>
          <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rotate-180 text-muted">\${G("chevronUp","h-4 w-4")}</span>
        </div>
      </div>`;

  // Título y requisitos
  rep('<h1 class="mb-2 font-display text-3xl font-bold tracking-tight">Crear cuenta</h1>',
    '<h1 class="mb-2 font-display text-3xl font-bold tracking-tight">Crear cuenta de cliente nuevo</h1>', 'reg-titulo');
  rep('<p class="text-sm text-muted">Crea tu perfil para consultar la flota, las horas de motor y las alertas.</p>',
    `<p class="text-sm text-muted">Registra tu organización para consultar la flota, las horas de motor, el combustible y las alertas.</p>
      <details open class="mt-5 rounded-xl border border-line bg-raise p-4 text-sm">
        <summary class="cursor-pointer font-semibold">Requisitos para crear tu cuenta</summary>
        <ul class="mt-3 grid gap-2 text-muted">
          <li class="flex gap-2"><b class="text-ok">1</b><span>Un <b class="text-fg">correo electrónico válido</b>: será tu usuario para entrar.</span></li>
          <li class="flex gap-2"><b class="text-ok">2</b><span>El <b class="text-fg">nombre de tu organización o rancho</b> y su ciudad o municipio.</span></li>
          <li class="flex gap-2"><b class="text-ok">3</b><span>El <b class="text-fg">tamaño aproximado de tu flota</b> y el uso que le darás al panel.</span></li>
          <li class="flex gap-2"><b class="text-ok">4</b><span><b class="text-fg">RFC</b> de la organización, opcional, para facturación.</span></li>
          <li class="flex gap-2"><b class="text-ok">5</b><span>Una <b class="text-fg">contraseña segura</b>: 8 caracteres o más, con mayúscula, minúscula, número y símbolo.</span></li>
          <li class="flex gap-2"><b class="text-ok">6</b><span>Aceptar los <b class="text-fg">términos y el aviso de privacidad</b>.</span></li>
        </ul>
        <p class="mt-3 text-xs text-muted">Después de registrarte, el administrador de tu organización podrá asignarte tractores, lotes y permisos.</p>
      </details>`, 'reg-requisitos');

  // Datos de la organización (antes de la contraseña)
  rep('${va({id:"password",label:"Contraseña",autocomplete:"new-password",placeholder:"Mínimo 8 caracteres"})}',
    `<div class="grid gap-5 sm:grid-cols-2">
        \${gn({id:"org",label:"Organización o rancho",placeholder:"Agrícola Las Cabras",autocomplete:"organization",ic:"briefcase"})}
        \${gn({id:"rfc",label:"RFC",placeholder:"AAA010101AAA",autocomplete:"off",ic:"doc",required:!1})}
      </div>
      <div class="grid gap-5 sm:grid-cols-2">
        \${gn({id:"ciudad",label:"Ciudad o municipio",placeholder:"El Rosario, Sinaloa",autocomplete:"address-level2",ic:"contact"})}${sel('flota', 'Tamaño de tu flota', 'Selecciona', ['1 a 5 tractores', '6 a 20 tractores', '21 a 50 tractores', '51 a 100 tractores', 'Más de 100 tractores'], 'gauge')}
      </div>
      ${sel('uso', 'Para qué usarás el panel', 'Selecciona', ['Horas de motor y mantenimiento', 'Combustible y consumo', 'Lotes y geocercas', 'Alertas y seguridad', 'Todo lo anterior'], 'layers').replace(' required', '')}
      \${va({id:"password",label:"Contraseña",autocomplete:"new-password",placeholder:"Mínimo 8 caracteres"})}`, 'reg-campos');

  // Lista de requisitos de contraseña
  rep('<span id="pw-label" class="text-xs text-muted">Usa al menos 8 caracteres, con números y mayúsculas.</span>',
    `<span id="pw-label" class="text-xs text-muted">Usa al menos 8 caracteres, con números y mayúsculas.</span>
        <ul id="pw-req" class="mt-1 grid gap-1 text-xs text-muted sm:grid-cols-2">
          <li><span>○ </span>8 o más caracteres</li><li><span>○ </span>Una mayúscula</li><li><span>○ </span>Una minúscula</li><li><span>○ </span>Un número</li><li><span>○ </span>Un símbolo (!@#$…)</li>
        </ul>`, 'reg-pwlista');
  rep('r.password.addEventListener("input",()=>{const d=r.password.value,h=nd(d)',
    'r.password.addEventListener("input",()=>{window.__pwReq&&window.__pwReq(r);const d=r.password.value,h=nd(d)', 'reg-pwjs');

  // Validación y datos enviados
  rep('confirm:r.confirm.value},f=[];',
    'confirm:r.confirm.value,org:r.org.value.trim(),rfc:r.rfc.value.trim().toUpperCase(),ciudad:r.ciudad.value.trim(),flota:r.flota.value,uso:r.uso.value},f=[];fe(r.org,!h.org),fe(r.ciudad,!h.ciudad),fe(r.flota,!h.flota),h.org||f.push("tu organización"),h.ciudad||f.push("tu ciudad o municipio"),h.flota||f.push("el tamaño de tu flota");', 'reg-datos');
  rep('if(h.password!==h.confirm)return Ut(r,"Las contraseñas no coinciden.");',
    'if(h.password!==h.confirm)return Ut(r,"Las contraseñas no coinciden.");if(window.__pwOk&&!window.__pwOk(h.password))return Ut(r,"La contraseña debe cumplir todos los requisitos de la lista.");if(h.rfc&&!/^[A-ZÑ&]{3,4}\\d{6}[A-Z0-9]{3}$/.test(h.rfc))return Ut(r,"El RFC no tiene un formato válido.");', 'reg-validar');
  rep('attributes:{puesto:h.puesto}',
    'attributes:{puesto:h.puesto,organizacion:h.org,rfc:h.rfc,ciudad:h.ciudad,flota:h.flota,uso:h.uso,tipoCuenta:"cliente"}', 'reg-attrs');

  // Login: invitación visible a crear cuenta de cliente nuevo
  rep('<p class="mt-6 text-center text-sm">¿No tienes cuenta? <a href="#/registro" class="ml-1 rounded font-medium text-accent hover:underline">Crear cuenta</a></p>',
    `<div class="mt-6 rounded-xl border border-line bg-raise p-4 text-sm">
        <b class="text-base">¿Eres cliente nuevo?</b>
        <p class="mt-1 text-muted">Crea la cuenta de tu organización. Solo necesitas un correo, los datos de tu rancho y una contraseña segura.</p>
        <a href="#/registro" class="btn btn-primary mt-3 inline-flex h-10 items-center rounded-[10px] px-4">Crear cuenta de cliente nuevo</a>
      </div>`, 'login-invitacion');
};
