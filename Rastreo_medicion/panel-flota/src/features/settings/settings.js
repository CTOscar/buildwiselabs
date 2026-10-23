// Ajustes por lote y por tractor (la tuerca de las listas de Lotes y Flota).
// Lote → attributes de la geocerca en Traccar (PUT /api/geofences/{id}).
// Tractor → nombre y attributes del dispositivo (PUT /api/devices/{id}).
import { state, subscribe, notify, setView, mapApi } from '../fleet/store.js';
import { icon } from '../../components/icons.js';
import { escapeHtml, fmtHours, msToHours } from '../../lib/format.js';
import { BRANDS } from '../../lib/brands.js';

export const CULTIVOS = ['Tomate', 'Chile', 'Maíz', 'Mango', 'Frijol', 'Calabaza', 'Pepino', 'Otro'];
export const FENCE_COLORS = [
  ['#9D6B99', 'Malva'],
  ['#0A58F0', 'Azul'],
  ['#1C965E', 'Verde'],
  ['#E0791E', 'Naranja'],
  ['#D6453A', 'Rojo'],
  ['#0E8F80', 'Turquesa'],
];

const input =
  'w-full rounded-lg border border-line bg-panel px-3 py-2.5 text-sm text-fg placeholder:text-muted/70 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30 aria-[invalid=true]:border-crit';

const field = (label, control, hint = '') =>
  `<label class="grid gap-1.5 text-sm font-medium">${label}${control}${hint ? `<span class="text-xs font-normal text-muted">${hint}</span>` : ''}</label>`;

const toggle = (name, label, checked, hint = '') => `
  <label class="group flex cursor-pointer items-start justify-between gap-4 py-1">
    <span class="grid gap-0.5"><span class="text-sm font-medium">${label}</span>${hint ? `<span class="text-xs text-muted">${hint}</span>` : ''}</span>
    <input type="checkbox" name="${name}" class="peer sr-only" ${checked ? 'checked' : ''} />
    <span aria-hidden="true" class="relative mt-0.5 h-6 w-11 shrink-0 rounded-full bg-line transition peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent/40
      after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5"></span>
  </label>`;

function header(back, eyebrow, title) {
  return `
    <div class="flex items-center gap-1 px-3 pb-1 pt-1 lg:pt-0">
      <button type="button" data-act="back" class="grid h-10 w-10 place-items-center rounded-full text-muted hover:bg-raise hover:text-fg" aria-label="Volver">${icon('arrowLeft')}</button>
      <span class="text-sm text-muted">Volver a ${back}</span>
    </div>
    <div class="flex items-center gap-3 px-5 pb-4">
      <span class="grid h-11 w-11 place-items-center rounded-2xl bg-accent/15 text-accent">${icon('gear', 'h-5 w-5')}</span>
      <div class="min-w-0">
        <div class="eyebrow">${eyebrow}</div>
        <h2 class="truncate font-display text-2xl font-bold leading-tight tracking-tight">${escapeHtml(title)}</h2>
      </div>
    </div>`;
}

const msgBox = '<div data-msg role="status" class="hidden"></div>';
function say(root, text, ok) {
  const el = root.querySelector('[data-msg]');
  el.className = `rounded-lg border px-3 py-2.5 text-sm ${ok ? 'border-ok/40 bg-ok/10 text-ok' : 'border-crit/40 bg-crit/10 text-crit'}`;
  el.textContent = text;
}
const actions = (saveLabel) => `
  <div class="sticky bottom-0 -mx-5 mt-2 flex gap-2 border-t border-line bg-panel px-5 py-3">
    <button type="submit" class="btn btn-primary">${icon('check', 'h-4 w-4')}${saveLabel}</button>
    <button type="button" data-act="back" class="btn">Cancelar</button>
  </div>`;

