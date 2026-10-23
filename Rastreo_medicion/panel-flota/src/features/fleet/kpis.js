import { state, statusOf } from './store.js';
import { fmtHours, fmtInt } from '../../lib/format.js';

// Resumen de la flota para la cabecera del panel "Flota".
export function kpisHtml() {
  const counts = { running: 0, idle: 0, nosignal: 0 };
  state.devices.forEach((_, id) => counts[statusOf(id)]++);
  const total = state.devices.size || 1;
  let engineMs = 0;
  state.engineToday.forEach((ms) => (engineMs += ms));
  const pct = (n) => `${((n / total) * 100).toFixed(1)}%`;

  const stat = (label, value, cls = '') => `
    <div class="grid gap-0.5 rounded-xl bg-raise px-3 py-2.5">
      <span class="text-[11px] font-medium text-muted">${label}</span>
      <span class="font-mono text-xl font-medium tabular-nums ${cls}">${value}</span>
    </div>`;

  return `
    <div class="grid gap-3">
      <div class="flex h-2.5 overflow-hidden rounded-full bg-raise" role="img"
        aria-label="${counts.running} en marcha, ${counts.idle} apagados, ${counts.nosignal} sin señal">
        <span class="bg-ok transition-[width] duration-500" style="width:${pct(counts.running)}"></span>
        <span class="bg-muted/60 transition-[width] duration-500" style="width:${pct(counts.idle)}"></span>
        <span class="bg-crit transition-[width] duration-500" style="width:${pct(counts.nosignal)}"></span>
      </div>
      <div class="grid grid-cols-4 gap-2">
        ${stat('En marcha', fmtInt(counts.running), 'text-ok')}
        ${stat('Apagados', fmtInt(counts.idle))}
        ${stat('Sin señal', fmtInt(counts.nosignal), counts.nosignal ? 'text-crit' : '')}
        ${stat('Horas hoy', fmtHours(engineMs))}
      </div>
    </div>`;
}
