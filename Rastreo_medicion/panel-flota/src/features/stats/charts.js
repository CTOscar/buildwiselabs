// Gráficas de Chart.js de la pestaña "Gráficas". Chart.js se descarga solo al abrirla.
const TZ = 'America/Mazatlan';
const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const rgb = (n, alpha = 1) => `rgb(${cssVar(n)} / ${alpha})`;
const clock = (t) => new Date(t).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ });
const dayHour = (t) => new Date(t).toLocaleString('es-MX', { day: '2-digit', hour: '2-digit', hour12: false, timeZone: TZ }) + 'h';
const axisL = { title: { display: true, text: 'L' }, beginAtZero: true };

// Paleta para series sin color propio (dona de lotes).
const palette = (n) => {
  const vars = ['--accent', '--fg', '--warn', '--crit', '--muted'];
  return Array.from({ length: n }, (_, i) => rgb(vars[i % vars.length], i < vars.length ? 1 : 0.55));
};

// Definiciones de las 8 gráficas. `agg` sale de aggregateFleet(); `selected` = { name, series } del tractor elegido.
export function chartDefs(agg, selected, periodLabel) {
  const fg = rgb('--fg');
  const accent = rgb('--accent');
  const crit = rgb('--crit');
  const warn = rgb('--warn');
  const top = [...agg.perTractor].sort((a, b) => b.cons - a.cons).slice(0, 12);
  const litres = (key) => agg.lotes.map(([, v]) => v[key]);
  const names = agg.lotes.map(([n]) => n);
  const hourLabels = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}h`);

  const defs = [
    {
      id: 'line',
      title: `Línea · Nivel de combustible · ${selected?.name || ''}`,
      config: {
        type: 'line',
        data: { datasets: [{ label: 'Combustible, L', data: (selected?.series || []).filter((p) => typeof p.fuel === 'number').map((p) => ({ x: p.t, y: p.fuel })), borderColor: fg, backgroundColor: fg, borderWidth: 1.6, pointRadius: 0, tension: 0.15 }] },
        options: { scales: { x: { type: 'linear', ticks: { callback: clock, maxTicksLimit: 7 } }, y: axisL } },
      },
    },
    {
      id: 'area',
      title: 'Área · Consumo acumulado de la flota',
      config: {
        type: 'line',
        data: { datasets: [{ label: 'Litros acumulados', data: agg.cumul.map((c) => ({ x: c.t, y: c.y })), borderColor: accent, backgroundColor: rgb('--accent', 0.18), fill: true, borderWidth: 1.6, pointRadius: 0 }] },
        options: { scales: { x: { type: 'linear', ticks: { callback: dayHour, maxTicksLimit: 8 } }, y: axisL } },
      },
    },
    {
      id: 'bar',
      title: 'Barras · Consumo por tractor (12 mayores)',
      config: {
        type: 'bar',
        data: {
          labels: top.map((t) => t.name),
          datasets: [
            { label: 'Consumo, L', data: top.map((t) => t.cons), backgroundColor: fg, borderWidth: 0 },
            { label: 'Cargas, L', data: top.map((t) => t.rl), backgroundColor: accent, borderWidth: 0 },
            { label: 'Descargas, L', data: top.map((t) => t.dl), backgroundColor: crit, borderWidth: 0 },
          ],
        },
        options: { scales: { x: { ticks: { maxRotation: 60 } }, y: axisL } },
      },
    },
    {
      id: 'stacked',
      title: 'Barras apiladas · Combustible por lote',
      config: {
        type: 'bar',
        data: {
          labels: names,
          datasets: [
            { label: 'Consumo, L', data: litres('cons'), backgroundColor: fg },
            { label: 'Cargas, L', data: litres('rl'), backgroundColor: accent },
            { label: 'Descargas, L', data: litres('dl'), backgroundColor: crit },
          ],
        },
        options: { indexAxis: 'y', scales: { x: { stacked: true, ...axisL }, y: { stacked: true } } },
      },
    },
    {
      id: 'doughnut',
      title: 'Dona · Consumo por lote',
      config: {
        type: 'doughnut',
        data: { labels: names, datasets: [{ data: litres('cons'), backgroundColor: palette(names.length), borderColor: rgb('--panel'), borderWidth: 2 }] },
        options: { cutout: '58%', scales: {}, plugins: { legend: { position: 'right' } } },
      },
    },
    {
      id: 'pie',
      title: 'Pastel · Consumo, cargas y descargas',
      config: {
        type: 'pie',
        data: { labels: ['Consumo', 'Cargas', 'Descargas'], datasets: [{ data: [agg.consL, agg.refuelL, agg.drainL], backgroundColor: [fg, accent, crit], borderColor: rgb('--panel'), borderWidth: 2 }] },
        options: { scales: {}, plugins: { legend: { position: 'right' } } },
      },
    },
    {
      id: 'bubble',
      title: 'Burbujas · Velocidad vs consumo (tamaño = horas en movimiento)',
      config: {
        type: 'bubble',
        data: { datasets: [{ label: 'Tractores', data: agg.perTractor.map((t) => ({ x: t.avg, y: t.cons, r: Math.max(3, Math.min(16, t.h * 0.9)), name: t.name })), backgroundColor: rgb('--accent', 0.55), borderColor: accent, borderWidth: 1 }] },
        options: {
          scales: { x: { title: { display: true, text: 'Velocidad promedio, km/h' } }, y: { title: { display: true, text: 'Consumo, L' }, beginAtZero: true } },
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: (v) => `${v.raw.name}: ${v.raw.x} km/h · ${v.raw.y} L · ${Math.round(v.raw.r / 0.9)} h` } } },
        },
      },
    },
    {
      id: 'mixed',
      title: 'Mixta · Consumo (barras) y velocidad (línea) por hora del día',
      config: {
        data: {
          labels: hourLabels,
          datasets: [
            { type: 'bar', label: 'Consumo, L', data: agg.hours.map((h) => Math.round(h.cons)), backgroundColor: fg, yAxisID: 'y' },
            { type: 'line', label: 'Velocidad prom., km/h', data: agg.hours.map((h) => (h.kmhN ? Math.round(h.kmhSum / h.kmhN) : null)), borderColor: warn, backgroundColor: warn, borderWidth: 1.8, pointRadius: 2, yAxisID: 'y1', spanGaps: true },
          ],
        },
        options: {
          scales: {
            y: { beginAtZero: true, position: 'left', title: { display: true, text: 'L' } },
            y1: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'km/h' } },
          },
        },
      },
    },
  ];
  return defs.map((d) => ({ ...d, periodLabel }));
}

let ChartCtor = null;
const live = [];

async function loadChart() {
  if (!ChartCtor) ChartCtor = (await import('chart.js/auto')).Chart;
  return ChartCtor;
}

export function destroyCharts() {
  live.splice(0).forEach((c) => c.destroy());
}

// Dibuja cada definición en su <canvas data-chart="id"> dentro de `host`.
export async function renderCharts(host, defs) {
  const Chart = await loadChart();
  destroyCharts();
  const small = host.clientWidth < 640;
  Chart.defaults.font.family = 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
  Chart.defaults.font.size = small ? 10 : 11;
  Chart.defaults.color = cssVar('--muted') ? rgb('--muted') : '#555';
  Chart.defaults.borderColor = rgb('--line');
  Chart.defaults.animation = false;
  Chart.defaults.maintainAspectRatio = false;
  defs.forEach((d) => {
    const canvas = host.querySelector(`canvas[data-chart="${d.id}"]`);
    if (!canvas) return;
    const cfg = d.config;
    if (small) {
      if (cfg.type === 'doughnut' || cfg.type === 'pie') cfg.options = { ...cfg.options, plugins: { ...cfg.options?.plugins, legend: { position: 'bottom' } } };
      if (cfg.options?.scales?.x?.ticks) cfg.options.scales.x.ticks.maxTicksLimit = 4;
    }
    cfg.options = {
      responsive: true,
      interaction: { mode: 'nearest', intersect: false },
      ...cfg.options,
      plugins: { legend: { labels: { boxWidth: 10, boxHeight: 10, usePointStyle: false }, ...(cfg.options?.plugins?.legend || {}) }, ...cfg.options?.plugins },
    };
    live.push(new Chart(canvas, cfg));
  });
}
