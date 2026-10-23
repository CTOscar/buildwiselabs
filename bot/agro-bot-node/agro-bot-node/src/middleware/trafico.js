// Medidor de trafico ENTRANTE: cuantas peticiones llegan, a que rutas, con que resultado y
// cuanto tardan. Vive en memoria y se reinicia con el servidor, igual que services/metricas.js
// (que mide el trafico SALIENTE hacia los modelos de IA). Entre los dos dan la foto del flujo.
//
// Se quedo deliberadamente simple -- contadores, no una serie de tiempo. Para "¿esta pasando
// algo raro ahora mismo?" basta, y no cuesta ni memoria ni dependencias nuevas.
const MAX_RUTAS = 40;
const MAX_LENTAS = 10;

const arrancoEn = Date.now();
let total = 0;
let enVuelo = 0;
let maxEnVuelo = 0;
const porEstado = {};   // "2xx", "3xx", "4xx", "5xx"
const porRuta = {};     // ruta -> { n, ms, errores }
const lentas = [];      // las MAX_LENTAS peticiones mas tardadas
const porMinuto = {};   // "AAAA-MM-DDTHH:MM" -> n   (se conservan los ultimos 60)

// Las rutas se agrupan para que un identificador en la direccion no genere miles de
// entradas distintas: /admin/usuarios/7/password cuenta igual que /admin/usuarios/9/password.
function agruparRuta(metodo, ruta) {
  const limpia = String(ruta || '/').split('?')[0]
    .replace(/\/\d+(?=\/|$)/g, '/:id')
    .replace(/\/[0-9a-f]{8,}(?=\/|$)/gi, '/:hash');
  return metodo + ' ' + limpia;
}

function minutoDe(fecha) {
  return fecha.toISOString().slice(0, 16);
}

function recordarMinuto(fecha) {
  const k = minutoDe(fecha);
  porMinuto[k] = (porMinuto[k] || 0) + 1;
  const claves = Object.keys(porMinuto).sort();
  while (claves.length > 60) delete porMinuto[claves.shift()];
}

function medirTrafico(req, res, next) {
  // Los archivos estaticos se ignoran: son cientos por visita y ahogarian el conteo de lo
  // que de verdad interesa, que son las llamadas al bot.
  if (/^\/(css|js|img|favicon\.ico)/.test(req.path)) return next();

  const inicio = process.hrtime.bigint();
  total++;
  enVuelo++;
  if (enVuelo > maxEnVuelo) maxEnVuelo = enVuelo;
  recordarMinuto(new Date());

  res.on('finish', () => {
    enVuelo--;
    const ms = Number(process.hrtime.bigint() - inicio) / 1e6;
    const clase = Math.floor(res.statusCode / 100) + 'xx';
    porEstado[clase] = (porEstado[clase] || 0) + 1;

    const clave = agruparRuta(req.method, req.originalUrl || req.path);
    if (!porRuta[clave]) {
      // Tope de rutas distintas: sin esto, un escaneo de direcciones inventadas haria
      // crecer este objeto sin limite.
      if (Object.keys(porRuta).length >= MAX_RUTAS) return;
      porRuta[clave] = { n: 0, ms: 0, errores: 0 };
    }
    const r = porRuta[clave];
    r.n++;
    r.ms += ms;
    if (res.statusCode >= 400) r.errores++;

    lentas.push({ ruta: clave, ms: Math.round(ms), estado: res.statusCode, ts: new Date().toISOString() });
    lentas.sort((a, b) => b.ms - a.ms);
    if (lentas.length > MAX_LENTAS) lentas.length = MAX_LENTAS;
  });

  next();
}

function resumen() {
  const rutas = Object.entries(porRuta)
    .map(([ruta, r]) => ({
      ruta,
      n: r.n,
      errores: r.errores,
      promedioMs: Math.round(r.ms / r.n),
    }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 12);

  const minutos = Object.keys(porMinuto).sort();
  const ultimos10 = minutos.slice(-10).map((m) => ({ minuto: m, n: porMinuto[m] }));
  const ultimaHora = minutos.reduce((s, m) => s + porMinuto[m], 0);

  return {
    desde: new Date(arrancoEn).toISOString(),
    segundosEncendido: Math.round((Date.now() - arrancoEn) / 1000),
    total,
    enVuelo,
    maxEnVuelo,
    ultimaHora,
    porEstado,
    rutas,
    lentas,
    ultimos10,
  };
}

module.exports = { medirTrafico, resumen };
