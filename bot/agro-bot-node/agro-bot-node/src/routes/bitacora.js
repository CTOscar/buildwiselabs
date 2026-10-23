const express = require('express');
const path = require('path');
const bitacora = require('../services/bitacora');

const router = express.Router();

// GET /bitacora -> pagina de la bitacora diaria del campo (ver src/public/bitacora.html).
router.get('/bitacora', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'bitacora.html'));
});

// GET /bitacora-datos?fecha=YYYY-MM-DD -> resumen del dia por huerta. Sin base de datos
// responde { disponible: false, motivo } para que la pagina explique como activarla.
router.get('/bitacora-datos', async (req, res) => {
  const fecha = String(req.query.fecha || '');
  const dia = /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha : bitacora.hoy();
  try {
    res.json({ ok: true, ...(await bitacora.obtenerBitacoraDia(dia)) });
  } catch (e) {
    console.error('Error leyendo la bitacora:', e.message);
    res.status(200).json({ ok: false, dia, mensaje: 'No se pudo leer la bitacora de la base de datos: ' + e.message });
  }
});

module.exports = router;
