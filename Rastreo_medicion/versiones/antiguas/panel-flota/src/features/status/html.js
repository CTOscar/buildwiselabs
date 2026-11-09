// HTML de la página Status. Función pura: recibe el modelo (createStatus) y, si hay, los conteos de la flota en vivo.
import { escapeHtml as esc } from '../../lib/format.js';
import { ALL, DAYS, GROUPS, LABELS, PHASES, dayKey, worst } from './model.js';

const DAY = 864e5;
const fmtDay = (d) => new Date(d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const fmtUTC = (d) => `${new Date(d).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC', hour12: false })} UTC`;

function bars(S, comp, now) {
  const h = S.hist[comp] || {};
  let out = '';
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = now - i * DAY;
    const s = h[dayKey(d)] || 'operational';
    const tip = s === 'nodata' ? 'No hay datos para este día' : s === 'operational' ? 'Sin interrupciones registradas este día' : LABELS[s];
    out += `<span class="hs-bar ${s === 'operational' ? '' : s}"><span class="hs-tip">${esc(fmtDay(d))}<br>${esc(tip)}</span></span>`;
  }
  return out;
}

function banner(overall) {
  if (overall === 'operational') return ['ok', 'Todos los sistemas operativos'];
  if (overall === 'maintenance') return ['maint', 'Mantenimiento en curso'];
  if (overall === 'degraded') return ['warn', 'Algunos sistemas con rendimiento degradado'];
  return ['bad', 'Algunos sistemas con interrupciones'];
}

