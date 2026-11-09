import { state, subscribe, notify, select, statusOf, STATUS, matches, groupOf, fenceNameOf, mapApi, openDeviceSettings } from './store.js';
import { icon } from '../../components/icons2.js';
import { brandAvatar, brandOf } from '../../lib/brands.js';
import { createTable } from '../../components/ui.js';
import { kpisHtml } from './kpis.js';
import { fmtHours, fmtAgo, escapeHtml } from '../../lib/format.js';

const ORDER = { nosignal: 0, running: 1, idle: 2 };

const selectHtml = (id, label, value, options) => `
  <label class="flex items-center gap-2 text-sm text-muted" for="${id}">${label}
    <select id="${id}" class="h-9 rounded-full border border-line bg-panel px-3 text-sm text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60">
      <option value="">Todos</option>
      ${options.map(([v, l]) => `<option value="${escapeHtml(v)}" ${v === value ? 'selected' : ''}>${escapeHtml(l)}</option>`).join('')}
    </select></label>`;

// Inicio: tarjetas KPI, filtros por grupo (rancho) y marca, y tabla de unidades.
export function initList() {
  const kpisEl = document.getElementById('fleet-kpis');
  const filtersEl = document.getElementById('fleet-filters');
  const table = createTable(document.getElementById('fleet-table'), {
    label: 'Unidades',
    pageSize: 8,
    searchText: (r) => `${r.name} ${r.uniqueId} ${r.marcaName} ${r.modelo} ${r.lote}`,
    searchPlaceholder: 'Buscar unidad, marca o lote',
    emptyTitle: 'Ninguna unidad coincide',
    emptyText: 'Cambia la búsqueda o quita filtros.',
    onRowClick: (r) => {
      select(r.id);
      mapApi.focusDevice(r.id);
    },
    columns: [
      {
        key: 'name',
        label: 'Unidad',
        sort: (r) => r.name,
        html: (r) => `<span class="flex items-center gap-3">
          <span class="relative grid h-10 w-10 shrink-0 place-items-center rounded-full ring-2 ring-offset-1 ring-offset-panel ${STATUS[r.st].ring}">${
            brandAvatar(r.marca, `<span class="grid h-full w-full place-items-center rounded-full bg-white text-black" title="Marca sin logotipo">${icon('tractor', 'h-5 w-5')}</span>`)
          }</span>
          <span class="min-w-0"><span class="block truncate font-medium">${escapeHtml(r.name)}</span>
          <span class="block truncate text-xs text-muted">${escapeHtml(r.marcaName)}${r.modelo ? ' ' + escapeHtml(r.modelo) : ''}</span></span></span>`,
      },
      {
        key: 'st',
        label: 'Estado',
        sort: (r) => ORDER[r.st],
        html: (r) => `<span class="inline-flex items-center gap-1.5 font-medium ${STATUS[r.st].text}"><span class="h-2 w-2 rounded-full ${STATUS[r.st].dot}"></span>${STATUS[r.st].label}</span>`,
      },
      { key: 'lote', label: 'Ubicación', sort: (r) => r.lote, hide: 'md', html: (r) => escapeHtml(r.lote) },
      { key: 'hoy', label: 'Horas hoy', sort: (r) => r.hoyMs, align: 'right', html: (r) => `<span class="font-mono tabular-nums">${fmtHours(r.hoyMs)}</span>` },
      { key: 'ago', label: 'Última señal', sort: (r) => -r.lastMs, hide: 'lg', html: (r) => `<span class="text-muted">${fmtAgo(r.lastMs)}</span>` },
      {
        key: 'cfg',
        label: 'Ajustes',
        align: 'right',
        html: (r) => `<button type="button" data-dev-gear="${r.id}" aria-label="Ajustes de ${escapeHtml(r.name)}" title="Ajustes de ${escapeHtml(r.name)}"
          class="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-raise hover:text-fg">${icon('gear', 'h-[18px] w-[18px]')}</button>`,
      },
    ],
  });
  table.setStatus('loading');

  document.getElementById('fleet-table').addEventListener('click', (e) => {
    const g = e.target.closest('[data-dev-gear]');
    if (g) openDeviceSettings(Number(g.dataset.devGear));
  });
  filtersEl.addEventListener('change', (e) => {
    if (e.target.id === 'f-group') state.chips.group = e.target.value || null;
    if (e.target.id === 'f-marca') state.chips.marca = e.target.value || null;
    notify();
  });

  let lastKpis = '';
  let lastFilters = '';
  let lastRows = '';
  subscribe(() => {
    const k = kpisHtml();
    if (k !== lastKpis) kpisEl.innerHTML = lastKpis = k;

    const groups = [...new Set([...state.devices.keys()].map(groupOf))].sort();
    const marcas = [...new Set([...state.devices.values()].map((d) => d.attributes?.marca).filter(Boolean))].map((s) => [s, brandOf(s)?.name || s]);
    const f =
      selectHtml('f-group', 'Grupo', state.chips.group, groups.map((g) => [g, g])) +
      selectHtml('f-marca', 'Tipo / marca', state.chips.marca, marcas.sort((a, b) => a[1].localeCompare(b[1])));
    if (f !== lastFilters && !filtersEl.contains(document.activeElement)) filtersEl.innerHTML = lastFilters = f;

    const rows = [...state.devices.values()]
      .filter((d) => matches(d.id))
      .map((d) => ({
        id: d.id,
        name: d.name,
        uniqueId: d.uniqueId,
        st: statusOf(d.id),
        marca: d.attributes?.marca,
        marcaName: brandOf(d.attributes?.marca)?.name || 'Sin marca',
        modelo: d.attributes?.modelo || '',
        lote: fenceNameOf(d.id) || 'Fuera de lote',
        hoyMs: state.engineToday.get(d.id) || 0,
        lastMs: new Date(d.lastUpdate || 0).getTime(),
      }));
    // Solo se vuelve a dibujar si cambió algo visible (conserva foco y página).
    const sig = JSON.stringify(rows.map((r) => [r.id, r.st, r.lote, fmtHours(r.hoyMs), fmtAgo(r.lastMs)]));
    if (sig !== lastRows) {
      lastRows = sig;
      table.setRows(rows);
    }
  });
}
