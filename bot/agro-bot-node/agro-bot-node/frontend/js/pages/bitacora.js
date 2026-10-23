// Bitacora diaria del campo (ver src/public/bitacora.html y src/services/bitacora.js):
// el resumen de un dia agrupado por huerta, armado con lo que se guardo en la base.

import { initToggleTema } from '../tema.js';
import { initRail } from '../rail.js';
initToggleTema('btnTema');
initRail();

const inputDia = document.getElementById('inputDia');
const diaTexto = document.getElementById('diaTexto');
const contTotales = document.getElementById('totales');
const contHuertas = document.getElementById('huertas');
const aviso = document.getElementById('avisoBitacora');

function esc(v) {
  return String(v === undefined || v === null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function hoyLocal() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function moverDia(dia, delta) {
  const d = new Date(`${dia}T12:00:00`);
  d.setDate(d.getDate() + delta);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function diaLargo(dia) {
  const d = new Date(`${dia}T12:00:00`);
  const texto = d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return texto.charAt(0).toUpperCase() + texto.slice(1) + (dia === hoyLocal() ? ' · hoy' : '');
}

function mostrarAviso(html) {
  aviso.hidden = false;
  aviso.innerHTML = html;
}

const ICONOS = {
  registros: '<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>',
  huertas: '<path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/>',
  personas: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  incidencias: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4M12 17h.01"/>',
};
const svg = (paths) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

function pintarTotales(t) {
  const tarjetas = [
    ['registros', 'Registros', t.registros],
    ['huertas', 'Huertas con actividad', t.huertas],
    ['personas', 'Personas / jornaleros', t.personas],
    ['incidencias', 'Incidencias', t.incidencias],
  ];
  contTotales.innerHTML = tarjetas.map(([icono, etiqueta, valor]) => `
    <div class="card p-4">
      <div class="flex items-center gap-2 mb-2"><span class="icono-card">${svg(ICONOS[icono])}</span>
        <span class="text-xs font-semibold text-stone-500 uppercase tracking-wide">${etiqueta}</span></div>
      <p class="text-2xl font-bold text-stone-800 ${icono === 'incidencias' && valor ? 'bitacora-alerta' : ''}">${esc(valor)}</p>
    </div>`).join('');
}

function detalleEntrada(e) {
  const partes = [];
  if (e.cuadrilla) partes.push('Cuadrilla ' + esc(e.cuadrilla));
  if (e.personas) partes.push(esc(e.personas) + ' personas');
  if (e.cantidad) partes.push(esc(e.cantidad) + (e.meta ? ` (meta ${esc(e.meta)})` : ''));
  if (e.equipo) partes.push(esc(e.equipo));
  if (e.litros) partes.push(esc(e.litros) + ' L');
  if (e.insumo && e.insumo !== e.actividad) partes.push(esc(e.insumo));
  return partes.join(' · ');
}

function pintarHuertas(huertas) {
  contHuertas.innerHTML = huertas.map((h) => `
    <section class="card p-5">
      <div class="flex items-start justify-between gap-3 flex-wrap mb-3">
        <div class="flex items-center gap-2 min-w-0">
          <span class="icono-card">${svg(ICONOS.huertas)}</span>
          <div class="min-w-0">
            <h2 class="font-semibold text-stone-800">${esc(h.huerta)}</h2>
            ${h.ubicacion ? `<p class="text-xs text-stone-400">${esc(h.ubicacion)}</p>` : ''}
          </div>
        </div>
        <div class="flex items-center gap-1.5 flex-wrap">
          <span class="bitacora-chip">${h.entradas.length} ${h.entradas.length === 1 ? 'registro' : 'registros'}</span>
          ${h.personas ? `<span class="bitacora-chip">${h.personas} personas</span>` : ''}
          ${h.litros ? `<span class="bitacora-chip">${h.litros} L diésel</span>` : ''}
          ${h.incidencias ? `<span class="bitacora-chip bitacora-chip-alerta">${h.incidencias} ${h.incidencias === 1 ? 'incidencia' : 'incidencias'}</span>` : ''}
        </div>
      </div>
      <ol class="bitacora-linea">
        ${h.entradas.map((e) => `
          <li class="bitacora-entrada ${e.incidencia ? 'con-incidencia' : ''}">
            <div class="flex items-center justify-between gap-2 flex-wrap">
              <p class="text-sm font-semibold text-stone-800">${esc(e.actividad)}
                <span class="text-xs font-medium text-stone-400">· ${esc(e.tablaNombre)}</span></p>
              <span class="text-xs text-stone-400">${esc(e.hora)} · ${e.canal === 'whatsapp' ? 'WhatsApp' : 'Web'}</span>
            </div>
            ${detalleEntrada(e) ? `<p class="text-xs text-stone-600 mt-0.5">${detalleEntrada(e)}</p>` : ''}
            ${e.incidencia ? `<p class="text-xs bitacora-alerta font-semibold mt-1">Incidencia${e.motivoIncidencia ? ': ' + esc(e.motivoIncidencia) : ''}</p>` : ''}
            ${e.observaciones ? `<p class="text-xs text-stone-500 mt-1">${esc(e.observaciones)}</p>` : ''}
            <p class="text-[11px] text-stone-400 mt-1">${e.responsable ? 'Responsable: ' + esc(e.responsable) : ''}${e.responsable && e.reportadoPor ? ' · ' : ''}${e.reportadoPor ? 'Capturó: ' + esc(e.reportadoPor) : ''}</p>
          </li>`).join('')}
      </ol>
    </section>`).join('');
}

async function cargar(dia) {
  inputDia.value = dia;
  diaTexto.textContent = diaLargo(dia);
  aviso.hidden = true;
  try {
    const data = await fetch('/bitacora-datos?fecha=' + encodeURIComponent(dia)).then((r) => r.json());
    if (data.disponible === false) {
      contTotales.innerHTML = '';
      contHuertas.innerHTML = '';
      mostrarAviso(
        '<p class="font-semibold text-stone-700 mb-1">La bitácora necesita la base de datos del bot</p>' +
        '<p>Las capturas se siguen guardando normal en tus hojas, pero para llevar la bitácora el bot ' +
        'tiene que tener activada su base de datos (MySQL). Pídele a quien administra el bot que la configure ' +
        '(<code>DATABASE_URL</code> en el .env y <code>npm run db:migrate</code>).</p>' +
        (data.motivo ? `<p class="text-xs text-stone-400 mt-2">Detalle: ${esc(data.motivo)}</p>` : '')
      );
      return;
    }
    if (!data.ok) {
      contTotales.innerHTML = '';
      contHuertas.innerHTML = '';
      mostrarAviso(`<p class="text-red-600">${esc(data.mensaje || 'No se pudo cargar la bitácora.')}</p>`);
      return;
    }
    pintarTotales(data.totales);
    if (!data.huertas.length) {
      contHuertas.innerHTML = '';
      mostrarAviso('<p>No hay capturas registradas para este día.</p>');
      return;
    }
    pintarHuertas(data.huertas);
  } catch (e) {
    contHuertas.innerHTML = '';
    mostrarAviso(`<p class="text-red-600">No se pudo cargar la bitácora: ${esc(e.message)}</p>`);
  }
}

inputDia.addEventListener('change', () => { if (inputDia.value) cargar(inputDia.value); });
document.getElementById('btnDiaAnterior').addEventListener('click', () => cargar(moverDia(inputDia.value || hoyLocal(), -1)));
document.getElementById('btnDiaSiguiente').addEventListener('click', () => cargar(moverDia(inputDia.value || hoyLocal(), 1)));
document.getElementById('btnHoy').addEventListener('click', () => cargar(hoyLocal()));

cargar(hoyLocal());
