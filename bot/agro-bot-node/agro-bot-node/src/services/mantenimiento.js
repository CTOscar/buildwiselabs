// Modo mantenimiento: "apaga" la app para todo el mundo menos para los administradores,
// hasta que un administrador la vuelva a encender. Sirve para capturar sin que nadie
// escriba encima, para cortar el acceso si algo sale mal, o simplemente para cerrar el
// bot fuera de horario.
//
// Como se guarda el estado (en este orden):
//
//   1) Variable de entorno MANTENIMIENTO=1 -> queda FORZADO en mantenimiento y no se
//      puede apagar desde la pantalla. Es el freno de mano: util cuando quieres que ni
//      un administrador pueda reactivarlo por error, y solo se quita editando el .env
//      y reiniciando.
//   2) Un archivo de estado en disco -> es el que mueve el boton de la pantalla.
//      Sobrevive reinicios del servidor, que es justo lo que se necesita: si el proceso
//      se cae a media noche, la app NO debe volver sola a estar abierta.
//   3) Si el disco es de solo lectura (pasa en algunos hostings) se queda en memoria y
//      se avisa, porque entonces un reinicio SI lo perderia.
const fs = require('fs');
const path = require('path');

// Por defecto junto al proyecto. En un hosting donde la carpeta del codigo se reemplaza
// en cada despliegue conviene apuntarlo a una carpeta que persista, con
// MANTENIMIENTO_ARCHIVO=/ruta/persistente/mantenimiento.json
const ARCHIVO = process.env.MANTENIMIENTO_ARCHIVO ||
  path.join(__dirname, '..', '..', 'estado', 'mantenimiento.json');

const FORZADO_POR_ENTORNO = ['1', 'true', 'si', 'yes'].includes(
  String(process.env.MANTENIMIENTO || '').trim().toLowerCase()
);

const MENSAJE_POR_DEFECTO = 'Estamos haciendo ajustes. El bot vuelve en un momento.';

let estado = {
  activo: false,
  mensaje: MENSAJE_POR_DEFECTO,
  desde: null,
  activadoPor: null,
};
let persistenciaOk = true;
let motivoSinPersistencia = null;

function leerDeDisco() {
  try {
    if (!fs.existsSync(ARCHIVO)) return;
    const datos = JSON.parse(fs.readFileSync(ARCHIVO, 'utf8'));
    estado = {
      activo: Boolean(datos.activo),
      mensaje: datos.mensaje || MENSAJE_POR_DEFECTO,
      desde: datos.desde || null,
      activadoPor: datos.activadoPor || null,
    };
  } catch (e) {
    console.warn('[mantenimiento] No se pudo leer el estado guardado:', e.message);
  }
}

function escribirEnDisco() {
  try {
    fs.mkdirSync(path.dirname(ARCHIVO), { recursive: true });
    fs.writeFileSync(ARCHIVO, JSON.stringify(estado, null, 2));
    persistenciaOk = true;
    motivoSinPersistencia = null;
  } catch (e) {
    // No se avienta el error: que no se pueda GUARDAR el estado no debe impedir
    // ACTIVAR el mantenimiento -- lo urgente es cerrar la puerta. Solo se avisa que
    // no sobrevivira a un reinicio.
    persistenciaOk = false;
    motivoSinPersistencia = e.message;
    console.warn('[mantenimiento] No se pudo guardar el estado en disco:', e.message);
  }
}

leerDeDisco();

function estaActivo() {
  return FORZADO_POR_ENTORNO || estado.activo;
}

function obtenerEstado() {
  return {
    activo: estaActivo(),
    mensaje: estado.mensaje || MENSAJE_POR_DEFECTO,
    desde: estado.desde,
    activadoPor: estado.activadoPor,
    // Para que la pantalla pueda explicar por que el boton esta bloqueado.
    forzadoPorEntorno: FORZADO_POR_ENTORNO,
    persistenciaOk,
    motivoSinPersistencia,
    archivo: ARCHIVO,
  };
}

function activar({ mensaje, porQuien } = {}) {
  estado = {
    activo: true,
    mensaje: (mensaje && String(mensaje).trim().slice(0, 300)) || MENSAJE_POR_DEFECTO,
    desde: new Date().toISOString(),
    activadoPor: porQuien || null,
  };
  escribirEnDisco();
  return obtenerEstado();
}

function desactivar() {
  estado = { activo: false, mensaje: MENSAJE_POR_DEFECTO, desde: null, activadoPor: null };
  escribirEnDisco();
  return obtenerEstado();
}

module.exports = { estaActivo, obtenerEstado, activar, desactivar, FORZADO_POR_ENTORNO };
