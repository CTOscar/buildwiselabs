// Panel de monitoreo de los modelos de IA (ver src/public/monitoreo.html y
// src/routes/monitoreo.js). Nada de dependencias nuevas: JS plano + las clases de
// Tailwind que ya usa el resto del proyecto.

import { initToggleTema } from '../tema.js';
import { initRail } from '../rail.js';
initToggleTema('btnTema');
initRail();

function esc(v) {
  return String(v === undefined || v === null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function hace(iso) {
  if (!iso) return 'nunca';
  const seg = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (seg < 60) return 'hace ' + seg + 's';
  if (seg < 3600) return 'hace ' + Math.round(seg / 60) + ' min';
  if (seg < 86400) return 'hace ' + Math.round(seg / 3600) + ' h';
  return 'hace ' + Math.round(seg / 86400) + ' d';
}

function duracion(seg) {
  if (seg < 60) return seg + 's';
  if (seg < 3600) return Math.floor(seg / 60) + ' min';
  if (seg < 86400) return Math.floor(seg / 3600) + ' h ' + Math.floor((seg % 3600) / 60) + ' min';
  return Math.floor(seg / 86400) + ' d ' + Math.floor((seg % 86400) / 3600) + ' h';
}

function pastilla(texto, tono) {
  const tonos = {
    ok: 'bg-green-50 text-green-700 border-green-200',
    mal: 'bg-red-50 text-red-700 border-red-200',
    tibio: 'bg-amber-50 text-amber-800 border-amber-200',
    gris: 'bg-stone-50 text-stone-500 border-stone-200',
  };
  return '<span class="inline-block text-[11px] font-semibold rounded-full border px-2 py-0.5 ' +
    (tonos[tono] || tonos.gris) + '">' + esc(texto) + '</span>';
}

// --- Configuracion + contadores ---

async function cargarDatos() {
  try {
    const data = await fetch('/monitoreo/datos').then((r) => r.json());
    if (!data.ok) return;

    document.getElementById('uptime').textContent =
      'Servidor arriba desde hace ' + duracion(data.uptimeSegundos);

    document.getElementById('configurados').innerHTML = data.configurados.map((c) => {
      const usos = [];
      if (c.activo) usos.push('texto');
      if (c.usoAudio) usos.push('audio');
      return '<div data-tarjeta-modelo class="border border-stone-100 rounded-2xl p-3 ' +
          (c.activo ? 'bg-green-50/40 border-green-200' : 'bg-stone-50') + '">' +
        '<div class="flex items-center justify-between gap-2 flex-wrap">' +
          '<div class="min-w-0">' +
            '<p class="font-semibold text-sm text-stone-800 truncate">' + esc(c.modelo) + '</p>' +
            '<p class="text-xs text-stone-400">' + esc(c.proveedor) + '</p>' +
          '</div>' +
          '<div class="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">' +
            (usos.length ? pastilla('en uso: ' + usos.join(' + '), 'ok') : pastilla('inactivo', 'gris')) +
            (c.llave.presente
              ? pastilla('llave ' + c.llave.pista + ' (' + c.llave.longitud + ')', 'gris')
              : pastilla('SIN API KEY', 'mal')) +
            (c.llave.presente
              ? '<button type="button" class="btnProbar btn-tactile text-[11px] font-semibold rounded-full border border-stone-300 bg-white hover:bg-stone-100 px-3 py-1 transition" data-proveedor="' + esc(c.proveedor) + '">Probar</button>'
              : '') +
          '</div>' +
        '</div>' +
        '<div class="resultadoProbar mt-2" hidden></div>' +
      '</div>';
    }).join('');

    document.querySelectorAll('.btnProbar').forEach((btn) => {
      btn.addEventListener('click', () => probarProveedor(btn));
    });

    const cont = document.getElementById('contadores');
    if (!data.modelos.length) {
      cont.innerHTML = '<p class="text-xs text-stone-400">Todavia no se ha llamado a ningun modelo desde que arranco el servidor.</p>';
      return;
    }

    cont.innerHTML = data.modelos.map((m) => {
      const tono = m.tasaExito === null ? 'gris' : (m.tasaExito >= 95 ? 'ok' : (m.tasaExito >= 70 ? 'tibio' : 'mal'));
      const estados = Object.entries(m.porEstado || {});
      return '<div class="border border-stone-100 rounded-2xl p-3 mb-2">' +
        '<div class="flex items-center justify-between gap-2 flex-wrap mb-2">' +
          '<p class="font-semibold text-sm text-stone-800 truncate min-w-0">' + esc(m.modelo) + '</p>' +
          pastilla(m.tasaExito + '% exito', tono) +
        '</div>' +
        '<div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">' +
          tile('Llamadas', m.llamadas) +
          tile('Errores', m.errores) +
          tile('Latencia prom.', m.latenciaPromedioMs !== null ? m.latenciaPromedioMs + ' ms' : '—') +
          tile('Latencia max.', m.latenciaMaxMs !== null ? m.latenciaMaxMs + ' ms' : '—') +
        '</div>' +
        (estados.length
          ? '<p class="text-[11px] text-stone-500 mt-2">Errores por codigo: ' +
            estados.map(([k, v]) => '<span class="font-semibold">' + esc(k) + '</span>&times;' + v).join(', ') + '</p>'
          : '') +
        '<p class="text-[11px] text-stone-400 mt-1">Ultima respuesta buena: ' + hace(m.ultimoOk) + '</p>' +
        (m.ultimoError
          ? '<p class="text-[11px] text-red-600 mt-1 break-words">Ultimo error (' + esc(m.ultimoError.estado) + ', ' +
            hace(m.ultimoError.ts) + '): ' + esc(m.ultimoError.mensaje) + '</p>'
          : '') +
      '</div>';
    }).join('');
  } catch (e) {
    document.getElementById('contadores').innerHTML =
      '<p class="text-xs text-red-500">No se pudieron cargar los datos: ' + esc(e.message) + '</p>';
  }
}

// Prueba un proveedor concreto. Desde que se puede elegir modelo en el compositor,
// "¿responde?" dejo de ser una sola pregunta -- cada proveedor tiene su llave y su cuota.
async function probarProveedor(btn) {
  const proveedor = btn.dataset.proveedor;
  const caja = btn.closest('[data-tarjeta-modelo]').querySelector('.resultadoProbar');
  const textoOriginal = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Probando...';
  caja.hidden = false;
  caja.innerHTML = '<div class="skeleton-line w-1/2"></div>';
  try {
    const r = await fetch('/monitoreo/ping?proveedor=' + encodeURIComponent(proveedor)).then((x) => x.json());
    caja.innerHTML = r.ok
      ? '<p class="text-xs text-green-700"><span class="font-semibold">Responde</span> &middot; ' + r.ms + ' ms &middot; contesto: "' + esc(r.respuesta) + '"</p>'
      : '<p class="text-xs text-red-600 break-words"><span class="font-semibold">No responde (' + esc(r.estado) + ')</span>: ' + esc(r.mensaje) + '</p>';
  } catch (e) {
    caja.innerHTML = '<p class="text-xs text-red-500">Error: ' + esc(e.message) + '</p>';
  } finally {
    btn.disabled = false;
    btn.textContent = textoOriginal;
  }
}

function tile(etiqueta, valor) {
  return '<div class="bg-stone-50 rounded-xl py-2">' +
    '<p class="text-sm font-bold text-stone-800">' + esc(valor) + '</p>' +
    '<p class="text-[10px] text-stone-400 uppercase tracking-wide">' + esc(etiqueta) + '</p>' +
  '</div>';
}

// --- Ping en vivo ---

document.getElementById('btnPing').addEventListener('click', async () => {
  const btn = document.getElementById('btnPing');
  const caja = document.getElementById('resultadoPing');
  btn.disabled = true;
  const textoOriginal = btn.textContent;
  btn.textContent = 'Probando...';
  caja.hidden = false;
  caja.innerHTML = '<div class="space-y-1.5"><div class="skeleton-line w-2/3"></div><div class="skeleton-line w-1/3"></div></div>';

  try {
    const r = await fetch('/monitoreo/ping').then((x) => x.json());
    caja.innerHTML = r.ok
      ? '<div class="rounded-2xl border border-green-200 bg-green-50 p-3">' +
          '<p class="text-sm font-semibold text-green-800">Responde correctamente</p>' +
          '<p class="text-xs text-green-800/80 mt-1">Modelo <span class="font-semibold">' + esc(r.modelo) + '</span> &middot; ' + r.ms + ' ms</p>' +
          '<p class="text-xs text-green-800/70 mt-1">Contesto: "' + esc(r.respuesta) + '"</p>' +
        '</div>'
      : '<div class="rounded-2xl border border-red-200 bg-red-50 p-3">' +
          '<p class="text-sm font-semibold text-red-700">No responde (' + esc(r.estado) + ')</p>' +
          '<p class="text-xs text-red-700/90 mt-1 break-words">' + esc(r.mensaje) + '</p>' +
          (String(r.estado) === '403' || r.estado === 'sin-llave'
            ? '<p class="text-xs text-red-700/70 mt-2">Pista: esto casi siempre es la API key vacia (el .env no cargo), no un permiso de Google.</p>'
            : '') +
        '</div>';
    cargarDatos();
  } catch (e) {
    caja.innerHTML = '<p class="text-xs text-red-500">Error: ' + esc(e.message) + '</p>';
  } finally {
    btn.disabled = false;
    btn.textContent = textoOriginal;
  }
});

// --- Modelos disponibles ---

document.getElementById('btnModelos').addEventListener('click', async () => {
  const btn = document.getElementById('btnModelos');
  const caja = document.getElementById('listaModelos');
  btn.disabled = true;
  caja.hidden = false;
  caja.innerHTML = '<div class="space-y-1.5"><div class="skeleton-line w-1/2"></div><div class="skeleton-line w-2/3"></div></div>';

  try {
    const r = await fetch('/monitoreo/modelos').then((x) => x.json());
    if (!r.ok) {
      caja.innerHTML = '<div class="rounded-2xl border border-red-200 bg-red-50 p-3">' +
        '<p class="text-xs text-red-700 break-words">' + esc(r.mensaje) + '</p></div>';
      return;
    }
    caja.innerHTML =
      '<div class="rounded-2xl border ' + (r.configuradoDisponible ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50') + ' p-3 mb-3">' +
        '<p class="text-sm font-semibold ' + (r.configuradoDisponible ? 'text-green-800' : 'text-red-700') + '">' +
          esc(r.configurado) + (r.configuradoDisponible ? ' esta disponible' : ' NO aparece en la lista') +
        '</p>' +
        (r.configuradoDisponible ? '' : '<p class="text-xs text-red-700/80 mt-1">Cambia GEMINI_MODEL en el .env por uno de los de abajo.</p>') +
      '</div>' +
      '<div class="flex flex-wrap gap-1.5">' +
        r.modelos.map((m) => '<span class="text-[11px] rounded-full border px-2 py-0.5 ' +
          (m === r.configurado ? 'bg-stone-900 text-white border-stone-900' : 'bg-stone-50 text-stone-600 border-stone-200') +
          '">' + esc(m) + '</span>').join('') +
      '</div>';
  } catch (e) {
    caja.innerHTML = '<p class="text-xs text-red-500">Error: ' + esc(e.message) + '</p>';
  } finally {
    btn.disabled = false;
  }
});

cargarDatos();
setInterval(cargarDatos, 15000); // refresco suave; no llama a los modelos, solo lee contadores

// --- Interruptor de mantenimiento ---
// Cierra la app para todo el mundo menos administradores. Vive aqui porque es una
// palanca de operacion, igual que el resto de este panel.

const btnMant = document.getElementById('btnMantenimiento');
const cajaMant = document.getElementById('estadoMantenimiento');
const inputMant = document.getElementById('mensajeMantenimiento');
let mantActivo = false;

function pintarMantenimiento(e) {
  if (!btnMant) return;
  mantActivo = Boolean(e.activo);

  btnMant.textContent = mantActivo ? 'Volver a abrir' : 'Cerrar el bot';
  btnMant.className = 'btn-tactile shrink-0 font-semibold rounded-full px-5 py-2 text-sm transition ' +
    (mantActivo
      ? 'bg-green-600 hover:bg-green-700 text-white'
      : 'bg-red-600 hover:bg-red-700 text-white');

  // Con MANTENIMIENTO=1 en el .env el boton no puede hacer nada: se deshabilita y se
  // explica, en vez de dejar que el usuario lo apriete y reciba un error.
  btnMant.disabled = Boolean(e.forzadoPorEntorno);
  if (e.forzadoPorEntorno) btnMant.className += ' opacity-50 cursor-not-allowed';

  if (inputMant) inputMant.value = mantActivo ? (e.mensaje || '') : '';

  const avisos = [];
  if (mantActivo) {
    avisos.push('<div class="rounded-2xl border border-red-200 bg-red-50 p-3">' +
      '<p class="text-sm font-semibold text-red-700">El bot esta CERRADO</p>' +
      '<p class="text-xs text-red-700/80 mt-1">La gente ve: "' + esc(e.mensaje) + '"</p>' +
      (e.desde ? '<p class="text-[11px] text-red-700/70 mt-1">Cerrado ' + esc(hace(e.desde)) +
        (e.activadoPor ? ' por ' + esc(e.activadoPor) : '') + '</p>' : '') +
      '</div>');
  }
  if (e.forzadoPorEntorno) {
    avisos.push('<p class="text-[11px] text-stone-500 mt-2">Forzado por la variable ' +
      'MANTENIMIENTO del .env: para poder apagarlo desde aqui, quitala y reinicia.</p>');
  }
  if (e.persistenciaOk === false) {
    avisos.push('<p class="text-[11px] text-amber-700 mt-2">Ojo: no se pudo guardar el estado ' +
      'en disco (' + esc(e.motivoSinPersistencia) + '), asi que un reinicio del servidor ' +
      'volveria a abrir el bot solo.</p>');
  }
  cajaMant.innerHTML = avisos.join('');
}

async function cargarMantenimiento() {
  if (!btnMant) return;
  try {
    const e = await fetch('/admin/mantenimiento').then((r) => r.json());
    if (e.ok) pintarMantenimiento(e);
    else document.getElementById('tarjetaMantenimiento').hidden = true; // no es admin
  } catch (err) {
    cajaMant.innerHTML = '<p class="text-xs text-red-500">No se pudo leer el estado: ' + esc(err.message) + '</p>';
  }
}

btnMant && btnMant.addEventListener('click', async () => {
  const cerrando = !mantActivo;
  // Cerrar el bot echa a todo el mundo, asi que se confirma. Reabrir no necesita aviso.
  if (cerrando && !window.confirm('Esto cerrara el bot para todos menos los administradores. ' +
      'Nadie podra capturar ni consultar hasta que lo vuelvas a abrir. Continuar?')) return;

  btnMant.disabled = true;
  const textoPrevio = btnMant.textContent;
  btnMant.textContent = 'Aplicando...';
  try {
    const r = await fetch('/admin/mantenimiento', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: cerrando, mensaje: inputMant ? inputMant.value : '' }),
    }).then((x) => x.json());
    if (r.ok) pintarMantenimiento(r);
    else {
      cajaMant.innerHTML = '<p class="text-xs text-red-600 break-words">' + esc(r.mensaje) + '</p>';
      btnMant.disabled = false;
      btnMant.textContent = textoPrevio;
    }
  } catch (err) {
    cajaMant.innerHTML = '<p class="text-xs text-red-500">Error: ' + esc(err.message) + '</p>';
    btnMant.disabled = false;
    btnMant.textContent = textoPrevio;
  }
});

