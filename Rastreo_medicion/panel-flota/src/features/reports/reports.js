import { state, subscribe, notify, select, statusOf, STATUS, fenceNameOf, mapApi } from '../fleet/store.js';
import { fmtHours, escapeHtml } from '../../lib/format.js';
import { createBarChart } from './barChart.js';

const TOPS = [
  ['10', 'Top 10'],
  ['20', 'Top 20'],
  ['all', 'Todos'],
];

// Vista "Reportes": horas de motor del día por rancho y por tractor (gráficas D3).
export function initReports() {
  const root = document.querySelector('[data-section="reports"]');
  let top = '10';
  let table = false;

  root.innerHTML = `
    <div class="grid gap-3 border-b border-line px-5 pb-4 pt-1 lg:pt-2">
      <h2 class="font-display text-[28px] font-bold leading-none tracking-tight">Reportes del día</h2>
      <div class="grid grid-cols-3 gap-2" id="rep-kpis"></div>
    </div>
    <div class="min-h-0 flex-1 space-y-7 overflow-y-auto px-5 py-5">
      <section class="grid gap-2" aria-labelledby="rep-r-title">
        <h3 id="rep-r-title" class="text-sm font-semibold">Horas de motor por rancho</h3>
        <div id="chart-ranchos"></div>
      </section>
      <section class="grid gap-3" aria-labelledby="rep-t-title">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h3 id="rep-t-title" class="text-sm font-semibold">Horas de motor por tractor</h3>
          <div class="flex items-center gap-2">
            <div class="flex rounded-full bg-raise p-0.5" role="group" aria-label="Cuántos tractores mostrar" id="rep-top">
              ${TOPS.map(([k, l]) => `<button type="button" data-top="${k}" class="rounded-full px-2.5 py-1 text-xs font-medium transition"></button>`).join('')}
            </div>
            <button type="button" id="rep-table" class="rounded-full border border-line px-2.5 py-1 text-xs font-medium hover:bg-raise" aria-pressed="false">Ver tabla</button>
          </div>
        </div>
        <p class="text-xs text-muted">Toca una barra para ver el tractor en el mapa. La línea punteada es el promedio de la flota.</p>
        <div id="chart-tractores"></div>
        <div id="table-tractores" class="hidden overflow-x-auto rounded-xl border border-line"></div>
      </section>
      <p class="rounded-xl border border-dashed border-line px-4 py-3 text-xs text-muted">
        L/h, costo por lote y preventivos se agregan cuando exista el backend.
      </p>
    </div>`;

  const kpis = root.querySelector('#rep-kpis');
  const topEl = root.querySelector('#rep-top');
  const tableBtn = root.querySelector('#rep-table');
  const chartT = root.querySelector('#chart-tractores');
  const tableT = root.querySelector('#table-tractores');

  TOPS.forEach(([k, l]) => (topEl.querySelector(`[data-top="${k}"]`).textContent = l));
  topEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-top]');
    if (!b) return;
    top = b.dataset.top;
    notify();
  });
  tableBtn.addEventListener('click', () => {
    table = !table;
    notify();
  });

  const tipRow = (k, v) => `<div class="flex justify-between gap-4"><span class="text-muted">${k}</span><span class="font-mono">${v}</span></div>`;

  const ranchosChart = createBarChart(root.querySelector('#chart-ranchos'), {
    label: 'Horas de motor de hoy por rancho',
    tooltip: (d) => `<div class="mb-1 font-semibold">${escapeHtml(d.label)}</div>
      ${tipRow('Horas hoy', `${fmtHours(d.value * 3600e3)} h`)}${tipRow('Tractores', d.count)}${tipRow('En marcha', d.running)}`,
  });

  const tractoresChart = createBarChart(chartT, {
    label: 'Horas de motor de hoy por tractor',
    onClick: (d) => {
      select(d.id);
      mapApi.focusDevice(d.id);
    },
    tooltip: (d) => {
      const s = STATUS[statusOf(d.id)];
      return `<div class="mb-1 flex items-center justify-between gap-3"><span class="font-semibold">${escapeHtml(d.label)}</span>
        <span class="inline-flex items-center gap-1 ${s.text}"><span class="h-1.5 w-1.5 rounded-full ${s.dot}"></span>${s.label}</span></div>
        ${tipRow('Horas hoy', `${fmtHours(d.value * 3600e3)} h`)}
        ${tipRow('Lote', escapeHtml(fenceNameOf(d.id) || 'fuera de lote'))}
        ${tipRow('Nivel', escapeHtml(state.devices.get(d.id)?.attributes?.nivel || '—'))}`;
    },
  });

  subscribe(() => {
    if (state.view !== 'reports') return;

    // Datos
    const byRancho = new Map();
    state.positions.forEach((p, id) => {
      const name = state.geofences.find((g) => g.id === p.geofenceIds?.[0])?.name?.split(' · ')[0] || 'Fuera de lote';
      const r = byRancho.get(name) || { ms: 0, count: 0, running: 0 };
      r.ms += state.engineToday.get(id) || 0;
      r.count++;
      if (statusOf(id) === 'running') r.running++;
      byRancho.set(name, r);
    });
    const ranchos = [...byRancho]
      .sort((a, b) => b[1].ms - a[1].ms)
      .map(([name, r]) => ({ key: name, label: name.length > 11 ? name.slice(0, 10) + '…' : name, value: r.ms / 3600e3, count: r.count, running: r.running }));

    const all = [...state.devices.values()]
      .map((d) => ({ key: String(d.id), id: d.id, label: d.name, value: (state.engineToday.get(d.id) || 0) / 3600e3, highlight: state.selected === d.id }))
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
    const shown = top === 'all' ? all : all.slice(0, Number(top));

    let total = 0;
    state.engineToday.forEach((ms) => (total += ms));
    const active = all.filter((d) => d.value > 0).length;
    const avgH = total / 3600e3 / Math.max(1, active);
    const running = all.filter((d) => statusOf(d.id) === 'running').length;

    // KPIs
    kpis.innerHTML = [
      ['Horas totales', fmtHours(total)],
      ['Promedio', fmtHours(avgH * 3600e3)],
      ['Utilización', `${Math.round((running / Math.max(1, all.length)) * 100)}%`],
    ]
      .map(([k, v]) => `<div class="rounded-xl bg-raise px-3 py-2.5"><div class="text-[11px] text-muted">${k}</div><div class="font-mono text-xl tabular-nums">${v}</div></div>`)
      .join('');

    // Controles
    topEl.querySelectorAll('[data-top]').forEach((b) => {
      const on = b.dataset.top === top;
      b.setAttribute('aria-pressed', String(on));
      b.className = `rounded-full px-2.5 py-1 text-xs font-medium transition ${on ? 'bg-panel text-fg shadow-float' : 'text-muted hover:text-fg'}`;
    });
    tableBtn.setAttribute('aria-pressed', String(table));
    tableBtn.textContent = table ? 'Ver gráfica' : 'Ver tabla';
    chartT.classList.toggle('hidden', table);
    tableT.classList.toggle('hidden', !table);

    // Gráficas D3
    ranchosChart.update(ranchos);
    if (!table) tractoresChart.update(shown, { average: avgH });
    else
      tableT.innerHTML = `<table class="w-full text-sm">
        <thead class="bg-raise text-left text-xs text-muted"><tr><th class="px-3 py-2 font-medium">Tractor</th><th class="px-3 py-2 font-medium">Estado</th><th class="px-3 py-2 font-medium">Lote</th><th class="px-3 py-2 text-right font-medium">Horas hoy</th></tr></thead>
        <tbody class="divide-y divide-line">${shown
          .map((d) => {
            const s = STATUS[statusOf(d.id)];
            return `<tr><td class="px-3 py-2 font-mono">${escapeHtml(d.label)}</td><td class="px-3 py-2 ${s.text}">${s.label}</td>
              <td class="px-3 py-2 text-muted">${escapeHtml(fenceNameOf(d.id) || '—')}</td><td class="px-3 py-2 text-right font-mono tabular-nums">${fmtHours(d.value * 3600e3)}</td></tr>`;
          })
          .join('')}</tbody></table>`;
  });
}