/* ---------------- Ajustes del lote ---------------- */
export function initFenceSettings(client) {
  const root = document.querySelector('[data-section="lote"]');
  let rendered = null;

  function render(g) {
    const a = g.attributes || {};
    const color = a.color || FENCE_COLORS[0][0];
    root.innerHTML = `
      ${header('lotes', 'Ajustes del lote', g.name)}
      <form class="grid min-h-0 flex-1 content-start gap-5 overflow-y-auto px-5 pb-0" novalidate>
        ${msgBox}
        <h3 class="eyebrow">General</h3>
        ${field('Nombre del lote', `<input name="name" class="${input}" value="${escapeHtml(g.name)}" required />`)}
        <div class="grid gap-4 sm:grid-cols-2">
          ${field('Cultivo', `<select name="cultivo" class="${input}"><option value="">Sin definir</option>${CULTIVOS.map((c) => `<option ${a.cultivo === c ? 'selected' : ''}>${c}</option>`).join('')}</select>`)}
          ${field('Superficie (ha)', `<input name="superficie" type="number" min="0" step="0.1" inputmode="decimal" class="${input}" value="${escapeHtml(a.superficie ?? '')}" placeholder="0.0" />`)}
        </div>
        ${field('Responsable', `<input name="responsable" class="${input}" value="${escapeHtml(a.responsable || '')}" placeholder="Nombre del encargado del lote" />`)}

        <fieldset class="grid gap-2">
          <legend class="mb-2 text-sm font-medium">Color en el mapa</legend>
          <div class="flex flex-wrap gap-2">
            ${FENCE_COLORS.map(
              ([hex, name]) => `<label class="cursor-pointer" title="${name}">
                <input type="radio" name="color" value="${hex}" class="peer sr-only" ${hex.toLowerCase() === color.toLowerCase() ? 'checked' : ''} />
                <span class="grid h-9 w-9 place-items-center rounded-full ring-2 ring-transparent ring-offset-2 ring-offset-panel transition peer-checked:ring-fg peer-focus-visible:ring-accent" style="background:${hex}"><span class="sr-only">${name}</span></span>
              </label>`,
            ).join('')}
          </div>
        </fieldset>

        <h3 class="eyebrow mt-2">Alertas del lote</h3>
        <div class="grid gap-2 rounded-2xl border border-line p-4">
          ${toggle('alertaEntrada', 'Avisar cuando un tractor entra', a.alertaEntrada, 'Evento de entrada a la geocerca')}
          ${toggle('alertaSalida', 'Avisar cuando un tractor sale', a.alertaSalida, 'Útil para detectar trabajos fuera del lote asignado')}
          ${field('Horas máximas por tractor al día', `<input name="horasMax" type="number" min="0" max="24" step="0.5" class="${input}" value="${escapeHtml(a.horasMax ?? '')}" placeholder="Sin límite" />`, 'Alerta si un tractor pasa de estas horas de motor dentro del lote.')}
        </div>
        ${actions('Guardar lote')}
      </form>`;

    root.querySelector('form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.currentTarget;
      const name = f.name.value.trim();
      f.name.setAttribute('aria-invalid', String(!name));
      if (!name) return say(root, 'Escribe el nombre del lote.');
      const updated = {
        ...g,
        name,
        attributes: {
          ...(g.attributes || {}),
          cultivo: f.cultivo.value,
          superficie: f.superficie.value === '' ? '' : Number(f.superficie.value),
          responsable: f.responsable.value.trim(),
          color: f.color.value,
          alertaEntrada: f.alertaEntrada.checked,
          alertaSalida: f.alertaSalida.checked,
          horasMax: f.horasMax.value === '' ? '' : Number(f.horasMax.value),
        },
      };
      const btn = f.querySelector('[type=submit]');
      btn.disabled = true;
      try {
        const { _shape, ...payload } = updated;
        void _shape;
        await client.updateGeofence(payload);
        Object.assign(g, updated);
        mapApi.restyleFence(g);
        root.querySelector('h2').textContent = g.name;
        say(root, 'Lote guardado.', true);
        notify();
      } catch {
        say(root, 'No se pudo guardar el lote. Intenta de nuevo.');
      } finally {
        btn.disabled = false;
      }
    });
  }

  root.addEventListener('click', (e) => {
    if (e.target.closest('[data-act="back"]')) setView('lotes');
  });

  subscribe(() => {
    if (state.view !== 'lote') {
      rendered = null;
      return;
    }
    const g = state.geofences.find((x) => x.id === state.fenceId);
    if (!g || rendered === g.id) return;
    rendered = g.id;
    render(g);
    mapApi.fitFence(g.id);
  });
}

