import { state, subscribe, notify, select, mapApi } from '../fleet/store.js';
import { icon } from '../../components/icons.js';
import { describeEvent, fmtTime, escapeHtml, startOfToday } from '../../lib/format.js';

const SEV = {
  crit: { ic: 'bolt', box: 'bg-crit/15 text-crit', label: 'text-crit' },
  warn: { ic: 'signal', box: 'bg-warn/15 text-warn', label: 'text-warn' },
  ok: { ic: 'check', box: 'bg-ok/15 text-ok', label: 'text-fg' },
  info: { ic: 'polygon', box: 'bg-info/15 text-info', label: 'text-fg' },
};
const ICON_BY_TYPE = { deviceFuelDrop: 'fuel', deviceFuelIncrease: 'fuel', ignitionOn: 'tractor', ignitionOff: 'tractor', deviceOffline: 'signal', deviceOnline: 'signal' };

// Vista "Alertas": eventos del día, con filtro de solo alertas.
export function initAlerts() {
  const root = document.querySelector('[data-section="alerts"]');
  let only = true;
  let last = '';

  root.addEventListener('click', (e) => {
    const t = e.target.closest('[data-only]');
    if (t) {
      only = t.dataset.only === '1';
      notify();
      return;
    }
    const b = e.target.closest('[data-id]');
    if (b) {
      const id = Number(b.dataset.id);
      select(id);
      mapApi.focusDevice(id);
    }
  });

  subscribe(() => {
    const since = startOfToday();
    const all = state.events.map((e) => ({ e, ...describeEvent(e) }));
    const alertCount = all.filter((x) => (x.sev === 'crit' || x.sev === 'warn') && new Date(x.e.eventTime) >= since).length;
    document.querySelectorAll('[data-badge]').forEach((b) => {
      b.textContent = alertCount > 99 ? '99+' : String(alertCount);
      b.classList.toggle('hidden', !alertCount);
    });
    if (state.view !== 'alerts') return;

    const items = all.filter((x) => !only || x.sev === 'crit' || x.sev === 'warn').slice(0, 80);
    const seg = (v, label) =>
      `<button type="button" data-only="${v}" aria-pressed="${String(only) === (v === '1' ? 'true' : 'false')}"
        class="flex-1 rounded-full px-3 py-1.5 text-sm font-medium transition ${(only ? '1' : '0') === v ? 'bg-panel text-fg shadow-float' : 'text-muted hover:text-fg'}">${label}</button>`;

    const html = `
      <div class="grid gap-3 border-b border-line px-5 pb-4 pt-1 lg:pt-2">
        <div class="flex items-baseline justify-between">
          <h2 class="font-display text-[28px] font-bold leading-none tracking-tight">Alertas</h2>
          <span class="text-sm text-muted">${alertCount} hoy</span>
        </div>
        <div class="flex rounded-full bg-raise p-1">${seg('1', 'Solo alertas')}${seg('0', 'Todos los eventos')}</div>
      </div>
      <ol class="min-h-0 flex-1 overflow-y-auto py-1">
        ${
          items.length
            ? items
                .map(({ e, label, sev }) => {
                  const s = SEV[sev];
                  const dev = state.devices.get(e.deviceId);
                  const fence = e.geofenceId ? state.geofences.find((g) => g.id === e.geofenceId)?.name : null;
                  return `<li><button type="button" data-id="${e.deviceId}" class="flex w-full items-center gap-3 px-5 py-3 text-left transition hover:bg-raise">
                    <span class="grid h-10 w-10 shrink-0 place-items-center rounded-full ${s.box}">${icon(ICON_BY_TYPE[e.type] || s.ic, 'h-5 w-5')}</span>
                    <span class="min-w-0 flex-1">
                      <span class="block truncate text-sm font-medium ${s.label}">${escapeHtml(label)}</span>
                      <span class="block truncate text-[13px] text-muted"><span class="font-mono text-fg">${escapeHtml(dev?.name || 'Equipo ' + e.deviceId)}</span>${fence ? ' · ' + escapeHtml(fence) : ''}</span>
                    </span>
                    <span class="font-mono text-xs text-muted">${fmtTime(e.eventTime)}</span>
                  </button></li>`;
                })
                .join('')
            : `<li class="grid justify-items-center gap-1 px-6 py-12 text-center"><span class="font-medium">Sin alertas por ahora</span>
               <span class="text-sm text-muted">Aquí aparecen bajas de combustible, cortes de energía y equipos sin señal.</span></li>`
        }
      </ol>`;
    if (html !== last) root.innerHTML = last = html;
  });
}
