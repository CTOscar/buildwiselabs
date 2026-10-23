const express = require('express');
const path = require('path');
const { requerirAdmin } = require('../middleware/auth');
const usuariosService = require('../services/usuarios');

// Cuando la base todavia no esta configurada, estas rutas no deben contestar un 500
// generico ("no se pudo leer la lista") -- eso manda a buscar un bug donde no lo hay.
// Se distingue ese caso y se dice exactamente que falta.
function responderError(res, e, mensajeGenerico) {
  if (e && e.sinBaseDeDatos) {
    return res.status(503).json({
      ok: false,
      sinBaseDeDatos: true,
      mensaje: 'Las cuentas individuales necesitan una base de datos MySQL, y todavia no esta ' +
        'configurada. Mientras tanto el bot sigue con el acceso unico compartido. ' +
        '(Detalle: ' + e.message + ')',
    });
  }
  console.error(mensajeGenerico + ':', e.message);
  return res.status(500).json({ ok: false, mensaje: mensajeGenerico + '.' });
}

const router = express.Router();

// Dejar el bot sin ningun administrador activo es irreversible desde la propia app: ya no
// habria quien entre a /usuarios a arreglarlo, y habria que meter mano a la base de datos.
// Por eso tanto quitar el rol de admin como desactivar una cuenta pasan por aqui.
//
// Se cuentan solo los administradores ACTIVOS: uno desactivado no puede entrar, asi que no
// cuenta como red de seguridad.
async function quedariaSinAdministradores(idAfectado) {
  const todos = await usuariosService.listarUsuarios();
  const adminsActivos = todos.filter((u) => u.rol === 'admin' && u.activo);
  return adminsActivos.length <= 1 && adminsActivos.some((u) => u.id === idAfectado);
}

// GET /usuarios -> pagina de administracion (solo admins, ver middleware/auth.js).
router.get('/usuarios', requerirAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'usuarios.html'));
});

// GET /admin/usuarios -> lista de usuarios (sin password) para pintar la tabla.
router.get('/admin/usuarios', requerirAdmin, async (req, res) => {
  try {
    const usuarios = await usuariosService.listarUsuarios();
    res.json({ ok: true, usuarios });
  } catch (e) {
    responderError(res, e, 'No se pudo leer la lista de usuarios');
  }
});

// POST /admin/usuarios -> crea un usuario nuevo.
router.post('/admin/usuarios', requerirAdmin, async (req, res) => {
  try {
    const { nombre, usuario, email, password, rol } = req.body || {};
    if (!nombre || !usuario || !password) {
      return res.status(400).json({ ok: false, mensaje: 'Faltan nombre, usuario o contraseña.' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ ok: false, mensaje: 'La contraseña debe tener al menos 6 caracteres.' });
    }
    const nuevo = await usuariosService.crearUsuario({
      nombre: String(nombre).trim(),
      usuario: String(usuario).trim(),
      email: email ? String(email).trim() : null,
      password: String(password),
      rol: rol === 'admin' ? 'admin' : 'usuario',
    });
    res.json({ ok: true, usuario: { id: nuevo.id, usuario: nuevo.usuario } });
  } catch (e) {
    if (e.code === 'P2002') {
      return res.status(409).json({ ok: false, mensaje: 'Ese nombre de usuario o correo ya existe.' });
    }
    responderError(res, e, 'No se pudo crear el usuario');
  }
});

// POST /admin/usuarios/:id/password -> resetea la contraseña de alguien (p.ej. si la olvido).
router.post('/admin/usuarios/:id/password', requerirAdmin, async (req, res) => {
  try {
    const { password } = req.body || {};
    if (!password || String(password).length < 6) {
      return res.status(400).json({ ok: false, mensaje: 'La contraseña debe tener al menos 6 caracteres.' });
    }
    await usuariosService.cambiarPassword(Number(req.params.id), String(password));
    res.json({ ok: true });
  } catch (e) {
    responderError(res, e, 'No se pudo cambiar la contraseña');
  }
});

// POST /admin/usuarios/:id/activo -> activa/desactiva una cuenta (no la borra, por si
// se necesita revisar su historial de registros mas adelante).
router.post('/admin/usuarios/:id/activo', requerirAdmin, async (req, res) => {
  try {
    const { activo } = req.body || {};
    const id = Number(req.params.id);

    if (!activo) {
      if (id === req.session.usuarioId) {
        return res.status(400).json({ ok: false, mensaje: 'No puedes desactivar tu propia cuenta.' });
      }
      if (await quedariaSinAdministradores(id)) {
        return res.status(400).json({
          ok: false,
          mensaje: 'Es el unico administrador activo. Nombra a otro antes de desactivarlo, ' +
            'o el bot se quedaria sin quien administre usuarios.',
        });
      }
    }

    await usuariosService.cambiarActivo(id, Boolean(activo));
    res.json({ ok: true });
  } catch (e) {
    responderError(res, e, 'No se pudo actualizar el usuario');
  }
});

// POST /admin/usuarios/:id/rol -> hace administrador a alguien, o se lo quita.
//
// Un administrador puede ver la bitacora completa (quien capturo que y a que hora), los
// errores del servidor, cerrar el bot para todo el equipo y crear o borrar cuentas. O sea
// que esto es dar las llaves: va con dos frenos.
//
// El rol NUNCA se toma tal cual del navegador: solo se aceptan los dos valores validos.
router.post('/admin/usuarios/:id/rol', requerirAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { rol } = req.body || {};
    if (rol !== 'admin' && rol !== 'usuario') {
      return res.status(400).json({ ok: false, mensaje: 'El rol debe ser "admin" o "usuario".' });
    }

    // Freno 1: nadie se cambia el rol a si mismo. Quitarselo por error te deja fuera de
    // esta misma pantalla, sin forma de deshacerlo.
    if (id === req.session.usuarioId) {
      return res.status(400).json({
        ok: false,
        mensaje: 'No puedes cambiar tu propio rol. Pideselo a otro administrador.',
      });
    }

    // Freno 2: no dejar el bot sin administradores.
    if (rol === 'usuario' && await quedariaSinAdministradores(id)) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Es el unico administrador activo. Nombra a otro antes de quitarle el rol.',
      });
    }

    await usuariosService.cambiarRol(id, rol);

    // Un cambio de permisos deja rastro en la consola, y de ahi pasa al registro de errores
    // (ver middleware/errores.js) solo si falla. Esto es informativo y a proposito: cuando
    // alguien pregunte "¿quien le dio acceso a fulano?", la respuesta esta en los logs.
    console.log('[usuarios] ' + (req.session.usuario || '?') + ' cambio el rol del usuario #' + id + ' a "' + rol + '"');

    res.json({ ok: true });
  } catch (e) {
    responderError(res, e, 'No se pudo cambiar el rol');
  }
});

module.exports = router;
