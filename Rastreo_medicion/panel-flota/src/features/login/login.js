// Pantallas de acceso: Entrar, Crear cuenta y Recuperar contraseña.
// Basadas en el formulario de inicio de sesión proporcionado, adaptadas a los tokens del proyecto.
import { icon } from '../../components/icons.js';
import { escapeHtml } from '../../lib/format.js';
import { logo } from '../../components/brand.js';

export const PUESTOS = ['Departamento de Maquinaria', 'Taller', 'Supervisor de campo', 'Dirección', 'Desarrollo / TI'];
const REMEMBER_KEY = 'pf-remember-email';

const inputCls =
  'w-full rounded-lg border border-line bg-panel py-2.5 pl-10 pr-3 text-sm text-fg placeholder:text-muted/70 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30 aria-[invalid=true]:border-crit';

function field({ id, label, type = 'text', placeholder = '', autocomplete = 'off', ic, required = true, value = '', hint = '' }) {
  return `
    <div>
      <label for="${id}" class="mb-1.5 inline-block text-sm font-medium">${label}${required ? '' : ' <span class="font-normal text-muted">(opcional)</span>'}</label>
      <div class="relative">
        <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">${icon(ic, 'h-[18px] w-[18px]')}</span>
        <input id="${id}" name="${id}" type="${type}" placeholder="${placeholder}" autocomplete="${autocomplete}" value="${escapeHtml(value)}" ${required ? 'required' : ''} class="${inputCls}" />
      </div>
      ${hint ? `<p class="mt-1 text-xs text-muted">${hint}</p>` : ''}
    </div>`;
}

function passwordField({ id, label, autocomplete, placeholder = '••••••••', extra = '' }) {
  return `
    <div>
      <div class="mb-1.5 flex items-center justify-between">
        <label for="${id}" class="text-sm font-medium">${label}</label>
        ${extra}
      </div>
      <div class="relative">
        <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">${icon('lock', 'h-[18px] w-[18px]')}</span>
        <input id="${id}" name="${id}" type="password" placeholder="${placeholder}" autocomplete="${autocomplete}" required class="${inputCls} pr-11" />
        <button type="button" data-toggle="${id}" aria-label="Mostrar contraseña" aria-pressed="false"
          class="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-muted transition hover:bg-raise hover:text-fg">
          ${icon('eyeOff', 'h-[18px] w-[18px]')}
        </button>
      </div>
    </div>`;
}

function checkbox({ id, label, checked = false, required = false }) {
  return `
    <label class="group flex cursor-pointer items-start gap-3 text-sm">
      <input id="${id}" name="${id}" type="checkbox" class="sr-only" ${checked ? 'checked' : ''} ${required ? 'required' : ''} />
      <span aria-hidden="true" class="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border border-line bg-panel transition
        group-has-[input:checked]:border-accent group-has-[input:checked]:bg-accent
        group-has-[input:focus-visible]:ring-2 group-has-[input:focus-visible]:ring-accent/40">
        <svg class="h-3 w-3 text-accent-ink opacity-0 group-has-[input:checked]:opacity-100" viewBox="0 0 12 10" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 5l3 3 7-7"/></svg>
      </span>
      <span class="text-fg/80">${label}</span>
    </label>`;
}

const googleLogo = `<svg class="h-[18px] w-[18px]" viewBox="0 0 512 512" aria-hidden="true">
  <path fill="#fbbd00" d="M120 256c0-25.367 6.989-49.13 19.131-69.477v-86.308H52.823C18.568 144.703 0 198.922 0 256s18.568 111.297 52.823 155.785h86.308v-86.308C126.989 305.13 120 281.367 120 256z"/>
  <path fill="#0f9d58" d="m256 392-60 60 60 60c57.079 0 111.297-18.568 155.785-52.823v-86.216h-86.216C305.044 385.147 281.181 392 256 392z"/>
  <path fill="#31aa52" d="m139.131 325.477-86.308 86.308a260.085 260.085 0 0 0 22.158 25.235C123.333 485.371 187.62 512 256 512V392c-49.624 0-93.117-26.72-116.869-66.523z"/>
  <path fill="#3c79e6" d="M512 256a258.24 258.24 0 0 0-4.192-46.377l-2.251-12.299H256v120h121.452a135.385 135.385 0 0 1-51.884 55.638l86.216 86.216a260.085 260.085 0 0 0 25.235-22.158C485.371 388.667 512 324.38 512 256z"/>
  <path fill="#cf2d48" d="m352.167 159.833 10.606 10.606 84.853-84.852-10.606-10.606C388.668 26.629 324.381 0 256 0l-60 60 60 60c36.326 0 70.479 14.146 96.167 39.833z"/>
  <path fill="#eb4132" d="M256 120V0C187.62 0 123.333 26.629 74.98 74.98a259.849 259.849 0 0 0-22.158 25.235l86.308 86.308C162.883 146.72 206.376 120 256 120z"/>
</svg>`;

