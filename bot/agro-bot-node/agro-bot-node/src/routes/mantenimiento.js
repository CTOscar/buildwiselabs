const express = require('express');
const { requerirSesion, requerirAdmin } = require('../middleware/auth');
const mantenimiento = require('../services/mantenimiento');
const socketService = require('../services/socket');

const router = express.Router();

// Estas rutas se montan ANTES de la compuerta de mantenimiento (ver server.js): si no,
// al activarlo quedarian bloqueadas y nadie podria volver a encender la app.
// Llevan su propio requerirSesion + requerirAdmin.

// GET /admin/mantenimiento -> estado actual, para pintar el interruptor.
router.get('/admin/mantenimiento', requerirSesion, requerirAdmin, (req, res) => {
  res.json({ ok: true, ...mantenimiento.obtenerEstado() });
});

// POST /admin/mantenimiento -> enciende o apaga. Body: { activo: true/false, mensaje }
router.post('/admin/mantenimiento', requerirSesion, requerirAdmin, (req, res) => {
  const { activo, mensaje } = req.body || {};

  if (mantenimiento.FORZADO_POR_ENTORNO) {
    return res.status(409).json({
      ok: false,
      mensaje: 'El mantenimiento esta forzado por la variable MANTENIMIENTO del .env. ' +
        'Para poder apagarlo desde aqui, quita esa variable y reinicia el servidor.',
    });
  }

  const estado = activo
    ? mantenimiento.activar({ mensaje, porQuien: req.session.nombre || req.session.usuario })
    : mantenimiento.desactivar();

  // Avisar a las paginas abiertas para que reaccionen al instante: las de quien no es
  // administrador se recargan y caen en la pagina de "cerrado". Sin esto, alguien con
  // el bot ya abierto seguiria viendolo normal hasta que recargara por su cuenta.
  socketService.emitirEvento('mantenimiento', { activo: estado.activo, mensaje: estado.mensaje });

  res.json({ ok: true, ...estado });
});

module.exports = router;
