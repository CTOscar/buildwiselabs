import { state, subscribe, notify, select, statusOf, fenceNameOf, STATUS, mapApi, trailKm } from './store.js';
import { icon } from '../../components/icons.js';
import { brandOf, brandBadge } from '../../lib/brands.js';
import { fmtHours, fmtAgo, fmtTime, knotsToKmh, escapeHtml, describeEvent } from '../../lib/format.js';

const SEV_TEXT = { crit: 'text-crit', warn: 'text-warn', ok: 'text-ok', info: 'text-info' };

// Vista "Tractor": tarjeta de detalle con acciones rápidas y pestañas.
export function initDetail(client = {}) {
  const canSim = typeof client.simulateRoute === 'function';
  const root = document.querySelector('[data-section="device"]');
  let tab = 'resumen';
  let last = '';
  let copied = false;

  root.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const id = state.selected;
    switch (b.dataset.act) {
      case 'back':
        select(null);
        break;
      case 'center':
        mapApi.focusDevice(id);
        break;
      case 'scene':
        window.dispatchEvent(new CustomEvent('open-scene3d', { detail: { id } }));
        break;
      case 'follow':
        state.follow = !state.follow;
        if (state.follow) mapApi.focusDevice(id);
        notify();
        break;
      case 'copy': {
        const imei = state.devices.get(id)?.uniqueId || '';
        try {
          await navigator.clipboard.writeText(imei);
          copied = true;
          notify();
          setTimeout(() => {
            copied = false;
            notify();
          }, 1500);
        } catch {
          /* sin permiso de portapapeles */
        }
        break;
      }
      case 'sim': {
        const on = state.sim.id === id;
        state.sim = { id: on ? null : id, speed: state.sim.speed };
        if (!on) {
          state.follow = true;
          mapApi.focusDevice(id);
        }
        client.simulateRoute(state.sim.id, state.sim.speed);
        notify();
        break;
      }
      case 'speed':
        state.sim.speed = Number(b.dataset.speed);
        if (state.sim.id != null) client.simulateRoute(state.sim.id, state.sim.speed);
        notify();
        break;
      case 'clear': {
        const t = state.trails.get(id);
        if (t) t.splice(0, Math.max(0, t.length - 1));
        notify();
        break;
      }
      case 'tab':
        tab = b.dataset.tab;
        notify();
        break;
    }
  });

  subscribe(() => {
    if (state.view !== 'device') return;
    const id = state.selected;
    const d = state.devices.get(id);
    if (!d) return;
    const p = state.positions.get(id) || { attributes: {} };
    const a = p.attributes || {};
    const stKey = statusOf(id);
    const st = STATUS[stKey];
    const lote = fenceNameOf(id);
    const nivel = d.attributes?.nivel || '—';
    const brand = brandOf(d.attributes?.marca);

    const quick = (label, value, unit) => `
      <div class="grid justify-items-center gap-0.5 px-2">
        <span class="font-mono text-xl tabular-nums">${value}<span class="text-sm text-muted">${unit}</span></span>
        <span class="text-[11px] text-muted">${label}</span>
      </div>`;
    const action = (act, ic, label, pressed) =>
      `<button type="button" class="action" data-act="${act}" ${pressed !== undefined ? `aria-pressed="${pressed}"` : ''}><span>${icon(ic)}</span><span>${label}</span></button>`;
    const row = (ic, main, sub = '') => `
      <li class="flex items-start gap-4 px-5 py-3">
        <span class="mt-0.5 text-accent">${icon(ic)}</span>
        <span class="min-w-0"><span class="block text-sm">${main}</span>${sub ? `<span class="block text-xs text-muted">${sub}</span>` : ''}</span>
      </li>`;

    const trail = state.trails.get(id) || [];
    const simOn = state.sim.id === id;
    const km = trailKm(trail);
    // Tiempo en movimiento: suma solo los tramos entre reportes cercanos (< 5 min).
    let ms = 0;
    for (let i = 1; i < trail.length; i++) {
      const dt = trail[i][2] - trail[i - 1][2];
      if (dt > 0 && dt < 5 * 60e3) ms += dt;
    }
    const secs = Math.round(ms / 1000);
    const dur = secs < 3600 ? `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}` : `${Math.floor(secs / 3600)} h ${Math.floor((secs % 3600) / 60)} min`;
    const stat = (label, value) => `<div><div class="font-mono text-base tabular-nums">${value}</div><div class="text-[11px] text-muted">${label}</div></div>`;
    const recorrido = `
        <section class="mx-4 mt-4 rounded-2xl border ${simOn ? 'border-accent/60 bg-accent/5' : 'border-line'} p-4" aria-label="Recorrido">
          <div class="flex items-center gap-3">
            <span class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent/15 text-accent">${icon('route', 'h-[18px] w-[18px]')}</span>
            <div class="min-w-0 flex-1">
              <div class="text-sm font-semibold">Recorrido</div>
              <div class="truncate text-xs text-muted">${simOn ? '<span class="text-accent">Simulando trabajo por surcos</span>' : trail.length > 1 ? 'Trazo de esta sesión' : 'Aún sin movimiento en esta sesión'}</div>
            </div>
            ${trail.length > 1 ? `<button type="button" data-act="clear" class="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-raise hover:text-fg" aria-label="Limpiar trazo" title="Limpiar trazo">${icon('eraser', 'h-[18px] w-[18px]')}</button>` : ''}
          </div>
          <div class="mt-3 grid grid-cols-3 gap-2">
            ${stat('Distancia', `${km.toFixed(2)} km`)}${stat('En movimiento', dur)}${stat('Puntos', trail.length)}
          </div>
          ${
            canSim
              ? `<div class="mt-3 flex items-center gap-2">
            <button type="button" data-act="sim" class="btn ${simOn ? '' : 'btn-primary'} flex-1">
              ${icon(simOn ? 'stop' : 'play', 'h-4 w-4')}<span>${simOn ? 'Detener simulación' : 'Simular recorrido'}</span></button>
            <div class="flex rounded-full bg-raise p-0.5" role="group" aria-label="Velocidad de la simulación">
              ${[1, 2, 4]
                .map(
                  (v) => `<button type="button" data-act="speed" data-speed="${v}" aria-pressed="${state.sim.speed === v}"
                class="rounded-full px-2.5 py-1 font-mono text-xs transition ${state.sim.speed === v ? 'bg-panel text-fg shadow-float' : 'text-muted hover:text-fg'}">${v}×</button>`,
                )
                .join('')}
            </div>
          </div>
          <p class="mt-2 text-[11px] text-muted">Modo simulado: el tractor recorre su lote surco por surco y el mapa lo sigue. Con Traccar se usará el historial de /api/positions.</p>`
              : ''
          }
        </section>`;

    const evs = state.events.filter((e) => e.deviceId === id).slice(0, 25);
    const body =
      tab === 'resumen'
        ? `<ul class="divide-y divide-line">
            ${row('pin', escapeHtml(lote || 'Fuera de lote'), `${p.latitude?.toFixed(5) ?? '—'}, ${p.longitude?.toFixed(5) ?? '—'}`)}
            ${row('gauge', `${knotsToKmh(p.speed)} km/h`, a.motion ? 'En movimiento' : 'Detenido')}
            ${row('bolt', typeof a.power === 'number' ? `${a.power.toFixed(1)} V` : 'Sin dato de voltaje', a.ignition ? 'Alternador cargando (D+ activo)' : 'Batería en reposo')}
            ${a.rpm !== undefined ? row('chip', `${Math.round(a.rpm)} RPM`, 'Leído por CAN J1939') : ''}
            ${row('fuel', typeof a.fuel === 'number' ? `${Math.round(a.fuel)} L en tanque` : 'Sin sensor de combustible', typeof a.fuel === 'number' ? (nivel === 'B' ? 'Nivel por CAN' : 'Sonda BLE calibrada') : 'Solo tractores con sonda o CAN')}
            ${row('signal', `Último reporte ${fmtAgo(d.lastUpdate)}`, `IMEI ${escapeHtml(d.uniqueId)}`)}
          </ul>`
        : evs.length
          ? `<ol class="divide-y divide-line">${evs
              .map((e) => {
                const { label, sev } = describeEvent(e);
                return `<li class="flex items-center gap-3 px-5 py-3">
                  <span class="h-2 w-2 shrink-0 rounded-full bg-current ${SEV_TEXT[sev]}"></span>
                  <span class="min-w-0 flex-1 text-sm ${sev === 'crit' ? 'font-medium text-crit' : ''}">${escapeHtml(label)}</span>
                  <span class="font-mono text-xs text-muted">${fmtTime(e.eventTime)}</span></li>`;
              })
              .join('')}</ol>`
          : '<p class="px-5 py-8 text-center text-sm text-muted">Este tractor no tiene eventos hoy.</p>';

    const html = `
      <div class="flex items-center gap-1 px-3 pb-1 pt-1 lg:pt-0">
        <button type="button" data-act="back" class="grid h-10 w-10 place-items-center rounded-full text-muted hover:bg-raise hover:text-fg" aria-label="Volver">${icon('arrowLeft')}</button>
        <span class="text-sm text-muted">Volver a ${state.backView === 'fleet' ? 'flota' : state.backView === 'alerts' ? 'alertas' : state.backView === 'lotes' ? 'lotes' : 'reportes'}</span>
      </div>
      <div class="min-h-0 flex-1 overflow-y-auto">
        <div class="relative mx-4 overflow-hidden rounded-2xl border border-line bg-raise px-5 pb-5 pt-4">
          <div class="flex items-start gap-4">
            <div class="min-w-0 flex-1">
              <div class="truncate text-sm font-semibold">${brand ? `${escapeHtml(brand.name)}${d.attributes?.modelo ? ` <span class="font-normal text-muted">${escapeHtml(d.attributes.modelo)}</span>` : ''}` : '<span class="font-normal text-muted">Marca sin especificar</span>'}</div>
              <div class="eyebrow mb-1 truncate">Nivel ${escapeHtml(nivel)} · ${nivel === 'B' ? 'FMC150 · CAN' : 'FMC130 · D+'}</div>
              <h2 class="truncate whitespace-nowrap font-display text-[34px] font-bold leading-none tracking-tight sm:text-[40px]">${escapeHtml(d.name)}</h2>
            </div>
            ${brand ? brandBadge(brand.slug) : `<span class="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-panel text-muted ring-1 ring-line">${icon('tractor', 'h-8 w-8')}</span>`}
          </div>
          <div class="mt-2 flex flex-wrap items-center gap-2">
            <span class="chip ${st.border} ${st.text} bg-panel">${stKey === 'running' ? '<span class="h-1.5 w-1.5 animate-pulse rounded-full bg-current"></span>' : ''}${st.label}</span>
            <span class="text-sm text-muted">${escapeHtml(lote || 'Fuera de lote')}</span>
          </div>
        </div>

        <div class="mx-4 mt-4 grid grid-cols-3 divide-x divide-line rounded-2xl border border-line py-3">
          ${quick('Horas hoy', fmtHours(state.engineToday.get(id)), ' h')}
          ${quick('Horómetro', typeof a.hours === 'number' ? fmtHours(a.hours) : '—', typeof a.hours === 'number' ? ' h' : '')}
          ${quick('Diésel', typeof a.fuel === 'number' ? Math.round(a.fuel) : '—', typeof a.fuel === 'number' ? ' L' : '')}
        </div>

        <div class="mt-5 grid grid-cols-4 gap-1 border-b border-line px-4 pb-5">
          ${action('center', 'target', 'Centrar')}
          ${action('scene', 'cube', 'Ver en 3D')}
          ${action('follow', 'navigate', state.follow ? 'Siguiendo' : 'Seguir', state.follow)}
          ${action('copy', copied ? 'check' : 'copy', copied ? 'Copiado' : 'IMEI')}
        </div>

        ${recorrido}

        <div class="sticky top-0 z-10 mt-4 flex border-b border-line bg-panel px-2" role="tablist">
          ${[['resumen', 'Resumen'], ['eventos', `Eventos${evs.length ? ` · ${evs.length}` : ''}`]]
            .map(
              ([k, l]) => `<button type="button" role="tab" data-act="tab" data-tab="${k}" aria-selected="${tab === k}"
                class="flex-1 border-b-2 py-3 text-sm font-medium transition ${tab === k ? 'border-accent text-fg' : 'border-transparent text-muted hover:text-fg'}">${l}</button>`,
            )
            .join('')}
        </div>
        ${body}
      </div>`;
    if (html !== last) root.innerHTML = last = html;
  });
}
