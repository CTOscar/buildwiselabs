// Vista "Combustible y velocidad": informes por periodo con 4 pestañas (resumen, gráfica del tractor,
// gráficas de la flota y lista de cargas/descargas). Los recorridos salen de client.getRoute().
import { state, subscribe, setView, select, mapApi, fenceNameOf } from '../fleet/store.js';
import { config } from '../../config.js';
import { escapeHtml as esc } from '../../lib/format.js';
import { icon } from '../../components/icons2.js';
import { aggregateFleet, analyzeSeries, eventsCsv, fuelSvg, litersOf, normalizeRoute } from './analysis.js';
import { chartDefs, destroyCharts, renderCharts } from './charts.js';

const TABS = [
  ['resumen', 'Resumen'],
  ['grafica', 'Combustible y velocidad'],
  ['graficas', 'Gráficas'],
  ['eventos', 'Cargas y descargas'],
];
const TZ_OFFSET = '-07:00'; // Sinaloa, sin horario de verano
const mxn = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
const int = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });
const dec1 = new Intl.NumberFormat('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const dayOf = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: config.tz }).format(d);
const stamp = (t) =>
  new Date(t).toLocaleString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: config.tz });
const daysFromToday = (n) => dayOf(new Date(Date.now() + n * 864e5));
const imei = (d) => esc(String(d?.uniqueId || '—'));
const copyBtn = (d) =>
  d?.uniqueId
    ? `<span role="button" tabindex="0" data-copy="${imei(d)}" class="inline-grid h-5 w-5 shrink-0 cursor-pointer place-items-center rounded text-muted hover:bg-raise hover:text-fg" aria-label="Copiar IMEI" title="Copiar IMEI">${icon('copy', 'h-3.5 w-3.5')}</span>`
    : '';

const card = (title, aside, body) => `
  <section class="overflow-hidden rounded-lg border border-line bg-panel">
    <div class="flex items-center gap-3 bg-raise px-3 py-1.5 text-xs font-medium"><span class="min-w-0 flex-1 truncate">${title}</span>${aside ? `<span class="font-normal opacity-80">${aside}</span>` : ''}</div>
    ${body}
  </section>`;
const th = (t, right) => `<th class="whitespace-nowrap border-b border-line bg-raise px-3 py-1.5 text-xs font-semibold ${right ? 'text-right' : 'text-left'}">${t}</th>`;
const td = (t, right, extra = '') => `<td class="whitespace-nowrap px-3 py-1.5 ${right ? 'text-right tabular-nums' : ''} ${extra}">${t}</td>`;
const legend = (items) =>
  `<div class="flex flex-wrap gap-x-4 gap-y-1 border-t border-line px-3 py-2 text-xs text-muted">${items
    .map(([c, t, dashed]) => `<span class="inline-flex items-center gap-1.5"><i class="inline-block h-0 w-4 border-t-2 ${dashed ? 'border-dashed' : ''}" style="border-color:rgb(${c})"></i>${t}</span>`)
    .join('')}</div>`;

