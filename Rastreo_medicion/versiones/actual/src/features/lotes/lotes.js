import { state, subscribe, statusOf, mapApi, openFenceSettings } from '../fleet/store.js';
import { icon } from '../../components/icons.js';
import { fmtHours, escapeHtml } from '../../lib/format.js';

// Vista "Lotes": geocercas con tractores dentro y horas del día.
export function initLotes() {
  const root = document.querySelector('[data-section="lotes"]');
  let last = '';

  root.addEventListener('click', (e) => {
    const g = e.target.closest('[data-fence-gear]');
    if (g) return openFenceSettings(Number(g.dataset.fenceGear));
    const b = e.target.closest('[data-fence]');
    if (b) mapApi.fitFence(Number(b.dataset.fence));
  });

  subscribe(() => {
    if (state.view !== 'lotes') return;
    const stats = new Map(state.geofences.map((g) => [g.id, { g, total: 0, running: 0, ms: 0 }]));
    state.positions.forEach((p, id) => {
      const s = stats.get(p.geofenceIds?.[0]);
      if (!s) return;
      s.total++;
      if (statusOf(id) === 'running') s.running++;
      s.ms += state.engineToday.get(id) || 0;
    });
    const list = [...stats.values()].sort((a, b) => b.ms - a.ms);

    const html = `
      <div class="grid gap-1 border-b border-line px-5 pb-4 pt-1 lg:pt-2">
        <div class="flex items-baseline justify-between">
          <h2 class="font-display text-[28px] font-bold leading-none tracking-tight">Lotes</h2>
          <span class="text-sm text-muted">${list.length} geocercas</span>
        </div>
        <p class="text-sm text-muted">Toca un lote para verlo en el mapa.</p>
      </div>
      <ul class="min-h-0 flex-1 overflow-y-auto py-1">
        ${
          list.length
            ? list
                .map(
                  ({ g, total, running, ms }) => `<li class="group/row flex items-center transition hover:bg-raise"><button type="button" data-fence="${g.id}" class="flex min-w-0 flex-1 items-center gap-3 py-3 pl-5 pr-2 text-left">
                <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent" style="${g.attributes?.color ? `color:${g.attributes.color};background:${g.attributes.color}22` : ''}">${icon('polygon')}</span>
                <span class="min-w-0 flex-1">
                  <span class="block truncate font-medium">${escapeHtml(g.name)}</span>
                  ${g.attributes?.cultivo ? `<span class="block truncate text-xs text-muted">${escapeHtml(g.attributes.cultivo)}${g.attributes.superficie ? ` · ${escapeHtml(g.attributes.superficie)} ha` : ''}</span>` : ''}
                  <span class="block text-[13px] text-muted">${total} tractores · <span class="text-ok">${running} en marcha</span></span>
                </span>
                <span class="grid justify-items-end"><span class="font-mono text-base tabular-nums">${fmtHours(ms)}</span><span class="text-[11px] text-muted">h hoy</span></span>
              </button><button type="button" data-fence-gear="${g.id}" aria-label="Ajustes del lote ${escapeHtml(g.name)}" title="Ajustes del lote ${escapeHtml(g.name)}"
                class="mr-3 grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted opacity-70 transition hover:bg-raise hover:text-fg hover:opacity-100 group-hover/row:opacity-100 focus-visible:opacity-100">${icon('gear', 'h-[18px] w-[18px]')}</button></li>`,
                )
                .join('')
            : '<li class="px-6 py-12 text-center text-sm text-muted">No hay geocercas. Dibuja los lotes en Traccar para verlos aquí.</li>'
        }
      </ul>`;
    if (html !== last) root.innerHTML = last = html;
  });
}