cargarMantenimiento();


// --- Errores del servidor ---
//
// Se piden a /admin/errores, que exige rol admin. A quien no lo sea se le responde 403 y
// aqui se le explica, en vez de dejar la tarjeta en blanco sin motivo aparente.
const cajaResumenErrores = document.getElementById('resumenErrores');
const cajaListaErrores = document.getElementById('listaErrores');

function fechaHora(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-MX') + ' ' + d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function pintarUnError(e) {
  const ctx = e.contexto || {};
  const donde = ctx.metodo && ctx.ruta ? ctx.metodo + ' ' + ctx.ruta : e.origen;
  return '<details class="border border-stone-200 dark:border-stone-700 rounded-xl p-3">' +
    '<summary class="cursor-pointer text-sm text-stone-700 dark:text-stone-200">' +
      '<span class="text-xs text-stone-400">' + esc(fechaHora(e.ts)) + '</span> &middot; ' +
      '<span class="font-semibold">' + esc(donde) + '</span>' +
      (ctx.usuario ? ' <span class="text-xs text-stone-400">(' + esc(ctx.usuario) + ')</span>' : '') +
      '<br><span class="text-stone-600 dark:text-stone-300 break-words">' + esc(e.mensaje) + '</span>' +
    '</summary>' +
    (e.traza
      ? '<pre class="mt-2 text-[11px] text-stone-500 dark:text-stone-400 whitespace-pre-wrap break-words">' + esc(e.traza) + '</pre>'
      : '<p class="mt-2 text-xs text-stone-400">Sin traza.</p>') +
    '</details>';
}