export function initStats(client) {
  const host = document.getElementById('stats-view');
  if (!host) return;

  let from = dayOf(new Date());
  let to = from;
  let tab = 'resumen';
  let pickedId = null;
  let search = '';
  let allEvents = false;
  let pending = 0;
  let wasSmall = null;
  let defs = null;
  const cache = new Map(); // "desde|hasta:id" -> 'loading' | 'error' | { series, a }
  const small = () => host.clientWidth < 640;
  const key = (id) => `${from}|${to}:${id}`;
  const range = () => {
    const a = new Date(`${from}T00:00:00${TZ_OFFSET}`);
    const b = new Date(`${to}T23:59:59${TZ_OFFSET}`);
    return [a, b > new Date() ? new Date() : b];
  };
  const probeDevices = () =>
    [...state.devices.values()]
      .filter((d) => typeof state.positions.get(d.id)?.attributes?.fuel === 'number')
      .sort((a, b) => a.name.localeCompare(b.name));
  const ready = () =>
    probeDevices()
      .map((d) => ({ d, r: cache.get(key(d.id)) }))
      .filter((x) => x.r && x.r !== 'loading' && x.r !== 'error');
  const eventsOf = (list) =>
    list.flatMap((x) => x.r.a.events.map((e) => ({ ...e, d: x.d }))).sort((a, b) => a.t - b.t);
  const periodLabel = () => (from === to ? from : `${from} a ${to}`);
  const price = () => config.dieselPrice;

  // Pide el recorrido de cada tractor con sonda (4 a la vez) y vuelve a pintar al llegar cada uno.
  async function load() {
    if (typeof client.getRoute !== 'function') return;
    const [a, b] = range();
    const tag = `${from}|${to}`;
    const todo = probeDevices().filter((d) => !cache.has(key(d.id)));
    todo.forEach((d) => cache.set(key(d.id), 'loading'));
    pending += todo.length;
    const worker = async () => {
      for (let d; (d = todo.shift()); ) {
        try {
          const series = normalizeRoute((await client.getRoute(d.id, a, b)) || []);
          cache.set(`${tag}:${d.id}`, { series, a: analyzeSeries(series) });
        } catch {
          cache.set(`${tag}:${d.id}`, 'error');
        }
        pending--;
        draw();
      }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
  }

  const emptyMsg = (loading = 'Cargando datos') => `<p class="px-3 py-10 text-center text-sm text-muted">${pending ? `${loading} (${pending})…` : 'Sin datos en el periodo.'}</p>`;

  function summaryTab(list) {
    const rows = list.map(({ d, r }) => ({ d, a: r.a, dl: litersOf(r.a.events, 'drain'), rl: litersOf(r.a.events, 'refuel') }));
    const tot = rows.reduce((t, x) => ({ cons: t.cons + x.a.consumed, dl: t.dl + x.dl, rl: t.rl + x.rl, h: t.h + x.a.movingH }), { cons: 0, dl: 0, rl: 0, h: 0 });
    const mini = (label, value, extra = '') => `<div><div class="text-[11px] text-muted">${label}</div><div class="text-[13px] font-medium tabular-nums ${extra}">${value}</div></div>`;
    const table = rows
      .map(
        ({ d, a, dl, rl }) => `<tr data-pick="${d.id}" data-row="1" class="cursor-pointer border-b border-line hover:bg-raise ${d.id === pickedId ? 'bg-raise' : ''}">
        ${td(`<b>${esc(d.name)}</b>`)}${td(`<span class="inline-flex items-center gap-1.5 font-mono text-xs">${imei(d)}${copyBtn(d)}</span>`)}${td(int.format(a.consumed), true)}${td(rl || '—', true)}${td(dl || '—', true, dl ? 'font-semibold text-crit' : '')}
        ${td(dl ? mxn.format(dl * price()) : '—', true)}${td(String(a.avgKmh), true)}${td(String(a.maxKmh), true)}${td(dec1.format(a.movingH), true)}</tr>`,
      )
      .join('');
    const cards = rows
      .map(
        ({ d, a, dl, rl }) => `<div data-pick="${d.id}" data-row="1" class="cursor-pointer border-b border-line px-3 py-2.5 ${d.id === pickedId ? 'bg-raise' : ''}">
        <div class="mb-1.5 flex items-baseline justify-between"><b class="text-sm">${esc(d.name)}</b><span class="text-xs text-muted">Consumo <b class="text-fg">${int.format(a.consumed)} L</b></span></div>
        <div class="grid grid-cols-3 gap-x-3 gap-y-1.5">${mini('Cargas', rl ? `${rl} L` : '—')}${mini('Descargas', dl ? `${dl} L` : '—', dl ? 'text-crit' : '')}${mini('Costo desc.', dl ? mxn.format(dl * price()) : '—')}
        ${mini('Vel. prom.', `${a.avgKmh} km/h`)}${mini('Vel. máx.', `${a.maxKmh} km/h`)}${mini('En mov.', `${dec1.format(a.movingH)} h`)}</div></div>`,
      )
      .join('');
    const totals = rows.length
      ? `<tfoot><tr class="bg-raise text-[13px] font-semibold">${td('Total')}${td('')}${td(int.format(tot.cons), true)}${td(int.format(tot.rl), true)}${td(int.format(tot.dl), true, tot.dl ? 'text-crit' : '')}${td(mxn.format(tot.dl * price()), true)}${td('', true)}${td('', true)}${td(dec1.format(tot.h), true)}</tr></tfoot>`
      : '';
    return card(
      `Resumen del periodo · ${periodLabel()}`,
      `${rows.length} tractores`,
      `<div class="md:hidden">${cards || emptyMsg()}</div>
      <div class="hidden overflow-x-auto md:block"><table class="w-full text-[13px]"><thead><tr>${th('Tractor')}${th('IMEI')}${th('Consumo, L', 1)}${th('Cargas, L', 1)}${th('Descargas, L', 1)}${th('Costo descargas', 1)}${th('Vel. prom., km/h', 1)}${th('Vel. máx., km/h', 1)}${th('En movimiento, h', 1)}</tr></thead>
      <tbody>${table || `<tr><td colspan="9">${emptyMsg()}</td></tr>`}</tbody>${totals}</table></div>
      <div class="border-t border-line px-3 py-2 text-xs text-muted">Descarga: baja de 20 L o más con el tractor detenido. Carga: sube 20 L o más. Costo a ${mxn.format(price())} por litro. Clic en un tractor para ver su gráfica.</div>`,
    );
  }

  function chartTab() {
    const r = cache.get(key(pickedId));
    const dev = state.devices.get(pickedId);
    const name = esc(dev?.name || '—');
    if (!r || r === 'loading' || r === 'error') {
      return card(`Combustible y velocidad · ${name} · IMEI ${imei(dev)}`, '', `<p class="py-20 text-center text-sm text-muted">${r === 'error' ? 'No se pudo cargar el historial.' : 'Cargando historial…'}</p>`);
    }
    const { html } = fuelSvg(r.series, small() ? { w: 360, h1: 150, h2: 90 } : { w: 820, h1: 170, h2: 100 });
    const stat = ([l, v]) => `<div class="bg-panel px-3 py-2"><div class="text-xs text-muted">${l}</div><div class="font-semibold tabular-nums">${v}</div></div>`;
    return card(
      `Volumen de combustible y velocidad · ${name} · IMEI ${imei(dev)}`,
      periodLabel(),
      `<div class="p-3">${html || '<p class="py-16 text-center text-sm text-muted">Sin datos en el periodo.</p>'}</div>
      ${legend([['var(--fg)', 'Volumen de combustible, L'], ['var(--accent)', 'Velocidad, km/h'], ['var(--ok)', 'Motor encendido / carga', 1], ['var(--crit)', 'Descarga', 1]])}
      <div class="grid grid-cols-2 gap-px border-t border-line bg-line text-[13px] sm:grid-cols-4">
        ${[['Consumo', `${int.format(r.a.consumed)} L`], ['Eventos', r.a.events.length], ['Vel. promedio', `${r.a.avgKmh} km/h`], ['Vel. máxima', `${r.a.maxKmh} km/h`]].map(stat).join('')}
      </div>`,
    );
  }

  function chartsTab(list) {
    defs = null;
    if (!list.length) return card('Gráficas', '', emptyMsg());
    const agg = aggregateFleet(
      list.map(({ d, r }) => ({ device: d, series: r.series, analysis: r.a })),
      fenceNameOf,
    );
    const sel = list.find((x) => x.d.id === pickedId);
    defs = chartDefs(agg, sel ? { name: sel.d.name, series: sel.r.series } : null, periodLabel());
    return `<div class="grid gap-3 xl:grid-cols-2">${defs
      .map((c) => card(esc(c.title), c.periodLabel, `<div class="relative ${c.id === 'doughnut' || c.id === 'pie' ? 'h-[340px]' : 'h-[280px]'} p-3 md:h-[280px]"><canvas data-chart="${c.id}" aria-label="${esc(c.title)}" role="img"></canvas></div>`))
      .join('')}</div>`;
  }

  function eventsTab(list) {
    const evs = eventsOf(allEvents ? list : list.filter((x) => x.d.id === pickedId));
    const none = pending ? 'Cargando…' : 'Sin cargas ni descargas en el periodo.';
    const tableRows = evs
      .map((e) => {
        const drain = e.type === 'drain';
        return `<tr class="border-b border-line hover:bg-raise">
          ${td(esc(e.d.name))}${td(`<span class="inline-flex items-center gap-1.5 font-mono text-xs">${imei(e.d)}${copyBtn(e.d)}</span>`)}${td(stamp(e.t))}${td(drain ? 'Descarga' : 'Carga', false, drain ? 'font-semibold text-crit' : '')}${td(int.format(e.liters), true)}${td(mxn.format(e.liters * price()), true)}
          ${td(Number.isFinite(e.lat) ? `${e.lat.toFixed(5)}, ${e.lon.toFixed(5)}` : '—')}${td(`<button type="button" data-fly="${e.d.id}" data-t="${e.t}" class="font-medium text-accent hover:underline">Ver en mapa</button>`)}</tr>`;
      })
      .join('');
    const cards = evs
      .map((e) => {
        const drain = e.type === 'drain';
        return `<div class="border-b border-line px-3 py-2.5 text-[13px]">
          <div class="flex items-baseline justify-between"><b>${esc(e.d.name)} <span class="${drain ? 'text-crit' : 'text-ok'}">· ${drain ? 'Descarga' : 'Carga'}</span></b><b class="tabular-nums">${int.format(e.liters)} L</b></div>
          <div class="inline-flex items-center gap-1 font-mono text-[11px] text-muted">IMEI ${imei(e.d)}${copyBtn(e.d)}</div>
          <div class="mt-0.5 flex justify-between text-xs text-muted"><span>${stamp(e.t)}</span><span>≈ ${mxn.format(e.liters * price())}</span></div>
          <div class="mt-1 flex items-center justify-between text-xs text-muted"><span>${Number.isFinite(e.lat) ? `${e.lat.toFixed(4)}, ${e.lon.toFixed(4)}` : '—'}</span><button type="button" data-fly="${e.d.id}" data-t="${e.t}" class="font-medium text-accent">Ver en mapa</button></div></div>`;
      })
      .join('');
    return card(
      'Lista de cargas y descargas',
      `${evs.length} evento(s)`,
      `<div class="flex items-center gap-3 border-b border-line px-3 py-2 text-[13px]">
        <label class="inline-flex items-center gap-2"><input type="checkbox" id="stats-all" ${allEvents ? 'checked' : ''}/>Todos los tractores</label>
        <button type="button" data-csv class="btn ml-auto px-3 py-1 text-xs">Exportar CSV</button></div>
      <div class="md:hidden">${cards || `<p class="px-3 py-10 text-center text-sm text-muted">${none}</p>`}</div>
      <div class="hidden overflow-x-auto md:block"><table class="w-full text-[13px]"><thead><tr>${th('Tractor')}${th('IMEI')}${th('Fecha y hora')}${th('Evento')}${th('Volumen, L', 1)}${th('Costo estimado', 1)}${th('Ubicación')}${th('')}</tr></thead>
      <tbody>${tableRows || `<tr><td colspan="8" class="px-3 py-10 text-center text-muted">${none}</td></tr>`}</tbody></table></div>`,
    );
  }

  function draw() {
    if (host.hidden) return;
    const devices = probeDevices();
    const list = ready();
    if (pickedId == null || !devices.some((d) => d.id === pickedId)) pickedId = list.find((x) => x.r.a.events.length)?.d.id ?? devices[0]?.id ?? null;
    const dev = state.devices.get(pickedId);
    const q = search.trim().toLowerCase();
    const shown = devices.filter((d) => !q || d.name.toLowerCase().includes(q) || String(d.uniqueId || '').includes(q));
    const body = tab === 'resumen' ? summaryTab(list) : tab === 'grafica' ? chartTab() : tab === 'graficas' ? chartsTab(list) : eventsTab(list);
    const scroll = host.querySelector('[data-scroll]')?.scrollTop || 0;
    const typing = document.activeElement?.id === 'stats-q';
    const today = dayOf(new Date());

    host.innerHTML = `
    <div class="flex h-full flex-col bg-ink">
      <header class="flex items-center gap-3 border-b border-line bg-panel px-3 py-2">
        <button type="button" data-act="stats-close" class="btn px-3 py-1 text-xs">← Volver al mapa</button>
        <h2 class="text-sm font-semibold">Informes · Combustible y velocidad</h2>
      </header>
      <div class="grid min-h-0 flex-1 max-lg:grid-rows-[auto_minmax(0,1fr)] lg:grid-cols-[272px_minmax(0,1fr)]">
        <aside class="flex min-h-0 flex-col border-b border-line bg-panel lg:border-b-0 lg:border-r">
          <div class="border-b border-line p-3">
            <div class="mb-2 text-xs font-semibold text-muted">Periodo</div>
            <div class="grid grid-cols-2 gap-2 text-[13px]">
              <label class="grid gap-0.5"><span class="text-xs text-muted">Desde</span><input type="date" id="stats-from" value="${from}" max="${today}" class="h-8 rounded-md border border-line bg-panel px-1.5"></label>
              <label class="grid gap-0.5"><span class="text-xs text-muted">Hasta</span><input type="date" id="stats-to" value="${to}" max="${today}" class="h-8 rounded-md border border-line bg-panel px-1.5"></label>
            </div>
            <label class="mt-3 grid gap-0.5 text-[13px] lg:hidden"><span class="text-xs text-muted">Tractor</span>
              <select id="stats-pick-m" class="h-9 rounded-md border border-line bg-panel px-1.5">${devices.map((d) => `<option value="${d.id}" ${d.id === pickedId ? 'selected' : ''}>${esc(d.name)} · ${imei(d)}</option>`).join('')}</select></label>
            <div class="mt-2 flex gap-3 text-xs">${[['hoy', 0, 0], ['ayer', -1, -1], ['7 días', -6, 0]].map(([l, a, b]) => `<button type="button" data-q="${a}:${b}" class="font-medium text-accent hover:underline">${l}</button>`).join('')}</div>
          </div>
          <div class="border-b border-line p-3 max-lg:hidden"><input id="stats-q" type="search" value="${esc(search)}" placeholder="Buscar tractor o IMEI" class="h-8 w-full rounded-md border border-line bg-panel px-2 text-[13px]"></div>
          <ul class="min-h-0 flex-1 divide-y divide-line overflow-y-auto text-[13px] max-lg:hidden">
            ${shown
              .map((d) => {
                const r = cache.get(key(d.id));
                const n = r && r !== 'loading' && r !== 'error' ? r.a.events.length : 0;
                return `<li><button type="button" data-pick="${d.id}" class="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-raise ${d.id === pickedId ? 'bg-raise font-semibold' : ''}">
                  <span class="min-w-0 flex-1"><span class="block truncate">${esc(d.name)}</span><span class="flex items-center gap-1 font-mono text-[11px] font-normal text-muted"><span class="truncate">${imei(d)}</span>${copyBtn(d)}</span></span>${n ? `<span class="text-xs text-muted">${n} ev.</span>` : ''}
                  <span class="w-12 text-right text-xs tabular-nums text-muted">${Math.round(state.positions.get(d.id).attributes.fuel)} L</span></button></li>`;
              })
              .join('') || '<li class="px-3 py-6 text-center text-muted">Sin resultados</li>'}
          </ul>
          <div class="border-t border-line px-3 py-2 text-xs text-muted max-lg:hidden">${devices.length} tractores con sonda</div>
        </aside>
        <div class="flex min-h-0 min-w-0 flex-col">
          <div class="flex flex-col gap-1.5 bg-raise px-2 pt-2 lg:flex-row lg:items-end lg:gap-3">
            <div class="flex min-w-0 flex-1 gap-px overflow-x-auto" role="tablist">
              ${TABS.map(([id, label]) => `<button type="button" role="tab" data-tab="${id}" aria-selected="${tab === id}" class="shrink-0 whitespace-nowrap px-3 py-2 text-[13px] font-medium lg:px-4 ${tab === id ? 'bg-ink text-fg' : 'text-muted hover:text-fg'}">${label}</button>`).join('')}
            </div>
            ${dev ? `<div class="flex shrink-0 items-center justify-between gap-2 px-1 pt-0.5 text-xs max-lg:order-first lg:mb-1.5 lg:justify-start lg:px-0 lg:pt-0" title="Tractor seleccionado"><b class="max-w-[140px] truncate font-semibold">${esc(dev.name)}</b><span class="inline-flex items-center gap-1.5 rounded bg-ink/40 py-0.5 pl-2 pr-1 font-mono tabular-nums">IMEI ${imei(dev)}<button type="button" data-copy="${imei(dev)}" class="grid h-6 w-6 place-items-center rounded hover:bg-ink/60" aria-label="Copiar IMEI" title="Copiar IMEI">${icon('copy', 'h-3.5 w-3.5')}</button></span></div>` : ''}
          </div>
          <div data-scroll class="min-h-0 flex-1 overflow-y-auto p-3">${body}</div>
        </div>
      </div>
    </div>`;

    const sc = host.querySelector('[data-scroll]');
    if (sc) sc.scrollTop = scroll;
    if (defs) renderCharts(host, defs).catch((e) => console.warn('[gráficas]', e));
    else destroyCharts();
    if (typing) {
      const input = host.querySelector('#stats-q');
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }
  }

  function setPeriod(a, b) {
    from = a;
    to = b;
    draw();
    load();
  }

  function exportCsv() {
    const rows = eventsOf(ready()).map((e) => ({ ...e, device: e.d }));
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([eventsCsv(rows, price(), stamp)], { type: 'text/csv;charset=utf-8' }));
    link.download = `cargas-descargas_${from}_${to}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  host.addEventListener('click', (e) => {
    if (e.target.closest('[data-act="stats-close"]')) return setView('fleet');
    const copy = e.target.closest('[data-copy]');
    if (copy) {
      navigator.clipboard?.writeText(copy.dataset.copy).then(
        () => {
          copy.innerHTML = icon('check', 'h-3.5 w-3.5');
          copy.title = 'Copiado';
          setTimeout(() => {
            copy.innerHTML = icon('copy', 'h-3.5 w-3.5');
            copy.title = 'Copiar IMEI';
          }, 1500);
        },
        () => {},
      );
      e.stopPropagation();
      return;
    }
    const t = e.target.closest('[data-tab]');
    if (t) {
      tab = t.dataset.tab;
      return draw();
    }
    const q = e.target.closest('[data-q]');
    if (q) {
      const [a, b] = q.dataset.q.split(':').map(Number);
      return setPeriod(daysFromToday(a), daysFromToday(b));
    }
    const pick = e.target.closest('[data-pick]');
    if (pick) {
      pickedId = Number(pick.dataset.pick);
      if (tab === 'resumen' && pick.dataset.row) tab = 'grafica';
      return draw();
    }
    if (e.target.closest('[data-csv]')) return exportCsv();
    const fly = e.target.closest('[data-fly]');
    if (fly) {
      const id = Number(fly.dataset.fly);
      const r = cache.get(key(id));
      const events = r && r !== 'loading' && r !== 'error' ? r.a.events : [];
      const ev = events.find((x) => String(x.t) === fly.dataset.t);
      select(id);
      mapApi.setEventMarks?.(events.map((x) => ({ ...x, cost: x.liters * price() })));
      if (ev) mapApi.focusPoint?.(ev.lat, ev.lon);
    }
  });
  host.addEventListener('change', (e) => {
    const id = e.target.id;
    if (id === 'stats-pick-m') {
      pickedId = Number(e.target.value);
      draw();
    } else if (id === 'stats-all') {
      allEvents = e.target.checked;
      draw();
    } else if (id === 'stats-from' || id === 'stats-to') {
      const a = host.querySelector('#stats-from').value || from;
      const b = host.querySelector('#stats-to').value || to;
      if (a && b) setPeriod(a <= b ? a : b, a <= b ? b : a);
    }
  });
  host.addEventListener('input', (e) => {
    if (e.target.id === 'stats-q') {
      search = e.target.value;
      draw();
    }
  });

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const s = small();
      if (!host.hidden && wasSmall !== null && s !== wasSmall) draw();
      wasSmall = s;
    }, 200);
  });

  subscribe(() => {
    const show = state.view === 'stats';
    const wasOpen = !host.hidden;
    host.hidden = !show;
    if (show && !wasOpen) {
      wasSmall = small();
      draw();
      load().then(draw);
    }
  });
}
