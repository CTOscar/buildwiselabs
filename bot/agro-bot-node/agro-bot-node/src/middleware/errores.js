// Las tres redes que atrapan un error antes de que se pierda (ver services/errores.js).
//
// Se usan las tres porque cada una cubre un hueco de las otras:
//   - La consola atrapa todo lo que el codigo ya reportaba con console.error, sin tener
//     que ir archivo por archivo a cambiarlo.
//   - El middleware de Express atrapa lo que truena a mitad de una peticion y nadie
//     atrapo antes.
//   - Las del proceso atrapan lo que pasa fuera de cualquier peticion: un cron de
//     madrugada, una promesa sin .catch().
const errores = require('../services/errores');

// console.error sigue imprimiendo igual que siempre; solo se le agrega el registro. Se
// envuelve en try/catch porque un fallo registrando JAMAS debe romper un console.error.
function capturarConsola() {
  const original = console.error;
  console.error = function (...args) {
    original.apply(console, args);
    try {
      const primero = args.find((a) => a instanceof Error);
      const texto = args.map((a) => (a instanceof Error ? a.message : String(a))).join(' ');
      errores.registrar(primero || texto, { origen: 'consola' });
    } catch (e) { /* ni modo */ }
  };
}

function capturarProceso() {
  // Una promesa sin .catch(). Antes de Node 15 solo imprimia un aviso; hoy tumba el
  // proceso si no hay quien la atienda, asi que vale la pena dejarla registrada.
  process.on('unhandledRejection', (razon) => {
    errores.registrar(razon, { origen: 'promesa-sin-atender' });
  });

  // Una excepcion que nadie atrapo. A proposito NO se mata el proceso: en este bot es
  // preferible que siga de pie aunque algo haya fallado, a que se caiga entero y el
  // equipo se quede sin poder capturar. Queda registrada para poder revisarla.
  process.on('uncaughtException', (error) => {
    errores.registrar(error, { origen: 'excepcion-sin-atrapar' });
  });
}

// Middleware de error de Express: tiene que llevar los CUATRO parametros (incluido "next"
// aunque no se use), porque es por la cantidad de argumentos como Express distingue un
// manejador de errores de uno normal. Va montado al final de todo, despues de las rutas.
function middlewareErrores(err, req, res, next) {
  errores.registrar(err, {
    origen: 'peticion',
    contexto: {
      metodo: req.method,
      ruta: req.originalUrl ? req.originalUrl.split('?')[0] : req.path,
      usuario: (req.session && (req.session.usuario || null)) || null,
    },
  });

  if (res.headersSent) return next(err);

  // A las llamadas del frontend se les contesta JSON; a una pagina, texto. El detalle del
  // error NO se manda al navegador -- va al registro, que es donde debe mirarse.
  const esApi = (req.get('accept') || '').includes('application/json') ||
    req.path.startsWith('/bot-web-') || req.path.startsWith('/admin/');
  res.status(500);
  if (esApi) {
    return res.json({ ok: false, mensaje: 'Ocurrio un error en el servidor. Quedo registrado.' });
  }
  return res.send('Ocurrio un error en el servidor. Quedo registrado.');
}

module.exports = { capturarConsola, capturarProceso, middlewareErrores };