export function statusHtml(model, live = null) {
  const S = model.state();
  const now = model.clock();
  const adm = S.admin;
  const overall = worst(ALL.map((c) => S.comps[c]));
  const [bCls, bTxt] = banner(overall);
  const avg = ALL.reduce((a, c) => a + model.uptime(c), 0) / ALL.length;
  const opts = ALL.map((c) => `<option>${esc(c)}</option>`).join('');

  let h = '<div id="dh-splash"><h1>Status</h1></div><div class="hs">';
  h += `<div class="hs-top"><span class="hs-sub">Estado del servicio · BuildWise Labs</span><button type="button" class="hs-btn${adm ? '' : ' ghost'}" data-hs="admin">${adm ? '✔ Modo administrador' : 'Administrar'}</button></div>`;
  h += `<div class="hs-banner ${bCls}"><span class="hs-dot"></span>${bTxt}</div>`;
  if (live) h += `<p class="hs-live">Flota en vivo: <b>${live.running}</b> en marcha · <b>${live.idle}</b> apagados · <b${live.nosignal ? ' class="bad"' : ''}>${live.nosignal}</b> sin señal</p>`;
  if (adm) {
    h +=
      '<div class="hs-admin"><b>Controles de administrador</b><div class="hs-actions"><button type="button" class="hs-btn" data-hs="show" data-t="inc">Reportar incidente</button><button type="button" class="hs-btn ghost" data-hs="show" data-t="mt">Programar mantenimiento</button><button type="button" class="hs-btn ghost" data-hs="reset">Restablecer demo</button></div>' +
      `<form class="hs-form" data-f="inc" hidden><h3>Nuevo incidente</h3><input name="title" placeholder="Título (p. ej. Errores al iniciar sesión)" required><div class="hs-two"><select name="comp">${opts}</select><select name="sev"><option value="degraded">Rendimiento degradado</option><option value="partial">Interrupción parcial</option><option value="major">Interrupción mayor</option></select></div><select name="phase">${PHASES.slice(0, 3).map((p) => `<option>${p}</option>`).join('')}</select><textarea name="msg" rows="2" placeholder="Mensaje para los usuarios" required></textarea><button class="hs-btn">Publicar incidente</button></form>` +
      `<form class="hs-form" data-f="mt" hidden><h3>Nuevo mantenimiento</h3><input name="title" placeholder="Título (p. ej. Actualización de seguridad de Debian)" required><div class="hs-two"><select name="comp">${opts}</select><input name="hours" type="number" min="0.5" step="0.5" value="1" title="Duración en horas"></div><input name="start" type="datetime-local" required><textarea name="text" rows="2" placeholder="Descripción e impacto esperado" required></textarea><button class="hs-btn">Programar</button></form></div>`;
  }

  S.incidents.forEach((i) => {
    const tag = i.phase === 'Monitoreando' ? 'mon' : i.phase === 'Identificado' ? 'ide' : 'inv';
    h +=
      `<div class="hs-card hs-inc"><h3>${esc(i.title)}</h3><span class="hs-tag ${tag}">${esc(i.phase)}</span> <span class="hs-comp">${esc(i.comp)}</span>` +
      i.updates.map((u) => `<p class="hs-upd"><b>${esc(u.phase)}</b> – ${esc(u.msg)}<time>${esc(fmtUTC(u.t))}</time></p>`).join('') +
      (adm ? `<form class="hs-form inline" data-f="upd" data-id="${i.id}"><select name="phase">${PHASES.map((p) => `<option${p === i.phase ? ' selected' : ''}>${p}</option>`).join('')}</select><input name="msg" placeholder="Agregar actualización…" required><button class="hs-btn">Publicar</button></form>` : '') +
      '</div>';
  });

  h += `<div class="hs-line"><h2>Disponibilidad</h2><span>Últimos ${DAYS} días: <b>${avg.toFixed(2)} %</b></span></div>`;
  GROUPS.forEach((g) => {
    const gs = worst(g.comps.map((c) => S.comps[c[0]]));
    h += `<details class="hs-card hs-group" open><summary>${esc(g.name)}<span class="hs-st ${gs}">${LABELS[gs]}</span></summary>`;
    g.comps.forEach(([name, desc]) => {
      const st = S.comps[name];
      const control = adm
        ? `<select class="hs-sel" data-comp="${esc(name)}">${Object.keys(LABELS).map((k) => `<option value="${k}"${k === st ? ' selected' : ''}>${LABELS[k]}</option>`).join('')}</select>`
        : `<span class="hs-st ${st}" style="margin-left:auto">${LABELS[st]}</span>`;
      h +=
        `<div class="hs-c"><div class="hs-row"><b>${esc(name)}</b><span class="hs-d">· ${esc(desc)}</span>${control}</div>` +
        `<div class="hs-bars">${bars(S, name, now)}</div><div class="hs-foot"><span>Hace ${DAYS} días</span><span>${model.uptime(name).toFixed(2)} % de disponibilidad</span><span>Hoy</span></div></div>`;
    });
    h += '</details>';
  });
  h += '<div class="hs-legend"><span><i class="ok"></i>Operativo</span><span><i class="degraded"></i>Rendimiento degradado</span><span><i class="partial"></i>Interrupción parcial</span><span><i class="major"></i>Interrupción mayor</span><span><i class="maintenance"></i>Mantenimiento</span></div>';

  h += '<h2 class="hs-h">Soporte y mantenimiento programado</h2>';
  const ms = [...S.maint].sort((a, b) => a.start - b.start);
  if (!ms.length) h += '<p class="hs-none">No hay mantenimientos programados.</p>';
  ms.forEach((m) => {
    const end = m.start + m.hours * 36e5;
    const prog = m.state === 'progress';
    h +=
      `<div class="hs-card hs-mt"><h3>${esc(m.title)}</h3><span class="hs-tag ${prog ? 'prog' : 'sch'}">${prog ? 'En curso' : 'Programado'}</span> <span class="hs-comp">${esc(m.comp)}</span>` +
      `<p><b>${esc(fmtUTC(m.start))}</b> – <b>${esc(fmtUTC(end))}</b></p><p class="hs-d">${esc(m.text)}</p><p class="hs-d small">Publicado el ${esc(fmtDay(m.posted || m.start))}</p>` +
      (adm
        ? `<div class="hs-actions">${prog ? `<button type="button" class="hs-btn" data-hs="mdone" data-id="${m.id}">Completar</button>` : `<button type="button" class="hs-btn" data-hs="mstart" data-id="${m.id}">Iniciar ahora</button>`}<button type="button" class="hs-btn ghost" data-hs="mdel" data-id="${m.id}">Cancelar</button></div>`
        : '') +
      '</div>';
  });

  h += '<h2 class="hs-h" id="hs-hist">Incidentes pasados</h2>';
  const byDay = {};
  S.past.forEach((p) => (byDay[p.day] = byDay[p.day] || []).push(p));
  for (let i = 0; i < 16; i++) {
    const k = dayKey(now - i * DAY);
    const arr = byDay[k];
    if (!arr && i > 2 && i % 3) continue;
    h +=
      `<div class="hs-day">${esc(fmtDay(`${k}T12:00:00Z`))}</div>` +
      (arr ? arr.map((p) => `<div class="hs-card hs-past"><h3>${esc(p.title)}</h3><span class="hs-tag ok">Resuelto</span><p class="hs-d">${esc(p.text)}</p></div>`).join('') : '<p class="hs-none">Sin incidentes reportados.</p>');
  }
  h += '<p class="hs-note">Los datos son de demostración y se guardan en este navegador. Para estado real, conecta cada componente a un endpoint de salud.</p></div>';
  return h;
}