function frame(inner, { wide = false } = {}) {
  return `
  <main class="relative grid min-h-[100dvh] place-items-center bg-[#050608] px-4 py-8 md:px-8">
    <div aria-hidden="true" class="pointer-events-none absolute inset-x-0 top-0 h-[45vh] bg-[radial-gradient(60%_100%_at_50%_0%,rgba(157,107,153,0.14),transparent)]"></div>
    <div class="relative w-full ${wide ? 'max-w-lg' : 'max-w-md'}">
      <div class="rounded-2xl border border-line bg-panel p-6 shadow-[0_24px_60px_rgba(0,0,0,0.55)] md:p-8">
        <div class="mb-6 flex justify-center">
          <a href="https://buildwiselabs.net" target="_blank" rel="noopener" class="rounded-lg">${logo({ mark: 'h-11 w-11', text: 'text-2xl' })}</a>
        </div>
        ${inner}
      </div>
      <p class="mt-4 text-center text-xs text-[#8b93a7]">Rastreo y Medición · Una solución de BuildWise Labs</p>
    </div>
  </main>`;
}

const alertBox = '<div id="form-msg" role="alert" class="hidden rounded-lg border px-3 py-2.5 text-sm"></div>';
function showMsg(form, text, kind = 'error') {
  const el = form.querySelector('#form-msg');
  el.textContent = text;
  el.className = `rounded-lg border px-3 py-2.5 text-sm ${kind === 'error' ? 'border-crit/40 bg-crit/10 text-crit' : kind === 'ok' ? 'border-ok/40 bg-ok/10 text-ok' : 'border-info/40 bg-info/10 text-info'}`;
}
function setBusy(btn, busy, label) {
  btn.disabled = busy;
  btn.innerHTML = busy ? `<span class="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"></span>${label}` : label;
}
const mark = (input, bad) => input.setAttribute('aria-invalid', String(bad));
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

function wireToggles(root) {
  root.querySelectorAll('[data-toggle]').forEach((b) =>
    b.addEventListener('click', () => {
      const input = root.querySelector('#' + b.dataset.toggle);
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      b.setAttribute('aria-pressed', String(show));
      b.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña');
      b.innerHTML = icon(show ? 'eye' : 'eyeOff', 'h-[18px] w-[18px]');
    }),
  );
}

function strength(pw) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(4, s);
}
const STRENGTH = [
  ['Muy débil', 'bg-crit', 'text-crit'],
  ['Débil', 'bg-crit', 'text-crit'],
  ['Aceptable', 'bg-warn', 'text-warn'],
  ['Buena', 'bg-ok', 'text-ok'],
  ['Fuerte', 'bg-ok', 'text-ok'],
];

