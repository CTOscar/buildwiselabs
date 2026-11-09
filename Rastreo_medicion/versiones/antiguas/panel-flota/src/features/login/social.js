// Acceso con Google y Apple. La API del panel (panel-flota-api) hace el flujo OAuth completo:
//   GET /api/panel/auth/providers          -> { google: bool, apple: bool } (cuáles están configurados)
//   GET /api/panel/auth/<proveedor>        -> redirige al proveedor y, al volver, crea la sesión
// Si algo falla, la API regresa al panel con ?auth_error=<código>.

const googleLogo = `<svg class="h-4 w-4 shrink-0" viewBox="0 0 512 512" aria-hidden="true">
  <path fill="#fbbd00" d="M120 256c0-25.367 6.989-49.13 19.131-69.477v-86.308H52.823C18.568 144.703 0 198.922 0 256s18.568 111.297 52.823 155.785h86.308v-86.308C126.989 305.13 120 281.367 120 256z"/>
  <path fill="#0f9d58" d="m256 392-60 60 60 60c57.079 0 111.297-18.568 155.785-52.823v-86.216h-86.216C305.044 385.147 281.181 392 256 392z"/>
  <path fill="#31aa52" d="m139.131 325.477-86.308 86.308a260.085 260.085 0 0 0 22.158 25.235C123.333 485.371 187.62 512 256 512V392c-49.624 0-93.117-26.72-116.869-66.523z"/>
  <path fill="#3c79e6" d="M512 256a258.24 258.24 0 0 0-4.192-46.377l-2.251-12.299H256v120h121.452a135.385 135.385 0 0 1-51.884 55.638l86.216 86.216a260.085 260.085 0 0 0 25.235-22.158C485.371 388.667 512 324.38 512 256z"/>
  <path fill="#cf2d48" d="m352.167 159.833 10.606 10.606 84.853-84.852-10.606-10.606C388.668 26.629 324.381 0 256 0l-60 60 60 60c36.326 0 70.479 14.146 96.167 39.833z"/>
  <path fill="#eb4132" d="M256 120V0C187.62 0 123.333 26.629 74.98 74.98a259.849 259.849 0 0 0-22.158 25.235l86.308 86.308C162.883 146.72 206.376 120 256 120z"/>
</svg>`;

const appleLogo =
  '<svg class="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/></svg>';

export const PROVIDER_NAMES = { google: 'Google', apple: 'Apple' };

// Códigos que manda la API en ?auth_error=
export const AUTH_ERRORS = {
  cancelado: 'Cancelaste el acceso. Puedes intentarlo de nuevo.',
  estado: 'La sesión de acceso expiró. Vuelve a intentarlo.',
  proveedor: 'No se pudo hablar con el proveedor. Intenta de nuevo en unos minutos.',
  cuenta: 'La cuenta no tiene un correo verificado o no es válida para este panel.',
};
const AUTH_ERROR_DEFAULT = 'No se pudo iniciar sesión con ese proveedor.';

// Separador "o" y los botones de Google y Apple. `verb` = "Continuar con", "Registrarse con"…
export function socialHtml(verb = 'Continuar con') {
  const btn = (id, logo) =>
    `<button type="button" data-social="${id}" class="flex h-10 items-center justify-center gap-2 rounded-lg border border-line bg-panel px-2 text-sm font-medium transition hover:bg-raise">${logo} ${verb} ${PROVIDER_NAMES[id]}</button>`;
  return `
    <div class="my-6 flex items-center gap-4">
      <hr class="w-full border-line" /><p class="text-sm text-muted">o</p><hr class="w-full border-line" />
    </div>
    <div class="grid gap-2.5 min-[420px]:grid-cols-2">${btn('google', googleLogo)}${btn('apple', appleLogo)}</div>`;
}

// Texto del aviso según el código de error que trae la URL (o null si no hay error).
export function authErrorMessage(search = '') {
  const code = new URLSearchParams(search).get('auth_error');
  if (!code) return null;
  return AUTH_ERRORS[code] || AUTH_ERROR_DEFAULT;
}

// Conecta los botones. `show(text, kind)` muestra el aviso en el formulario.
export function wireSocial(root, client, show) {
  const msg = authErrorMessage(location.search);
  if (msg) {
    show(msg, 'error');
    history.replaceState(null, '', location.pathname + location.hash);
  }
  root.querySelectorAll('[data-social]').forEach((b) =>
    b.addEventListener('click', async () => {
      const id = b.dataset.social;
      const name = PROVIDER_NAMES[id];
      if (typeof client.socialUrl !== 'function') {
        // Sin API del panel: solo queda el OpenID de Traccar, y únicamente para Google.
        const url = id === 'google' ? client.openIdUrl?.() : null;
        if (url) location.href = url;
        else show(`El acceso con ${name} se activa cuando el panel tenga su API conectada (VITE_PANEL_API_URL).`, 'info');
        return;
      }
      const enabled = (await client.socialProviders?.().catch(() => ({}))) || {};
      if (enabled[id]) location.href = client.socialUrl(id);
      else show(`El acceso con ${name} aún no está activado en el servidor.`, 'info');
    }),
  );
}
