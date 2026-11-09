// Tarjetas de flota de la portada: se calculan con el estado en vivo del panel. Funciones puras.
import { escapeHtml as esc } from '../../lib/format.js';
import { agoText, num } from './helpers.js';

const metric = (label, value) => `<div class="dh-m"><small>${label}</small><b>${value}</b></div>`;
const HIGH = new Set(['alarm', 'deviceFuelDrop']);

// Conteos y horas de motor de hoy. `statusOf(id)` -> 'running' | 'idle' | 'nosignal'.
export function fleetStats(s, statusOf) {
  const devs = [...s.devices.values()];
  const st = { running: 0, idle: 0, nosignal: 0 };
  devs.forEach((d) => {
    const k = statusOf(d.id);
    st[k] = (st[k] || 0) + 1;
  });
  const hours = (id) => (s.engineToday.get(id) || 0) / 36e5;
  let totalH = 0;
  let working = 0;
  devs.forEach((d) => {
    const h = hours(d.id);
    totalH += h;
    if (h > 0.05) working++;
  });
  return { devs, st, hours, totalH, working };
}

// Alertas "altas": caída de combustible y alarmas.
export const highEvents = (events = []) => events.filter((e) => HIGH.has(e.type));

function alertLi(e, name) {
  const t = e.type === 'deviceFuelDrop' ? 'Caída de combustible' : e.attributes?.alarm === 'powerCut' ? 'Corte de energía' : 'Alarma';
  return `<li><span class="dh-dot crit"></span><div><b>${esc(name(e.deviceId))}</b><small>${t} · ${agoText(new Date(e.eventTime).getTime())}</small></div></li>`;
}

export function fleetHtml(s, statusOf) {
  const { devs, st, hours, totalH, working } = fleetStats(s, statusOf);
  const name = (id) => s.devices.get(id)?.name || `#${id}`;
  const ev = highEvents(s.events);
  const emptyAlerts =
    '<p class="dh-emptybox"><b>No hay alertas altas recientes</b>Para ver otras alertas y avisos, visite <a href="#" data-hm-page="alertas">Alertas</a>.</p>';
  const alerts = ev.length ? `<ul class="dh-list">${ev.slice(0, 4).map((e) => alertLi(e, name)).join('')}</ul>` : emptyAlerts;
  const alerts2 = ev.length
    ? `<ul class="dh-list">${ev.slice(0, 6).map((e) => alertLi(e, name)).join('')}</ul><p class="dh-more"><a href="#" data-hm-page="alertas">Todas las alertas</a></p>`
    : emptyAlerts;

  const tot = devs.length || 1;
  const running = devs.filter((d) => statusOf(d.id) === 'running').sort((a, b) => hours(b.id) - hours(a.id)).slice(0, 3);
  const equip = devs.length
    ? `<div class="dh-stack" role="img" aria-label="Estado de la flota"><i class="ok" style="width:${(st.running / tot) * 100}%"></i><i class="idle" style="width:${(st.idle / tot) * 100}%"></i><i class="bad" style="width:${(st.nosignal / tot) * 100}%"></i></div>` +
      `<div class="dh-metrics">${metric('En marcha', st.running)}${metric('Apagados', st.idle)}${metric('Sin señal', st.nosignal)}</div>` +
      `<ul class="dh-list" style="margin-top:6px">${running.map((d) => `<li><span class="dh-dot ok"></span><div><b>${esc(d.name)}</b><small>En marcha</small></div><em>${num(hours(d.id), 1)} h</em></li>`).join('')}</ul>`
    : '<p class="dh-emptybox"><b>No se ha encontrado ningún equipo</b>Añada equipos para ver su estado en tiempo real.</p>';

  const work =
    `<div class="dh-metrics">${metric('Horas motor', `${num(totalH, 1)} h`)}${metric('Tractores trabajando', `${working} de ${devs.length}`)}${metric('Promedio', `${num(working ? totalH / working : 0, 1)} h`)}</div>` +
    '<p class="dh-note">Calculado con las horas de motor reportadas hoy por cada tractor.</p>';

  const fences = s.geofences || [];
  const pos = [...s.positions.values()];
  const lotes = fences.length
    ? `<ul class="dh-list dh-lotes">${fences
        .map((g) => {
          const n = pos.filter((p) => (p.geofenceIds || []).includes(g.id)).length;
          const color = g.attributes?.color || '#367C2B';
          return `<li><button type="button" data-hm-lote="${g.id}"><span class="dh-dot" style="background:${esc(color)}"></span><div><b>${esc(g.name)}</b><small>${n} tractor${n === 1 ? '' : 'es'} dentro</small></div><em>Ver</em></button></li>`;
        })
        .join('')}</ul>`
    : '<p class="dh-emptybox"><b>Aún no hay lotes</b>Dibuje lotes para ver cuántos tractores trabajan en cada uno.</p>';

  return { alerts, alerts2, equip, work, lotes, kpi: { running: st.running, idle: st.idle, nosignal: st.nosignal, hours: totalH } };
}
