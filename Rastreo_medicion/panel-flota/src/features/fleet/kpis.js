import { state, statusOf } from './store.js';
import { fmtInt } from '../../lib/format.js';
import { kpiCard } from '../../components/ui.js';
import { openAlertCount } from '../alerts/alerts.js';

// Conteos del resumen de flota.
// Activa = con señal. En movimiento = motor encendido y velocidad > 0.5 nudos. Detenida = con señal sin moverse.
export function fleetCounts() {
  const c = { total: state.devices.size, activas: 0, movimiento: 0, detenidas: 0, sinSenal: 0 };
  state.devices.forEach((_, id) => {
    const st = statusOf(id);
    if (st === 'nosignal') {
      c.sinSenal++;
      return;
    }
    c.activas++;
    if (st === 'running' && (state.positions.get(id)?.speed || 0) > 0.5) c.movimiento++;
    else c.detenidas++;
  });
  return c;
}

// Tarjetas KPI de Inicio.
export function kpisHtml() {
  const c = fleetCounts();
  const alertas = openAlertCount();
  return [
    kpiCard({ label: 'Unidades activas', value: fmtInt(c.activas), hint: `de ${fmtInt(c.total)} en total`, iconName: 'tractor' }),
    kpiCard({ label: 'En movimiento', value: fmtInt(c.movimiento), tone: 'ok', hint: 'Motor encendido y avanzando', iconName: 'navigate' }),
    kpiCard({ label: 'Detenidas', value: fmtInt(c.detenidas), hint: 'Con señal, sin movimiento', iconName: 'clock' }),
    kpiCard({ label: 'Sin señal', value: fmtInt(c.sinSenal), tone: c.sinSenal ? 'crit' : '', hint: 'Sin reporte reciente', iconName: 'signal' }),
    kpiCard({ label: 'Alertas abiertas', value: fmtInt(alertas), tone: alertas ? 'warn' : '', hint: 'Del día de hoy', iconName: 'bell' }),
  ].join('');
}
