import { state, subscribe } from '../fleet/store.js';
import { icon } from '../../components/icons.js';
import { escapeHtml } from '../../lib/format.js';
import { PUESTOS } from '../login/login.js';

export const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || '?';

const inputCls =
  'w-full rounded-lg border border-line bg-panel px-3 py-2.5 text-sm text-fg placeholder:text-muted/70 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30 aria-[invalid=true]:border-crit';

// Vista "Mi perfil" dentro del panel lateral.
export function initProfile(client, { onLogout }) {
  const root = document.querySelector('[data-section="profile"]');
  let renderedFor = null;

  function render() {
    const u = state.user || {};
    const puesto = u.attributes?.puesto || '';
    root.innerHTML = `
      <div class="min-h-0 flex-1 overflow-y-auto">
        <div class="relative mx-4 mt-1 overflow-hidden rounded-2xl bg-accent/15 px-5 pb-5 pt-5 lg:mt-2">
          <div class="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-accent/20"></div>
          <div class="relative flex items-center gap-4">
            <span class="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-white font-display text-2xl font-bold text-black shadow-float ring-1 ring-black/10">${escapeHtml(initials(u.name))}</span>
            <div class="min-w-0">
              <h2 class="truncate font-display text-[28px] font-bold leading-none tracking-tight">${escapeHtml(u.name || 'Sin nombre')}</h2>
              <p class="truncate text-sm text-muted">${escapeHtml(u.email || '')}</p>
              ${puesto ? `<span class="mt-1.5 inline-flex items-center gap-1 rounded-full bg-panel px-2.5 py-0.5 text-xs font-medium">${icon('briefcase', 'h-3.5 w-3.5')}${escapeHtml(puesto)}</span>` : ''}
            </div>
          </div>
        </div>

        <form id="profile-form" class="grid gap-5 px-5 py-6" novalidate>
          <div id="p-msg" role="status" class="hidden"></div>
          <h3 class="eyebrow">Datos personales</h3>
          <div class="grid gap-4">
            <label class="grid gap-1.5 text-sm font-medium">Nombre completo
              <input name="name" autocomplete="name" value="${escapeHtml(u.name || '')}" class="${inputCls}" required /></label>
            <label class="grid gap-1.5 text-sm font-medium">Correo
              <input name="email" type="email" autocomplete="email" value="${escapeHtml(u.email || '')}" class="${inputCls}" required /></label>
            <div class="grid gap-4 sm:grid-cols-2">
              <label class="grid gap-1.5 text-sm font-medium">Teléfono
                <input name="phone" type="tel" autocomplete="tel" value="${escapeHtml(u.phone || '')}" placeholder="669 000 0000" class="${inputCls}" /></label>
              <label class="grid gap-1.5 text-sm font-medium">Área o puesto
                <select name="puesto" class="${inputCls}">
                  <option value="">Sin definir</option>
                  ${PUESTOS.map((p) => `<option ${p === puesto ? 'selected' : ''}>${p}</option>`).join('')}
                </select></label>
            </div>
          </div>

          <h3 class="eyebrow mt-2">Cambiar contraseña</h3>
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="grid gap-1.5 text-sm font-medium">Nueva contraseña
              <input name="password" type="password" autocomplete="new-password" placeholder="Dejar vacío para no cambiar" class="${inputCls}" /></label>
            <label class="grid gap-1.5 text-sm font-medium">Confirmar
              <input name="confirm" type="password" autocomplete="new-password" placeholder="Repite la contraseña" class="${inputCls}" /></label>
          </div>

          <div class="flex flex-wrap items-center gap-3 pt-2">
            <button type="submit" class="btn btn-primary">${icon('check', 'h-4 w-4')}Guardar cambios</button>
            <button type="button" data-act="profile-logout" class="btn">${icon('logout', 'h-4 w-4')}Cerrar sesión</button>
          </div>
          ${state.mode === 'mock' ? '<p class="text-xs text-muted">Modo simulado: los cambios se guardan solo en este navegador.</p>' : ''}
        </form>
      </div>`;

    const form = root.querySelector('#profile-form');
    const msg = root.querySelector('#p-msg');
    const show = (text, ok) => {
      msg.className = `rounded-lg border px-3 py-2.5 text-sm ${ok ? 'border-ok/40 bg-ok/10 text-ok' : 'border-crit/40 bg-crit/10 text-crit'}`;
      msg.textContent = text;
    };
    root.querySelector('[data-act="profile-logout"]').addEventListener('click', onLogout);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = form.name.value.trim();
      const email = form.email.value.trim();
      const password = form.password.value;
      form.name.setAttribute('aria-invalid', String(!name));
      form.email.setAttribute('aria-invalid', String(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)));
      if (!name || form.email.getAttribute('aria-invalid') === 'true') return show('Revisa tu nombre y tu correo.');
      if (password && password.length < 8) return show('La contraseña nueva debe tener al menos 8 caracteres.');
      if (password !== form.confirm.value) return show('Las contraseñas no coinciden.');
      const btn = form.querySelector('[type=submit]');
      btn.disabled = true;
      try {
        const updated = await client.updateUser({
          ...state.user,
          name,
          email,
          phone: form.phone.value.trim(),
          attributes: { ...(state.user.attributes || {}), puesto: form.puesto.value },
          ...(password ? { password } : {}),
        });
        state.user = { ...state.user, ...updated };
        renderedFor = null;
        render();
        renderedFor = state.user;
        root.querySelector('#p-msg').className = 'rounded-lg border border-ok/40 bg-ok/10 px-3 py-2.5 text-sm text-ok';
        root.querySelector('#p-msg').textContent = 'Perfil guardado.';
        window.dispatchEvent(new Event('user-updated'));
      } catch (ex) {
        btn.disabled = false;
        show(ex.status === 400 ? 'Ese correo ya lo usa otra cuenta.' : 'No se pudo guardar. Intenta de nuevo.');
      }
    });
  }

  subscribe(() => {
    if (state.view !== 'profile') {
      renderedFor = null;
      return;
    }
    if (renderedFor !== state.user) {
      renderedFor = state.user;
      render();
    }
  });
}