/* ---------------- Ajustes del tractor ---------------- */
export function initDeviceSettings(client) {
  const root = document.querySelector('[data-section="tractor"]');
  let rendered = null;

  function render(d) {
    const a = d.attributes || {};
    const hours = state.positions.get(d.id)?.attributes?.hours;
    const cada = Number(a.servicioCada) || 250;
    const ultimo = a.ultimoServicio === undefined || a.ultimoServicio === '' ? null : Number(a.ultimoServicio);
    const actual = typeof hours === 'number' ? msToHours(hours) : null;
    const faltan = actual !== null && ultimo !== null ? ultimo + cada - actual : null;
    const prox =
      faltan === null
        ? '<span class="text-muted">Captura el horómetro del último servicio para calcular el próximo.</span>'
        : faltan <= 0
          ? `<span class="font-semibold text-crit">Servicio vencido hace ${fmtHours(-faltan * 3600e3)} h</span>`
          : `<span class="${faltan <= 25 ? 'font-semibold text-warn' : 'text-ok'}">Próximo servicio en ${fmtHours(faltan * 3600e3)} h</span>`;

    root.innerHTML = `
      ${header('flota', `Ajustes del tractor · IMEI ${escapeHtml(d.uniqueId)}`, d.name)}
      <form class="grid min-h-0 flex-1 content-start gap-5 overflow-y-auto px-5 pb-0" novalidate>
        ${msgBox}
        <h3 class="eyebrow">Identificación</h3>
        <div class="grid gap-4 sm:grid-cols-2">
          ${field('Código del tractor', `<input name="name" class="${input} font-mono" value="${escapeHtml(d.name)}" required />`, 'Igual al código interno (ej. TRC-0012).')}
          ${field('Operador asignado', `<input name="operador" class="${input}" value="${escapeHtml(a.operador || '')}" placeholder="Nombre" />`)}
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          ${field('Marca', `<select name="marca" class="${input}"><option value="">Sin especificar</option>${BRANDS.map((b) => `<option value="${b.slug}" ${a.marca === b.slug ? 'selected' : ''}>${b.name}</option>`).join('')}</select>`)}
          ${field('Modelo', `<input name="modelo" class="${input}" value="${escapeHtml(a.modelo || '')}" placeholder="Ej. 5075E" />`)}
        </div>
        ${field('Lote habitual', `<select name="loteBase" class="${input}"><option value="">Sin lote fijo</option>${state.geofences.map((g) => `<option value="${g.id}" ${String(a.loteBase) === String(g.id) ? 'selected' : ''}>${escapeHtml(g.name)}</option>`).join('')}</select>`)}

        <h3 class="eyebrow mt-2">Equipo instalado</h3>
        <fieldset class="grid gap-2">
          <legend class="sr-only">Nivel del rastreador</legend>
          <div class="grid grid-cols-2 gap-2">
            ${[
              ['A', 'Nivel A', 'FMC130 · horas por D+'],
              ['B', 'Nivel B', 'FMC150 · lectura CAN'],
            ]
              .map(
                ([v, t, s]) => `<label class="cursor-pointer">
                  <input type="radio" name="nivel" value="${v}" class="peer sr-only" ${(a.nivel || 'A') === v ? 'checked' : ''} />
                  <span class="grid gap-0.5 rounded-2xl border border-line p-3 transition peer-checked:border-accent peer-checked:bg-accent/10 peer-focus-visible:ring-2 peer-focus-visible:ring-accent/40">
                    <span class="text-sm font-semibold">${t}</span><span class="text-xs text-muted">${s}</span></span>
                </label>`,
              )
              .join('')}
          </div>
        </fieldset>
        <div class="rounded-2xl border border-line px-4 py-2">${toggle('sondaBLE', 'Sonda de combustible BLE', a.sondaBLE, 'Activa la lectura de litros y las alertas de extracción.')}</div>

        <h3 class="eyebrow mt-2">Mantenimiento preventivo</h3>
        <div class="grid gap-4 sm:grid-cols-2">
          ${field('Servicio cada (h)', `<input name="servicioCada" type="number" min="1" step="1" class="${input}" value="${escapeHtml(a.servicioCada ?? 250)}" />`)}
          ${field('Horómetro del último servicio', `<input name="ultimoServicio" type="number" min="0" step="0.1" class="${input}" value="${escapeHtml(a.ultimoServicio ?? '')}" placeholder="${actual !== null ? fmtHours(hours).replace(/,/g, '') : ''}" />`)}
        </div>
        <p class="rounded-xl bg-raise px-4 py-3 text-sm">${actual !== null ? `Horómetro actual: <span class="font-mono">${fmtHours(hours)} h</span> · ` : ''}${prox}</p>

        ${field('Notas', `<textarea name="notas" rows="3" class="${input} resize-y" placeholder="Fallas, refacciones, observaciones de instalación…">${escapeHtml(a.notas || '')}</textarea>`)}
        ${actions('Guardar tractor')}
      </form>`;

    root.querySelector('form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.currentTarget;
      const name = f.name.value.trim().toUpperCase();
      f.name.setAttribute('aria-invalid', String(!name));
      if (!name) return say(root, 'Escribe el código del tractor.');
      const updated = {
        ...d,
        name,
        attributes: {
          ...(d.attributes || {}),
          operador: f.operador.value.trim(),
          marca: f.marca.value,
          modelo: f.modelo.value.trim(),
          loteBase: f.loteBase.value ? Number(f.loteBase.value) : '',
          nivel: f.nivel.value,
          sondaBLE: f.sondaBLE.checked,
          servicioCada: Number(f.servicioCada.value) || 250,
          ultimoServicio: f.ultimoServicio.value === '' ? '' : Number(f.ultimoServicio.value),
          notas: f.notas.value.trim(),
        },
      };
      const btn = f.querySelector('[type=submit]');
      btn.disabled = true;
      try {
        const saved = await client.updateDevice(updated);
        state.devices.set(d.id, { ...d, ...updated, ...(saved || {}) });
        rendered = null; // vuelve a pintar con los datos guardados
        notify();
        setTimeout(() => say(root, 'Tractor guardado.', true), 50);
      } catch (ex) {
        btn.disabled = false;
        say(root, ex?.status === 400 ? 'Ese código ya lo usa otro tractor.' : 'No se pudo guardar el tractor. Intenta de nuevo.');
      }
    });
  }

  root.addEventListener('click', (e) => {
    if (e.target.closest('[data-act="back"]')) setView('fleet');
  });

  subscribe(() => {
    if (state.view !== 'tractor') {
      rendered = null;
      return;
    }
    const d = state.devices.get(state.configId);
    if (!d || rendered === d.id) return;
    rendered = d.id;
    render(d);
    mapApi.focusDevice(d.id);
  });
}