/* ---------- Entrar ---------- */
function loginScreen(app, client, done) {
  let remembered = '';
  try {
    remembered = localStorage.getItem(REMEMBER_KEY) || '';
  } catch {
    /* nada */
  }
  const mock = client.mode === 'mock';
  app.innerHTML = frame(`
    <div class="text-center">
      <h1 class="mb-2 font-display text-3xl font-bold tracking-tight">Bienvenido de nuevo</h1>
      <p class="text-sm text-muted">Escribe tu correo y contraseña para entrar al panel de flota.</p>
    </div>
    <form id="f" class="mt-8 space-y-5" novalidate>
      ${mock ? `<div class="rounded-lg border border-info/40 bg-info/10 px-3 py-2.5 text-sm text-info">Modo simulado: entra con <b class="font-mono">demo@buildwiselabs.mx</b> / <b class="font-mono">demo1234</b> o crea una cuenta.</div>` : ''}
      ${alertBox}
      ${field({ id: 'email', label: 'Correo', type: 'email', placeholder: 'nombre@empresa.mx', autocomplete: 'username', ic: 'mail', value: remembered })}
      ${passwordField({ id: 'password', label: 'Contraseña', autocomplete: 'current-password', extra: '<a href="#/recuperar" class="rounded text-sm font-medium text-accent hover:underline">¿Olvidaste tu contraseña?</a>' })}
      ${checkbox({ id: 'remember', label: 'Recordarme en este equipo', checked: Boolean(remembered) })}
      <button type="submit" class="btn btn-primary w-full rounded-lg py-2.5">Entrar</button>
    </form>
    <div class="my-6 flex items-center gap-4">
      <hr class="w-full border-line" /><p class="text-sm text-muted">o</p><hr class="w-full border-line" />
    </div>
    <button type="button" id="google" class="flex w-full items-center justify-center gap-2.5 rounded-lg border border-line bg-panel px-3.5 py-2.5 text-sm font-semibold transition hover:bg-raise">
      ${googleLogo} Continuar con Google
    </button>
    <p class="mt-6 text-center text-sm">¿No tienes cuenta? <a href="#/registro" class="ml-1 rounded font-medium text-accent hover:underline">Crear cuenta</a></p>`);

  const form = app.querySelector('#f');
  wireToggles(form);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = form.email.value.trim();
    const password = form.password.value;
    const remember = form.remember.checked;
    mark(form.email, !isEmail(email));
    mark(form.password, !password);
    if (!isEmail(email) || !password) return showMsg(form, 'Escribe un correo válido y tu contraseña.');
    const btn = form.querySelector('[type=submit]');
    setBusy(btn, true, 'Entrando…');
    try {
      const user = await client.login(email, password, remember);
      try {
        if (remember) localStorage.setItem(REMEMBER_KEY, email);
        else localStorage.removeItem(REMEMBER_KEY);
      } catch {
        /* nada */
      }
      done(user);
    } catch (ex) {
      setBusy(btn, false, 'Entrar');
      showMsg(form, ex.status === 401 ? 'Correo o contraseña incorrectos.' : 'No se pudo conectar con el servidor de rastreo. Revisa tu conexión e intenta de nuevo.');
    }
  });
  app.querySelector('#google').addEventListener('click', () => {
    const url = client.openIdUrl?.();
    if (url) location.href = url;
    else showMsg(form, 'El inicio con Google se activa cuando el servidor Traccar tenga OpenID configurado.', 'info');
  });
  (remembered ? form.password : form.email).focus();
}

/* ---------- Crear cuenta ---------- */
function registerScreen(app, client, done) {
  app.innerHTML = frame(
    `
    <div class="text-center">
      <h1 class="mb-2 font-display text-3xl font-bold tracking-tight">Crear cuenta</h1>
      <p class="text-sm text-muted">Crea tu perfil para consultar la flota, las horas de motor y las alertas.</p>
    </div>
    <form id="f" class="mt-8 space-y-5" novalidate>
      ${alertBox}
      <div class="grid gap-5 sm:grid-cols-2">
        ${field({ id: 'name', label: 'Nombre completo', placeholder: 'Nombre y apellido', autocomplete: 'name', ic: 'user' })}
        ${field({ id: 'phone', label: 'Teléfono', type: 'tel', placeholder: '669 000 0000', autocomplete: 'tel', ic: 'phone', required: false })}
      </div>
      ${field({ id: 'email', label: 'Correo', type: 'email', placeholder: 'nombre@empresa.mx', autocomplete: 'email', ic: 'mail' })}
      <div>
        <label for="puesto" class="mb-1.5 inline-block text-sm font-medium">Área o puesto</label>
        <div class="relative">
          <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">${icon('briefcase', 'h-[18px] w-[18px]')}</span>
          <select id="puesto" name="puesto" required class="${inputCls} appearance-none pr-9">
            <option value="">Selecciona tu área</option>
            ${PUESTOS.map((p) => `<option>${p}</option>`).join('')}
          </select>
          <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rotate-180 text-muted">${icon('chevronUp', 'h-4 w-4')}</span>
        </div>
      </div>
      ${passwordField({ id: 'password', label: 'Contraseña', autocomplete: 'new-password', placeholder: 'Mínimo 8 caracteres' })}
      <div class="-mt-2 grid gap-1.5" aria-live="polite">
        <div class="grid grid-cols-4 gap-1.5">${[0, 1, 2, 3].map((i) => `<span data-bar="${i}" class="h-1.5 rounded-full bg-raise transition"></span>`).join('')}</div>
        <span id="pw-label" class="text-xs text-muted">Usa al menos 8 caracteres, con números y mayúsculas.</span>
      </div>
      ${passwordField({ id: 'confirm', label: 'Confirmar contraseña', autocomplete: 'new-password', placeholder: 'Repite la contraseña' })}
      ${checkbox({ id: 'terms', label: 'Acepto el uso de mis datos para acceder al sistema de control de maquinaria.', required: true })}
      <button type="submit" class="btn btn-primary w-full rounded-lg py-2.5">Crear cuenta</button>
    </form>
    <p class="mt-6 text-center text-sm">¿Ya tienes cuenta? <a href="#/entrar" class="ml-1 rounded font-medium text-accent hover:underline">Entrar</a></p>`,
    { wide: true },
  );

  const form = app.querySelector('#f');
  wireToggles(form);
  const bars = [...form.querySelectorAll('[data-bar]')];
  const pwLabel = form.querySelector('#pw-label');
  form.password.addEventListener('input', () => {
    const pw = form.password.value;
    const s = strength(pw);
    const [label, bg, text] = STRENGTH[s];
    bars.forEach((b, i) => (b.className = `h-1.5 rounded-full transition ${pw && i < Math.max(1, s) ? bg : 'bg-raise'}`));
    pwLabel.className = `text-xs ${pw ? text : 'text-muted'}`;
    pwLabel.textContent = pw ? `Seguridad: ${label}` : 'Usa al menos 8 caracteres, con números y mayúsculas.';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = {
      name: form.name.value.trim(),
      phone: form.phone.value.trim(),
      email: form.email.value.trim(),
      puesto: form.puesto.value,
      password: form.password.value,
      confirm: form.confirm.value,
    };
    const errors = [];
    mark(form.name, !v.name);
    mark(form.email, !isEmail(v.email));
    mark(form.puesto, !v.puesto);
    mark(form.password, v.password.length < 8);
    mark(form.confirm, v.password !== v.confirm);
    if (!v.name) errors.push('tu nombre');
    if (!isEmail(v.email)) errors.push('un correo válido');
    if (!v.puesto) errors.push('tu área');
    if (v.password.length < 8) errors.push('una contraseña de 8 caracteres o más');
    if (errors.length) return showMsg(form, `Falta ${errors.join(', ')}.`);
    if (v.password !== v.confirm) return showMsg(form, 'Las contraseñas no coinciden.');
    if (!form.terms.checked) return showMsg(form, 'Acepta el uso de datos para continuar.');

    const btn = form.querySelector('[type=submit]');
    setBusy(btn, true, 'Creando cuenta…');
    try {
      await client.register({ name: v.name, email: v.email, phone: v.phone, password: v.password, attributes: { puesto: v.puesto } });
      const user = await client.login(v.email, v.password, true);
      done(user);
    } catch (ex) {
      setBusy(btn, false, 'Crear cuenta');
      showMsg(
        form,
        ex.status === 400
          ? 'Ese correo ya tiene cuenta. Entra con él o recupera tu contraseña.'
          : ex.status === 403 || ex.status === 401
            ? 'El registro está desactivado en el servidor. Pide tu cuenta al administrador.'
            : 'No se pudo crear la cuenta. Revisa tu conexión e intenta de nuevo.',
      );
    }
  });
  form.name.focus();
}