async function cargarErrores() {
  cajaListaErrores.innerHTML = '<div class="skeleton-line w-2/3"></div>';
  try {
    const res = await fetch('/admin/errores');
    if (res.status === 403) {
      cajaResumenErrores.innerHTML = '';
      cajaListaErrores.innerHTML = '<p class="text-sm text-stone-400">Solo los administradores pueden ver los errores del servidor.</p>';
      return;
    }
    const data = await res.json();
    if (!data.ok) throw new Error(data.mensaje || 'No se pudo leer.');

    const r = data.resumen;
    const origenes = Object.entries(r.porOrigen || {}).map(([k, v]) => k + ': ' + v).join(' · ');
    cajaResumenErrores.innerHTML =
      '<div class="flex flex-wrap items-center gap-2">' +
        pastilla(r.ultimas24h + ' en 24 h', r.ultimas24h ? 'tibio' : 'ok') +
        pastilla(r.total + ' desde el arranque', 'gris') +
        (r.apagado ? pastilla('registro apagado', 'mal') : '') +
      '</div>' +
      (origenes ? '<p class="text-xs text-stone-400 mt-2">' + esc(origenes) + '</p>' : '') +
      '<p class="text-[11px] text-stone-400 mt-1">Archivos en ' + esc(r.carpeta) + '</p>';

    cajaListaErrores.innerHTML = data.errores.length
      ? data.errores.map(pintarUnError).join('')
      : '<p class="text-sm text-stone-400">Sin errores registrados. Buena señal.</p>';
  } catch (err) {
    cajaListaErrores.innerHTML = '<p class="text-sm text-red-600">No se pudo leer: ' + esc(err.message) + '</p>';
  }
}

