// Registro de errores del servidor.
//
// Por que existe: hasta ahora, cuando algo fallaba en produccion, la unica forma de ver el
// motivo era lanzarle una peticion a mano con curl y leer la respuesta. Los errores que no
// llegan a una respuesta -- un cron que truena de madrugada, una promesa sin atender --
// simplemente se perdian. Esto los guarda todos, con su hora, y los deja mirables desde la
// pantalla de monitoreo.
//
// Se guarda en dos lados, igual que la bitacora:
//   1) En memoria, los ultimos MAX_EN_MEMORIA, que es lo que pinta la pantalla al instante.
//   2) En un archivo por mes (estado/errores/AAAA-MM.jsonl), para que sobrevivan al
//      reinicio. OJO en Hostinger: la carpeta del codigo se reemplaza en cada despliegue,
//      asi que conviene ERRORES_DIR=/ruta/persistente/errores.
//
// Nada de aqui puede tumbar nada: si falla el guardado se avisa una vez y se sigue.
const fs = require('fs');
const path = require('path');

const DIR = process.env.ERRORES_DIR || path.join(__dirname, '..', '..', 'estado', 'errores');
const APAGADO = ['0', 'false', 'no'].includes(
  String(process.env.REGISTRO_ERRORES || '').trim().toLowerCase()
);

const MAX_EN_MEMORIA = 100;
const MAX_TRAZA = 4000;

const recientes = [];
let totalDesdeElArranque = 0;
let avisoEscrituraDado = false;

// Datos que NUNCA deben acabar en un archivo de errores ni en una pantalla. El mensaje de
// un error puede traer la cadena de conexion completa (Prisma la incluye tal cual en varios
// de sus errores), y ahi viaja la contraseña de la base.
function taparSecretos(texto) {
  return String(texto || '')
    // usuario:contraseña@host  ->  usuario:****@host
    .replace(/(\/\/[^:/@\s]+):[^@\s]+@/g, '$1:****@')
    // llaves que se reconocen por su prefijo
    .replace(/\b(sk-ant-[A-Za-z0-9_-]{6})[A-Za-z0-9_-]+/g, '$1****')
    .replace(/\bAIza[A-Za-z0-9_-]{6}[A-Za-z0-9_-]+/g, 'AIza****')
    .replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
      '-----BEGIN PRIVATE KEY----- (oculta) -----END PRIVATE KEY-----');
}

function nombreArchivoDelMes(fecha) {
  return path.join(DIR, `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, '0')}.jsonl`);
}

function escribirEnArchivo(entrada) {
  try {
    fs.mkdirSync(DIR, { recursive: true });
    fs.appendFileSync(nombreArchivoDelMes(new Date(entrada.ts)), JSON.stringify(entrada) + '\n');
    avisoEscrituraDado = false;
  } catch (e) {
    if (!avisoEscrituraDado) {
      // Con console.warn, no console.error: si no, se llamaria a si mismo (ver capturar()).
      console.warn('[errores] No se pudo escribir el registro:', e.message);
      avisoEscrituraDado = true;
    }
  }
}

// El punto de entrada. "origen" dice de donde vino (ruta, consola, proceso, cron...) y
// "contexto" es lo que ayude a reproducirlo: metodo y ruta HTTP, usuario, etc.
function registrar(error, { origen = 'desconocido', contexto = {} } = {}) {
  if (APAGADO) return;
  const esError = error instanceof Error;
  const entrada = {
    ts: new Date().toISOString(),
    origen,
    mensaje: taparSecretos(esError ? error.message : String(error)).slice(0, 2000),
    tipo: esError ? error.name : typeof error,
    codigo: (esError && (error.code || error.status)) || null,
    traza: esError && error.stack ? taparSecretos(error.stack).slice(0, MAX_TRAZA) : null,
    contexto,
  };
  totalDesdeElArranque++;
  recientes.unshift(entrada);
  if (recientes.length > MAX_EN_MEMORIA) recientes.length = MAX_EN_MEMORIA;
  escribirEnArchivo(entrada);
}

function resumen() {
  const hace24h = Date.now() - 24 * 3600 * 1000;
  const ultimas24h = recientes.filter((e) => Date.parse(e.ts) >= hace24h);
  const porOrigen = {};
  ultimas24h.forEach((e) => { porOrigen[e.origen] = (porOrigen[e.origen] || 0) + 1; });
  return {
    total: totalDesdeElArranque,
    enMemoria: recientes.length,
    ultimas24h: ultimas24h.length,
    porOrigen,
    ultimo: recientes[0] ? recientes[0].ts : null,
    carpeta: DIR,
    apagado: APAGADO,
  };
}

function ultimos(limite = 30) {
  return recientes.slice(0, Math.max(1, Math.min(limite, MAX_EN_MEMORIA)));
}

module.exports = { registrar, resumen, ultimos, taparSecretos, DIR };
