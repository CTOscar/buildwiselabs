const express = require('express');
const path = require('path');
const axios = require('axios');
const config = require('../config');
const metricas = require('../services/metricas');
const errores = require('../services/errores');
const { requerirAdmin } = require('../middleware/auth');
const trafico = require('../middleware/trafico');

const router = express.Router();

// Panel de monitoreo de los modelos de IA. Nace de un problema real: cuando Gemini
// contesto 403 "unregistered callers", no habia forma de ver desde afuera QUE modelo
// estaba configurado, si la API key habia cargado, ni cuantas llamadas venian fallando
// -- habia que entrar por SSH a leer el .env y los logs. Esto lo deja a la vista.

// GET /monitoreo -> la pagina
router.get('/monitoreo', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'monitoreo.html'));
});

// Nunca se devuelve una API key completa. Solo lo suficiente para distinguir "esta
// cargada" de "esta vacia" y para notar si quedo pegada una llave equivocada.
function pistaDeLlave(llave) {
  if (!llave || String(llave).trim() === '') return { presente: false, pista: null, longitud: 0 };
  const s = String(llave);
  return {
    presente: true,
    pista: s.slice(0, 4) + '...' + s.slice(-4),
    longitud: s.length,
  };
}

// GET /monitoreo/datos -> configuracion + contadores acumulados desde que arranco el server
router.get('/monitoreo/datos', (req, res) => {
  const proveedorActivo = config.textAiProvider === 'claude' ? 'claude' : 'gemini';
  res.json({
    ok: true,
    proveedorTexto: proveedorActivo,
    // El audio SIEMPRE va por Gemini aunque el texto use Claude (ver lib/clasificar.js)
    proveedorAudio: 'gemini',
    configurados: [
      {
        proveedor: 'gemini',
        modelo: config.gemini.model,
        activo: proveedorActivo === 'gemini',
        usoAudio: true,
        llave: pistaDeLlave(config.gemini.apiKey),
      },
      {
        proveedor: 'claude',
        modelo: config.claude.model,
        activo: proveedorActivo === 'claude',
        usoAudio: false,
        llave: pistaDeLlave(config.claude.apiKey),
      },
    ],
    ...metricas.resumen(),
  });
});