/* ---------- Recuperar contraseña ---------- */
function forgotScreen(app, client) {
  app.innerHTML = frame(`
    <div class="text-center">
      <h1 class="mb-2 font-display text-3xl font-bold tracking-tight">Recuperar contraseña</h1>
      <p class="text-sm text-muted">Te enviaremos un enlace a tu correo para crear una contraseña nueva.</p>
    </div>
    <form id="f" class="mt-8 space-y-5" novalidate>
      ${alertBox}
      ${field({ id: 'email', label: 'Correo', type: 'email', placeholder: 'nombre@empresa.mx', autocomplete: 'email', ic: 'mail' })}
      <button type="submit" class="btn btn-primary w-full rounded-lg py-2.5">Enviar enlace</button>
    </form>
    <p class="mt-6 text-center text-sm"><a href="#/entrar" class="inline-flex items-center gap-1.5 rounded font-medium text-accent hover:underline">${icon('arrowLeft', 'h-4 w-4')}Volver a entrar</a></p>`);
  const form = app.querySelector('#f');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = form.email.value.trim();
    mark(form.email, !isEmail(email));
    if (!isEmail(email)) return showMsg(form, 'Escribe un correo válido.');
    const btn = form.querySelector('[type=submit]');
    setBusy(btn, true, 'Enviando…');
    try {
      await client.resetPassword(email);
    } catch {
      /* Mismo mensaje siempre: no revela si el correo existe */
    }
    setBusy(btn, false, 'Enviar enlace');
    showMsg(form, 'Si el correo tiene cuenta, te llegará un enlace en unos minutos. Revisa también la carpeta de spam.', 'ok');
  });
  form.email.focus();
}

/* ---------- Enrutador de acceso (#/entrar, #/registro, #/recuperar) ---------- */
export function showLogin(app, client, onSuccess) {
  const render = () => {
    const h = location.hash;
    if (h === '#/registro') registerScreen(app, client, finish);
    else if (h === '#/recuperar') forgotScreen(app, client);
    else loginScreen(app, client, finish);
  };
  function finish(user) {
    window.removeEventListener('hashchange', render);
    history.replaceState(null, '', location.pathname + location.search);
    onSuccess(user);
  }
  window.addEventListener('hashchange', render);
  render();
}
