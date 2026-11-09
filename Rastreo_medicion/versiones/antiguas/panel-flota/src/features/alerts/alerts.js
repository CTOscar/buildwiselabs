import { state, subscribe, notify, select, mapApi } from '../fleet/store.js';
import { icon } from '../../components/icons2.js';
import { stateBlock } from '../../components/ui.js';
import { describeEvent, fmtTime, escapeHtml, startOfToday } from '../../lib/format.js';

const SEV = {
  crit: { ic: 'bolt', box: 'bg-crit/15 text-crit', label: 'text-crit' },
  warn: { ic: 'signal', box: 'bg-warn/15 text-warn', label: 'text-warn' },
  ok: { ic: 'check', box: 'bg-ok/15 text-ok', label: 'text-fg' },
  info: { ic: 'polygon', box: 'bg-info/15 text-info', label: 'text-fg' },
};
const ICON_BY_TYPE = { deviceFuelDrop: 'fuel', deviceFuelIncrease: 'fuel', ignitionOn: 'tractor', ignitionOff: 'tractor', deviceOffline: 'signal', deviceOnline: 'signal' };

const isAlert = (x) => x.sev === 'crit' || x.sev === 'warn';

// Alertas abiertas = eventos críticos o de advertencia de hoy.
export function openAlertCount() {
  const since = startOfToday();
  return state.events.filter((e) => isAlert(describeEvent(e)) && new Date(e.eventTime) >= since).length;
}

function rowHtml({ e, label, sev }) {
  const s = SEV[sev];
  const dev = state.devices.get(e.deviceId);
  const fence = e.geofenceId ? state.geofences.find((g) => g.id === e.geofenceId)?.name : null;
  return `<li><button type="button" data-id="${e.deviceId}" class="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-raise">
    <span class="grid h-10 w-10 shrink-0 place-items-center rounded-full ${s.box}">${icon(ICON_BY_TYPE[e.type] || s.ic, 'h-5 w-5')}</span>
    <span class="min-w-0 flex-1">
      <span class="block truncate text-sm font-medium ${s.label}">${escapeHtml(label)}</span>
      <span class="block truncate text-[13px] text-muted"><span class="font-mono text-fg">${escapeHtml(dev?.name || 'Equipo ' + e.deviceId)}</span>${fence ? ' · ' + escapeHtml(fence) : ''}</span>
    </span>
    <span class="font-mono text-xs text-muted">${fmtTime(e.eventTime)}</span>
  </button></li>`;
}

const emptyList = () =>
  `<li>${stateBlock('empty', { title: 'Sin alertas por ahora', text: 'Aquí aparecen bajas de combustible, cortes de energía y equipos sin señal.' })}</li>`;

// Lista de alertas recientes en Inicio y vista completa "Alertas".
export function initAlerts() {
  const home = document.getElementById('home-alerts');
  const root = document.querySelector('[data-section="alerts"]');
  let only = true;
  let lastHome = '';
  let lastFull = '';

  const open = (e) => {
    const b = e.target.closest('[data-id]');
    if (!b) return false;
    const id = Number(b.dataset.id);
    select(id);
    mapApi.focusDevice(id);
    return true;
  };
  home.addEventListener('click', open);
  root.addEventListener('click', (e) => {
    const t = e.target.closest('[data-only]');
    if (t) {
      only = t.dataset.only === '1';
      return notify();
    }
    open(e);
  });

  subscribe(() => {
    const all = state.events.map((e) => ({ e, ...describeEvent(e) }));
    const count = openAlertCount();
    document.querySelectorAll('[data-badge]').forEach((b) => {
      b.textContent = count > 99 ? '99+' : String(count);
      b.classList.toggle('hidden', !count);
    });

    const recent = all.filter(isAlert).slice(0, 12);
    const homeHtml = `
      <div class="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
        <h2 class="font-display text-base font-bold">Alertas recientes</h2>
        <button type="button" data-view="alerts" class="text-sm font-medium text-accent hover:underline">Ver todas (${count})</button>
      </div>
      <ol class="min-h-0 flex-1 divide-y divide-line/60 overflow-y-auto">${recent.length ? recent.map(rowHtml).join('') : emptyList()}</ol>`;
    if (homeHtml !== lastHome) home.innerHTML = lastHome = homeHtml;

    if (state.view !== 'alerts') return;
    const items = all.filter((x) => !only || isAlert(x)).slice(0, 80);
    const seg = (v, label) =>
      `<button type="button" data-only="${v}" aria-pressed="${(only ? '1' : '0') === v}"
        class="flex-1 rounded-full px-3 py-1.5 text-sm font-medium transition ${(only ? '1' : '0') === v ? 'bg-panel text-fg shadow-float' : 'text-muted hover:text-fg'}">${label}</button>`;
    const html = `
      <div class="grid gap-3 border-b border-line px-4 pb-4 pt-4">
        <div class="flex items-baseline justify-between">
          <h2 class="font-display text-2xl font-bold leading-none tracking-tight">Alertas</h2>
          <span class="text-sm text-muted">${count} hoy</span>
        </div>
        <div class="flex rounded-full bg-raise p-1">${seg('1', 'Solo alertas')}${seg('0', 'Todos los eventos')}</div>
      </div>
      <ol class="min-h-0 flex-1 divide-y divide-line/60 overflow-y-auto">${items.length ? items.map(rowHtml).join('') : emptyList()}</ol>`;
    if (html !== lastFull) root.innerHTML = lastFull = html;
  });
}