// GET /monitoreo/ping?proveedor=gemini|claude -> llamada real y minima al modelo, para
// saber AHORA MISMO si responde. Se dispara a mano (no automatica) porque consume cuota.
// Acepta proveedor porque desde que se puede elegir modelo en el compositor, "¿responde?"
// es una pregunta por proveedor, no una sola.
router.get('/monitoreo/ping', async (req, res) => {
  const proveedor = req.query.proveedor === 'claude' ? 'claude' : 'gemini';
  const t0 = Date.now();

  if (proveedor === 'claude') {
    const modelo = config.claude.model;
    if (!config.claude.apiKey) {
      return res.json({
        ok: false, ms: 0, proveedor, modelo, estado: 'sin-llave',
        mensaje: 'ANTHROPIC_API_KEY esta vacia en el servidor.',
      });
    }
    try {
      // Se usa el SDK ya instalado, igual que services/claude.js -- asi esta prueba
      // recorre el MISMO camino que una peticion de verdad.
      const Anthropic = require('@anthropic-ai/sdk');
      const cliente = new Anthropic({ apiKey: config.claude.apiKey });
      const r = await cliente.messages.create({
        model: modelo,
        max_tokens: 16,
        messages: [{ role: 'user', content: 'responde solo: ok' }],
      });
      const texto = (r.content || []).map((b) => b.text || '').join('').trim() || '(respuesta vacia)';
      return res.json({ ok: true, ms: Date.now() - t0, proveedor, modelo, respuesta: texto.slice(0, 80) });
    } catch (e) {
      return res.json({
        ok: false,
        ms: Date.now() - t0,
        proveedor,
        modelo,
        estado: e.status || 'sin-respuesta',
        mensaje: e.error?.error?.message || e.message,
      });
    }
  }

  const modelo = config.gemini.model;
  try {
    if (!config.gemini.apiKey) {
      return res.json({
        ok: false, ms: 0, proveedor, modelo, estado: 'sin-llave',
        mensaje: 'GEMINI_API_KEY esta vacia: el servidor mandaria el header sin credencial (403).',
      });
    }
    const { data } = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`,
      { contents: [{ parts: [{ text: 'responde solo: ok' }] }] },
      { headers: { 'Content-Type': 'application/json', 'x-goog-api-key': config.gemini.apiKey }, timeout: 20000 }
    );
    const texto = data?.candidates?.[0]?.content?.parts?.[0]?.text || '(respuesta vacia)';
    res.json({ ok: true, ms: Date.now() - t0, proveedor, modelo, respuesta: texto.trim().slice(0, 80) });
  } catch (e) {
    res.json({
      ok: false,
      ms: Date.now() - t0,
      proveedor,
      modelo,
      estado: e.response?.status || 'sin-respuesta',
      mensaje: e.response?.data?.error?.message || e.message,
    });
  }
});

// GET /monitoreo/modelos -> que modelos acepta la llave actual. Sirve para cachar a
// tiempo un GEMINI_MODEL mal escrito o un modelo que Google ya retiro.
router.get('/monitoreo/modelos', async (req, res) => {
  try {
    if (!config.gemini.apiKey) {
      return res.json({ ok: false, mensaje: 'GEMINI_API_KEY esta vacia.' });
    }
    const { data } = await axios.get('https://generativelanguage.googleapis.com/v1beta/models', {
      headers: { 'x-goog-api-key': config.gemini.apiKey },
      timeout: 20000,
    });
    const modelos = (data.models || [])
      .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
      .map((m) => String(m.name || '').replace(/^models\//, ''));
    res.json({
      ok: true,
      modelos,
      configurado: config.gemini.model,
      // La comprobacion que importa: ¿el modelo del .env esta en la lista?
      configuradoDisponible: modelos.includes(config.gemini.model),
    });
  } catch (e) {
    res.json({
      ok: false,
      estado: e.response?.status || 'sin-respuesta',
      mensaje: e.response?.data?.error?.message || e.message,
    });
  }
});

// GET /modelos-para-elegir -> lo que se ofrece en el selector del compositor.
// Se cachea unos minutos: el selector se carga en cada visita a la pagina y no tiene
// sentido pegarle a la API de Google cada vez para una lista que casi nunca cambia.
let cacheModelos = { ts: 0, datos: null };
const CACHE_MS = 5 * 60 * 1000;

// Los modelos de la API de Gemini incluyen muchos que NO sirven para extraer campos de
// texto (imagen, audio, musica, robotica, investigacion...). Se filtran por nombre: no es
// perfecto, pero es lo unico que expone la API, y el modelo del .env siempre se incluye
// aunque el filtro lo descarte.
const NO_SIRVEN = /image|banana|tts|transcribe|robotics|lyria|computer-use|deep-research|embedding|veo|imagen|antigravity|customtools/i;

// La API de Google regresa la lista PAGINADA (50 por pagina, con nextPageToken): antes
// solo se leia la primera pagina y los modelos de las siguientes (ej. Gemma) nunca salian
// en el selector. Aqui se recorren todas.
async function listarModelosGemini() {
  const todos = [];
  let pageToken;
  let vueltas = 0;
  do {
    const { data } = await axios.get('https://generativelanguage.googleapis.com/v1beta/models', {
      headers: { 'x-goog-api-key': config.gemini.apiKey },
      params: { pageSize: 1000, pageToken },
      timeout: 15000,
    });
    todos.push(...(data.models || []));
    pageToken = data.nextPageToken;
    vueltas++;
  } while (pageToken && vueltas < 10);
  return todos
    .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
    .map((m) => String(m.name || '').replace(/^models\//, ''))
    // gemini-* y gemma-* (modelos de texto abiertos de Google, tambien sirven para extraer campos)
    .filter((n) => /^(gemini|gemma)-/.test(n) && !NO_SIRVEN.test(n));
}

router.get('/modelos-para-elegir', async (req, res) => {
  const ahora = Date.now();
  if (cacheModelos.datos && ahora - cacheModelos.ts < CACHE_MS) {
    return res.json({ ...cacheModelos.datos, deCache: true });
  }

  const opciones = [];
  // Si alguna de las dos listas falla, NO se guarda en cache: si no, un tropiezo pasajero
  // de Google/Anthropic dejaba el selector con un solo modelo durante 5 minutos.
  let listaIncompleta = false;

  // Gemini: el del .env primero (es el que manda si no se elige nada), luego el resto.
  if (config.gemini.apiKey) {
    opciones.push({ proveedor: 'gemini', modelo: config.gemini.model, predeterminado: true });
    try {
      (await listarModelosGemini())
        .filter((n) => n !== config.gemini.model)
        .forEach((n) => opciones.push({ proveedor: 'gemini', modelo: n, predeterminado: false }));
    } catch (e) {
      // Si Google no contesta, al menos queda el modelo del .env en la lista.
      listaIncompleta = true;
      console.error('No se pudo listar modelos de Gemini:', e.response?.data?.error?.message || e.message);
    }
  }

  // Claude: solo si hay llave, si no seria ofrecer algo que va a fallar. Igual que con
  // Gemini, se lista lo que la cuenta realmente tiene disponible (no solo el del .env),
  // para poder comparar Haiku/Sonnet/Opus desde el selector sin tocar configuracion.
  if (config.claude.apiKey) {
    opciones.push({ proveedor: 'claude', modelo: config.claude.model, predeterminado: false });
    try {
      const Anthropic = require('@anthropic-ai/sdk');
      const cliente = new Anthropic({ apiKey: config.claude.apiKey });
      // El SDK pagina solo con "for await" (antes se leia solo la primera pagina).
      for await (const m of cliente.models.list({ limit: 100 })) {
        if (m.id && m.id !== config.claude.model) {
          opciones.push({ proveedor: 'claude', modelo: m.id, predeterminado: false });
        }
      }
    } catch (e) {
      // Si Anthropic no contesta, al menos queda el modelo del .env (igual que con Gemini).
      listaIncompleta = true;
      console.error('No se pudo listar modelos de Claude:', e.error?.error?.message || e.message);
    }
  }

  const datos = {
    ok: true,
    opciones,
    // El compositor lo usa para avisar que el audio no respeta la eleccion.
    notaAudio: 'El audio siempre se procesa con Gemini (Claude no acepta audio).',
    claudeDisponible: Boolean(config.claude.apiKey),
    listaIncompleta,
  };
  if (!listaIncompleta) cacheModelos = { ts: ahora, datos };
  res.json(datos);
});

// GET /admin/errores -> los ultimos errores del servidor, para verlos sin tener que
// entrar a los registros del hosting ni lanzar peticiones a mano con curl.
//
// Solo administradores: una traza de error puede revelar rutas internas, nombres de tablas
// y partes de la configuracion. El servicio ya tapa contraseñas y llaves antes de guardar
// (ver taparSecretos en services/errores.js), pero esto es la segunda cerradura.
router.get('/admin/errores', requerirAdmin, (req, res) => {
  const limite = Number(req.query.limite) || 30;
  res.json({ ok: true, resumen: errores.resumen(), errores: errores.ultimos(limite) });
});

// GET /monitoreo/trafico -> flujo entrante (peticiones) y saliente (llamadas a la IA).
// Sin requerirAdmin: no expone datos de nadie, solo rutas y contadores, y es util que
// cualquiera del equipo pueda ver si el bot esta saturado. Igual queda tras requerirSesion.
router.get('/monitoreo/trafico', (req, res) => {
  res.json({ ok: true, entrante: trafico.resumen(), saliente: metricas.resumen() });
});

module.exports = router;
