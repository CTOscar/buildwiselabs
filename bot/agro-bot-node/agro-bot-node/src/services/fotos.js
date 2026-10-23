// Fotos de perfil, una por persona.
//
// Antes habia UNA sola foto compartida (src/public/img/perfil.jpg): quien la subia se la
// pisaba a todos los demas. Con cuentas individuales eso dejo de tener sentido.
//
// Donde se guardan: en una carpeta de estado, NO dentro de src/public. Dos razones:
//   1) En Hostinger la carpeta del codigo se reemplaza en cada despliegue; si las fotos
//      vivieran ahi, se borrarian en cada subida de zip. Con FOTOS_DIR apuntando a una
//      carpeta persistente, sobreviven.
//   2) Sirviendolas por una ruta en vez de como archivo estatico se puede exigir sesion y
//      mandar la cabecera de cache correcta (la direccion no cambia cuando cambia la foto,
//      asi que sin esa cabecera el navegador seguiria mostrando la vieja).
const fs = require('fs');
const path = require('path');

const DIR = process.env.FOTOS_DIR || path.join(__dirname, '..', '..', 'estado', 'fotos');

// La foto compartida de siempre, que se sigue usando como respaldo en el modo de acceso
// unico (cuando no hay base de datos y por tanto no hay "cada quien").
const LEGADO = path.join(__dirname, '..', 'public', 'img', 'perfil.jpg');

const MAX_BYTES = 2 * 1024 * 1024;

// A quien pertenece la foto. Con cuentas individuales es el id del usuario; en el modo
// compartido (sin base de datos) hay un solo acceso, asi que una sola foto.
//
// Se usa el ID y no el nombre de usuario a proposito: el nombre podria llevar caracteres
// que no sirven en un nombre de archivo, y ademas podria cambiar.
function claveDeSesion(sesion) {
  if (sesion && sesion.usuarioId) return 'u' + Number(sesion.usuarioId);
  return 'compartido';
}

function rutaDeFoto(clave) {
  // La clave siempre sale de claveDeSesion (un numero o la palabra fija), nunca del
  // navegador, pero se valida igual: si algun dia se expone por parametro, esto evita que
  // alguien se pasee por el disco con "../".
  if (!/^(u\d+|compartido)$/.test(clave)) throw new Error('Clave de foto invalida.');
  return path.join(DIR, clave + '.jpg');
}

function guardar(clave, buffer) {
  if (!buffer || !buffer.length) throw new Error('La foto llego vacia.');
  if (buffer.length > MAX_BYTES) throw new Error('La foto pesa demasiado.');
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(rutaDeFoto(clave), buffer);
}

// Devuelve la ruta del archivo a servir, o null si esa persona no tiene foto todavia.
function rutaParaServir(clave) {
  const propia = rutaDeFoto(clave);
  if (fs.existsSync(propia)) return propia;
  // Solo en el modo compartido se cae al archivo de siempre: asi un bot sin base de datos
  // conserva la foto que ya tenia. Con cuentas individuales no hay respaldo -- cada quien
  // sube la suya, que es justo el punto.
  if (clave === 'compartido' && fs.existsSync(LEGADO)) return LEGADO;
  return null;
}

function borrar(clave) {
  const p = rutaDeFoto(clave);
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

module.exports = { claveDeSesion, guardar, rutaParaServir, borrar, DIR, MAX_BYTES };
