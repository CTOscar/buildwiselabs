import { state, subscribe, select, statusOf, STATUS, matches, fenceNameOf, mapApi, openDeviceSettings } from './store.js';
import { icon } from '../../components/icons.js';
import { brandAvatar } from '../../lib/brands.js';
import { kpisHtml } from './kpis.js';
import { fmtHours, fmtAgo, escapeHtml } from '../../lib/format.js';

const ORDER = { nosignal: 0, running: 1, idle: 2 };

// Vista "Flota": resumen + lista de tractores filtrada por chips y búsqueda.
export function initList() {
  const root = document.querySelector('[data-section="fleet"]');
  root.innerHTML = `
    <div class="grid gap-4 border-b border-line px-5 pb-4 pt-1 lg:pt-2">
      <div class="flex items-baseline justify-between">
        <h2 class="font-display text-[28px] font-bold leading-none tracking-tight">Flota</h2>
        <span id="fleet-count" class="text-sm text-muted"></span>
      </div>
      <div id="fleet-kpis"></div>
    </div>
    <ul id="rows" class="min-h-0 flex-1 overflow-y-auto py-1"></ul>`;

  const countEl = root.querySelector('#fleet-count');
  const kpisEl = root.querySelector('#fleet-kpis');
  const rowsEl = root.querySelector('#rows');
  let lastRows = '';
  let lastKpis = '';

  rowsEl.addEventListener('click', (e) => {
    const g = e.target.closest('[data-dev-gear]');
    if (g) return openDeviceSettings(Number(g.dataset.devGear));
    const b = e.target.closest('[data-id]');
    if (!b) return;
    const id = Number(b.dataset.id);
    select(id);
    mapApi.focusDevice(id);
  });

  subscribe(() => {
    if (state.view !== 'fleet') return;
    const k = kpisHtml();
    if (k !== lastKpis) kpisEl.innerHTML = lastKpis = k;

    const shown = [...state.devices.values()]
      .filter((d) => matches(d.id))
      .map((d) => ({ d, st: statusOf(d.id) }))
      .sort((a, b) => ORDER[a.st] - ORDER[b.st] || a.d.name.localeCompare(b.d.name));
    countEl.textContent = `${shown.length} de ${state.devices.size} tractores`;

    const html = shown.length
      ? shown
          .map(({ d, st }) => {
            const s = STATUS[st];
            const nivel = d.attributes?.nivel;
            const lote = fenceNameOf(d.id);
            const logo = brandAvatar(
              d.attributes?.marca,
              `<span class="grid h-full w-full place-items-center rounded-full bg-white text-black" title="Marca sin logotipo">${icon('tractor', 'h-5 w-5')}</span>`,
            );
            return `<li class="group/row flex items-center transition hover:bg-raise"><button type="button" data-id="${d.id}"
              class="group flex min-w-0 flex-1 items-center gap-3 py-3 pl-5 pr-2 text-left">
              <span class="relative grid h-10 w-10 shrink-0 place-items-center rounded-full ring-2 ring-offset-1 ring-offset-panel ${s.ring} font-mono text-xs font-semibold">
                ${logo}
                <span class="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-panel ${s.dot}"></span>
              </span>
              <span class="min-w-0 flex-1">
                <span class="flex items-center gap-2">
                  <span class="truncate font-medium">${escapeHtml(d.name)}</span>
                  ${nivel ? `<span class="rounded-md bg-raise px-1.5 py-px font-mono text-[10px] text-muted group-hover:bg-panel">Niv. ${escapeHtml(nivel)}</span>` : ''}
                </span>
                <span class="block truncate text-[13px] text-muted"><span class="${s.text}">${s.label}</span> · ${escapeHtml(lote || 'fuera de lote')}</span>
                <span class="block text-xs text-muted/80">${fmtAgo(d.lastUpdate)}</span>
              </span>
              <span class="grid justify-items-end">
                <span class="font-mono text-base tabular-nums">${fmtHours(state.engineToday.get(d.id))}</span>
                <span class="text-[11px] text-muted">h hoy</span>
              </span>
            </button><button type="button" data-dev-gear="${d.id}" aria-label="Ajustes de ${escapeHtml(d.name)}" title="Ajustes de ${escapeHtml(d.name)}"
                class="mr-3 grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted opacity-70 transition hover:bg-raise hover:text-fg hover:opacity-100 group-hover/row:opacity-100 focus-visible:opacity-100">${icon('gear', 'h-[18px] w-[18px]')}</button></li>`;
          })
          .join('')
      : `<li class="grid justify-items-center gap-1 px-6 py-12 text-center">
          <span class="font-medium">Ningún tractor coincide</span>
          <span class="text-sm text-muted">Cambia la búsqueda o quita filtros en los chips de arriba.</span></li>`;
    if (html !== lastRows) rowsEl.innerHTML = lastRows = html;
  });
}
