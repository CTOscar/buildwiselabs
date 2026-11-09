import { state, subscribe } from '../fleet/store.js';
import { icon } from '../../components/icons2.js';
import { escapeHtml } from '../../lib/format.js';
import { PUESTOS } from '../login/login.js';
import { applyPhotos, forgetPhoto, photoFor, resizeImage } from '../../lib/photo.js';

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

  // Foto de perfil: elegir, subir y quitar. Refresca el avatar del riel al terminar.
  function wirePhoto(u, show) {
    const input = root.querySelector('#p-photo');
    const removeBtn = root.querySelector('[data-act="photo-remove"]');
    const refresh = async () => {
      await forgetPhoto(u.id);
      applyPhotos(client, document);
      removeBtn.classList.toggle('hidden', !(await photoFor(client, u.id)));
      window.dispatchEvent(new Event('user-updated'));
    };
    photoFor(client, u.id).then((url) => removeBtn.classList.toggle('hidden', !url));
    root.querySelector('[data-act="photo-pick"]').addEventListener('click', () => input.click());
    input.addEventListener('change', async () => {
      const file = input.files[0];
      input.value = '';
      if (!file) return;
      try {
        show('Subiendo foto…', true);
        await client.setPhoto(u.id, await resizeImage(file));
        await refresh();
        show('Foto actualizada.', true);
      } catch (ex) {
        show(ex.message || 'No se pudo guardar la foto. Intenta de nuevo.');
      }
    });
    removeBtn.addEventListener('click', async () => {
      try {
        await client.removePhoto(u.id);
        await refresh();
        show('Foto quitada.', true);
      } catch {
        show('No se pudo quitar la foto.');
      }
    });
  }

  // Solo administradores: lista de cuentas y cambio de rol.
  async function renderAccounts() {
    const box = root.querySelector('#p-accounts');
    if (!box) return;
    try {
      const users = await client.listUsers();
      box.classList.remove('hidden');
      box.innerHTML = `
        <h3 class="eyebrow mb-3">Cuentas registradas · ${users.length}</h3>
        <ul class="divide-y divide-line rounded-lg border border-line">
          ${users
            .map(
              (f) => `<li class="flex items-center gap-3 px-3 py-2.5 text-sm">
            <span data-photo-user="${f.id}" class="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-raise text-xs font-semibold">${escapeHtml(initials(f.name))}</span>
            <span class="min-w-0 flex-1"><span class="block truncate font-medium">${escapeHtml(f.name)}</span>
              <span class="block truncate text-xs text-muted">${escapeHtml(f.email)}${f.attributes?.puesto ? ` · ${escapeHtml(f.attributes.puesto)}` : ''}</span></span>
            <select data-role="${f.id}" class="h-8 rounded-md border border-line bg-panel px-1.5 text-xs" ${f.id === state.user.id ? 'disabled title="No puedes cambiar tu propio rol"' : ''}>
              <option value="user" ${f.role === 'user' ? 'selected' : ''}>Usuario</option>
              <option value="admin" ${f.role === 'admin' ? 'selected' : ''}>Administrador</option>
            </select></li>`,
            )
            .join('')}
        </ul>`;
      applyPhotos(client, box);
      box.querySelectorAll('[data-role]').forEach((sel) =>
        sel.addEventListener('change', async () => {
          try {
            await client.setRole(Number(sel.dataset.role), sel.value);
          } catch (ex) {
            sel.value = sel.value === 'admin' ? 'user' : 'admin';
            alert(ex.message || 'No se pudo cambiar el rol');
          }
        }),
      );
    } catch {
      box.classList.add('hidden');
    }
  }

  function render() {
    const u = state.user || {};
    const puesto = u.attributes?.puesto || '';
    const canPhoto = typeof client.setPhoto === 'function';
    root.innerHTML = `
      <div class="min-h-0 flex-1 overflow-y-auto">
        <div class="relative mx-4 mt-1 overflow-hidden rounded-2xl bg-accent/15 px-5 pb-5 pt-5 lg:mt-2">
          <div class="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-accent/20"></div>
          <div class="relative flex items-center gap-4">
            <div class="relative shrink-0">
              <span data-photo-user="${u.id}" class="grid h-16 w-16 place-items-center rounded-full bg-white font-display text-2xl font-bold text-black shadow-float ring-1 ring-black/10">${escapeHtml(initials(u.name))}</span>
              ${canPhoto ? `<button type="button" data-act="photo-pick" aria-label="Cambiar foto de perfil" title="Cambiar foto" class="absolute -bottom-2 -right-2 grid h-8 w-8 place-items-center rounded-full border border-line bg-panel text-fg shadow-float transition hover:bg-raise">${icon('camera', 'h-4 w-4')}</button>
                <input type="file" id="p-photo" accept="image/jpeg,image/png,image/webp" class="hidden" />` : ''}
            </div>
            <div class="min-w-0">
              <h2 class="truncate font-display text-[28px] font-bold leading-none tracking-tight">${escapeHtml(u.name || 'Sin nombre')}</h2>
              <p class="truncate text-sm text-muted">${escapeHtml(u.email || '')}</p>
              ${puesto ? `<span class="mt-1.5 inline-flex items-center gap-1 rounded-full bg-panel px-2.5 py-0.5 text-xs font-medium">${icon('briefcase', 'h-3.5 w-3.5')}${escapeHtml(puesto)}</span>` : ''}
              ${canPhoto ? '<button type="button" data-act="photo-remove" class="mt-1.5 hidden text-xs text-muted underline underline-offset-2 hover:text-fg">Quitar foto</button>' : ''}
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
          ${state.mode === 'mock' && !client.panel ? '<p class="text-xs text-muted">Modo simulado: los cambios se guardan solo en este navegador.</p>' : ''}
        </form>
        <section id="p-accounts" class="hidden border-t border-line px-5 py-6" aria-label="Cuentas registradas"></section>
      </div>`;

    const form = root.querySelector('#profile-form');
    const msg = root.querySelector('#p-msg');
    const show = (text, ok) => {
      msg.className = `rounded-lg border px-3 py-2.5 text-sm ${ok ? 'border-ok/40 bg-ok/10 text-ok' : 'border-crit/40 bg-crit/10 text-crit'}`;
      msg.textContent = text;
    };
    root.querySelector('[data-act="profile-logout"]').addEventListener('click', onLogout);
    if (canPhoto) wirePhoto(u, show);
    applyPhotos(client, root);
    if (u.role === 'admin' && typeof client.listUsers === 'function') renderAccounts();
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = form.name.value.trim();
      const email = form.email.value.trim();
      const password = form.password.value;
      form.name.setAttribute('aria-invalid', String(!name));
      form.email.setAttribute('aria-invalid', String(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)));
      if (!name || form.email.getAttribute('aria-invalid') === 'true') return show('Revisa tu nombre y tu correo.');
      if (password && !(password.length >= 8 && /\d/.test(password) && /[A-ZÁÉÍÓÚÑ]/.test(password))) {
        return show('La contraseña nueva necesita 8 caracteres, un número y una mayúscula.');
      }
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
        show(ex.status === 400 ? ex.message || 'Ese correo ya lo usa otra cuenta.' : 'No se pudo guardar. Intenta de nuevo.');
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
