// Gráfica de barras horizontales con D3: una sola serie (magnitud), barras delgadas
// con extremo redondeado, eje recesivo, línea de promedio, tooltip y transiciones.
// Se importa desde el paquete "d3" (el que está en package.json); incluye transiciones.
import { select, scaleLinear, scaleBand, max } from 'd3';

const nf1 = new Intl.NumberFormat('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const ROW = 30; // alto por barra
const BAR = 12; // grosor de la barra
const M = { top: 22, right: 52, bottom: 8, left: 84 };
const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Rectángulo con el extremo de datos redondeado (4 px) y la base recta.
function barPath(x0, y, w, h, r = 4) {
  if (w <= 0) return `M${x0},${y}h0v${h}h0Z`;
  const rr = Math.min(r, w, h / 2);
  return `M${x0},${y}h${w - rr}a${rr},${rr} 0 0 1 ${rr},${rr}v${h - 2 * rr}a${rr},${rr} 0 0 1 -${rr},${rr}h-${w - rr}Z`;
}

/**
 * @param {HTMLElement} el contenedor (position: relative)
 * @param {{ label: string, unit?: string, color?: string, onClick?: (d)=>void, tooltip?: (d)=>string }} opts
 */
export function createBarChart(el, opts) {
  const { unit = 'h', color = 'rgb(var(--accent))', onClick, tooltip } = opts;
  el.classList.add('relative');
  const svg = select(el)
    .append('svg')
    .attr('role', 'img')
    .attr('aria-label', opts.label)
    .style('display', 'block')
    .style('width', '100%')
    .style('overflow', 'visible');
  const gGrid = svg.append('g');
  const gBars = svg.append('g');
  const gAvg = svg.append('g').style('pointer-events', 'none');
  const tip = select(el)
    .append('div')
    .attr('class', 'pointer-events-none absolute z-10 hidden min-w-[160px] rounded-lg border border-line bg-panel px-3 py-2 text-xs shadow-float');

  let data = [];
  let avg = null;
  let width = el.clientWidth || 360;

  function render(animate = true) {
    const h = M.top + data.length * ROW + M.bottom;
    svg.attr('viewBox', `0 0 ${width} ${h}`).attr('height', h);
    const innerW = Math.max(40, width - M.left - M.right);
    const x = scaleLinear()
      .domain([0, Math.max(1, max(data, (d) => d.value) || 0, avg || 0)])
      .nice(4)
      .range([M.left, M.left + innerW]);
    const y = scaleBand()
      .domain(data.map((d) => d.key))
      .range([M.top, M.top + data.length * ROW]);
    const t = svg.transition().duration(animate && !reduce() ? 500 : 0);

    // Rejilla y marcas del eje (recesivas, arriba)
    const ticks = x.ticks(4);
    gGrid
      .selectAll('g.tick')
      .data(ticks, (d) => d)
      .join(
        (enter) => {
          const g = enter.append('g').attr('class', 'tick').attr('opacity', 0);
          g.append('line').attr('y1', M.top - 4).style('stroke', 'rgb(var(--line))').style('stroke-width', 1);
          g.append('text')
            .attr('y', M.top - 9)
            .attr('text-anchor', 'middle')
            .style('fill', 'rgb(var(--muted))')
            .style('font', '500 10px "JetBrains Mono", ui-monospace, monospace');
          return g;
        },
        (update) => update,
        (exit) => exit.transition(t).attr('opacity', 0).remove(),
      )
      .call((g) => g.select('line').attr('y2', h - M.bottom))
      .call((g) => g.select('text').text((d) => `${d} ${unit}`))
      .transition(t)
      .attr('opacity', 1)
      .attr('transform', (d) => `translate(${x(d)},0)`);

    // Filas: etiqueta, fondo de pista, barra, valor
    const rows = gBars
      .selectAll('g.row')
      .data(data, (d) => d.key)
      .join(
        (enter) => {
          const g = enter
            .append('g')
            .attr('class', 'row')
            .attr('transform', (d) => `translate(0,${y(d.key) ?? M.top})`)
            .attr('opacity', 0)
            .style('cursor', onClick ? 'pointer' : 'default');
          g.append('rect').attr('class', 'hit').attr('x', 0).attr('height', ROW).style('fill', 'transparent');
          g.append('text')
            .attr('class', 'lbl')
            .attr('x', M.left - 10)
            .attr('y', ROW / 2)
            .attr('dy', '0.35em')
            .attr('text-anchor', 'end')
            .style('fill', 'rgb(var(--fg))')
            .style('font', '500 12px "JetBrains Mono", ui-monospace, monospace');
          g.append('path')
            .attr('class', 'bar')
            .attr('d', barPath(M.left, (ROW - BAR) / 2, 0, BAR))
            .style('fill', color);
          g.append('text')
            .attr('class', 'val')
            .attr('x', M.left + 6)
            .attr('y', ROW / 2)
            .attr('dy', '0.35em')
            .style('fill', 'rgb(var(--fg))')
            .style('font', '500 12px "JetBrains Mono", ui-monospace, monospace')
            .style('font-variant-numeric', 'tabular-nums');
          return g;
        },
        (update) => update,
        (exit) => exit.transition(t).attr('opacity', 0).remove(),
      );

    rows.select('rect.hit').attr('width', width);
    rows.select('text.lbl').text((d) => d.label);
    rows.transition(t).attr('opacity', 1).attr('transform', (d) => `translate(0,${y(d.key)})`);
    rows
      .select('path.bar')
      .style('fill', (d) => (d.highlight ? 'rgb(var(--fg))' : color))
      .transition(t)
      .attr('d', (d) => barPath(M.left, (ROW - BAR) / 2, x(d.value) - M.left, BAR));
    rows
      .select('text.val')
      .text((d) => nf1.format(d.value))
      .transition(t)
      .attr('x', (d) => x(d.value) + 6);

    // Línea de promedio
    gAvg
      .selectAll('g.avg')
      .data(avg != null && data.length ? [avg] : [])
      .join((enter) => {
        const g = enter.append('g').attr('class', 'avg');
        g.append('line').style('stroke', 'rgb(var(--muted))').style('stroke-width', 1.5).style('stroke-dasharray', '4 3');
        g.append('text')
          .attr('text-anchor', 'middle')
          .style('fill', 'rgb(var(--muted))')
          .style('font', '600 10px Manrope, system-ui, sans-serif');
        return g;
      })
      .call((g) => g.select('line').attr('y1', M.top).attr('y2', h - M.bottom))
      .call((g) => g.select('text').attr('y', h - M.bottom + 12).text((d) => `promedio ${nf1.format(d)} ${unit}`))
      .transition(t)
      .attr('transform', (d) => `translate(${x(d)},0)`);
    svg.attr('height', h + (avg != null ? 14 : 0)).attr('viewBox', `0 0 ${width} ${h + (avg != null ? 14 : 0)}`);

    // Interacción: tooltip y clic (zona de toque = fila completa)
    rows
      .on('mouseenter', function (event, d) {
        select(this).select('path.bar').style('opacity', 0.85);
        if (!tooltip) return;
        tip.html(tooltip(d)).classed('hidden', false);
        const ty = (y(d.key) ?? 0) + ROW + 4;
        const tx = Math.min(Math.max(0, x(d.value) - 80), width - 180);
        tip.style('left', `${tx}px`).style('top', `${ty}px`);
      })
      .on('mouseleave', function () {
        select(this).select('path.bar').style('opacity', 1);
        tip.classed('hidden', true);
      })
      .on('click', (_, d) => onClick?.(d));
  }

  new ResizeObserver(() => {
    const w = el.clientWidth;
    if (w && Math.abs(w - width) > 1) {
      width = w;
      render(false);
    }
  }).observe(el);

  return {
    update(next, { average = null } = {}) {
      data = next;
      avg = average;
      width = el.clientWidth || width;
      render(true);
    },
  };
}