document.getElementById('btnErrores').addEventListener('click', cargarErrores);
cargarErrores();


// --- Flujo del servidor ---
//
// Grafica de una sola serie y un solo tono: no hay categorias que distinguir, solo cuantas
// peticiones hubo en cada minuto. El valor se escribe unicamente sobre la barra mas alta;
// el resto se consulta pasando el cursor.
const cajaResumenTrafico = document.getElementById('resumenTrafico');
const cajaGraficaTrafico = document.getElementById('graficaTrafico');
const cajaRutasTrafico = document.getElementById('rutasTrafico');

function barrasPorMinuto(puntos) {
  if (!puntos.length) return '<p class="text-sm text-stone-400">Sin peticiones registradas todavia.</p>';
  const maximo = Math.max(...puntos.map((p) => p.n), 1);
  const indiceMax = puntos.findIndex((p) => p.n === maximo);
  const barras = puntos.map((p, i) => {
    const alto = p.n === 0 ? 0 : Math.max(4, Math.round((p.n / maximo) * 100));
    const hora = p.minuto.slice(11).replace('T', '');
    const etiqueta = i === indiceMax
      ? '<span class="absolute -top-4 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-stone-500 dark:text-stone-400">' + p.n + '</span>'
      : '';
    return '<div class="flex-1 min-w-0 flex flex-col items-center justify-end gap-1 group" title="' + esc(hora) + ' — ' + p.n + (p.n === 1 ? ' peticion' : ' peticiones') + '">' +
      '<div class="relative w-full flex items-end justify-center h-20">' + etiqueta +
        '<div class="w-full rounded-t bg-green-600 group-hover:bg-green-700 dark:bg-green-500 dark:group-hover:bg-green-400 transition-colors" style="height:' + alto + '%"></div>' +
      '</div>' +
      '<span class="text-[10px] text-stone-400 whitespace-nowrap">' + esc(hora) + '</span>' +
    '</div>';
  }).join('');
  return '<p class="text-xs text-stone-400 mb-3">Peticiones por minuto, ultimos ' + puntos.length + '</p>' +
    '<div class="flex items-end gap-[2px] border-b border-stone-200 dark:border-stone-700">' + barras + '</div>';
}

async function cargarTrafico() {
  cajaResumenTrafico.innerHTML = '<div class="skeleton-line w-1/2"></div>';
  try {
    const data = await fetch('/monitoreo/trafico').then((r) => r.json());
    if (!data.ok) throw new Error('No se pudo leer.');
    const e = data.entrante;

    const malas = (e.porEstado['4xx'] || 0) + (e.porEstado['5xx'] || 0);
    cajaResumenTrafico.innerHTML =
      '<div class="flex flex-wrap items-center gap-2">' +
        pastilla(e.total + ' peticiones', 'gris') +
        pastilla(e.ultimaHora + ' en la ultima hora', 'gris') +
        pastilla(e.enVuelo + ' en curso', e.enVuelo > 5 ? 'tibio' : 'ok') +
        pastilla(malas + ' con error', malas ? 'tibio' : 'ok') +
        pastilla('encendido ' + duracion(e.segundosEncendido), 'gris') +
      '</div>' +
      '<p class="text-xs text-stone-400 mt-2">Por resultado: ' +
        esc(Object.entries(e.porEstado).map(([k, v]) => k + ' ' + v).join(' · ') || 'sin datos') +
      ' · pico de ' + e.maxEnVuelo + ' a la vez</p>';

    cajaGraficaTrafico.innerHTML = barrasPorMinuto(e.ultimos10);

    const filas = e.rutas.map((r) =>
      '<tr class="border-t border-stone-100 dark:border-stone-800">' +
        '<td class="py-1.5 pr-4 text-stone-700 dark:text-stone-200">' + esc(r.ruta) + '</td>' +
        '<td class="py-1.5 pr-4 text-right text-stone-600 dark:text-stone-300">' + r.n + '</td>' +
        '<td class="py-1.5 pr-4 text-right ' + (r.errores ? 'text-amber-700 dark:text-amber-500 font-semibold' : 'text-stone-400') + '">' + r.errores + '</td>' +
        '<td class="py-1.5 text-right text-stone-500 dark:text-stone-400">' + r.promedioMs + ' ms</td>' +
      '</tr>').join('');
    cajaRutasTrafico.innerHTML = e.rutas.length
      ? '<div class="overflow-x-auto"><table class="w-full text-sm">' +
          '<thead><tr class="text-left text-xs text-stone-400">' +
            '<th class="pb-2 pr-4 font-medium">Ruta</th>' +
            '<th class="pb-2 pr-4 font-medium text-right">Veces</th>' +
            '<th class="pb-2 pr-4 font-medium text-right">Con error</th>' +
            '<th class="pb-2 font-medium text-right">Promedio</th>' +
          '</tr></thead><tbody>' + filas + '</tbody></table></div>'
      : '';
  } catch (err) {
    cajaResumenTrafico.innerHTML = '<p class="text-sm text-red-600">No se pudo leer el flujo: ' + esc(err.message) + '</p>';
  }
}

document.getElementById('btnTrafico').addEventListener('click', cargarTrafico);
cargarTrafico();
