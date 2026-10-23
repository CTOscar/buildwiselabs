const express = require('express');
const { guardarRegistro, enviarRegistroPorCorreo } = require('../lib/guardarRegistro');

const router = express.Router();

// Rama 3: POST /bot-web-guardar -> se dispara cuando el usuario confirma en el preview
// (equivalente a "Webhook - Guardar confirmado (POST)" -> "Preparar guardado confirmado" -> ...).
router.post('/bot-web-guardar', async (req, res) => {
  try {
    const { tabla, campos, reportado_por: reportadoPor, texto_transcrito: textoTranscrito } = req.body || {};
    const resultado = await guardarRegistro({
      tabla,
      campos: campos || {},
      reportadoPor: reportadoPor || '',
      textoTranscrito: textoTranscrito || '',
      canal: 'web',
      usuarioId: req.session?.usuarioId,
    });
    res.json({ ok: resultado.ok, mensaje: resultado.mensaje });
  } catch (e) {
    console.error('Error guardando registro:', e.response?.data || e.message);
    res.status(200).json({ ok: false, mensaje: 'No se pudo guardar el registro.' });
  }
});

// POST /bot-web-guardar-varios -> igual que /bot-web-guardar pero con varias filas de un
// jalon (Captura rapida con N filas, o un mensaje del que la IA saco varios registros).
// Se guardan UNA POR UNA y en orden: sheets.guardarFila busca la ultima fila ocupada
// antes de escribir, asi que en paralelo dos filas podrian caer en el mismo renglon.
// Si una falla, se sigue con las demas y se reporta cuales no entraron.
const MAX_FILAS_POR_LOTE = 50;
// Resumen Semanal no es una fila que se agrega (sobreescribe un bloque fijo), asi que
// no tiene sentido guardar "varias".
const TABLAS_SIN_LOTE = ['resumen_semanal'];

function filaVacia(campos) {
  return !Object.values(campos || {}).some((v) => v !== null && v !== undefined && String(v).trim() !== '');
}

router.post('/bot-web-guardar-varios', async (req, res) => {
  const { tabla, filas, reportado_por: reportadoPor, texto_transcrito: textoTranscrito } = req.body || {};
  if (TABLAS_SIN_LOTE.includes(tabla)) {
    return res.json({ ok: false, mensaje: 'Esta tabla no admite varias filas a la vez.' });
  }
  const conDatos = (Array.isArray(filas) ? filas : []).filter((f) => !filaVacia(f));
  if (!conDatos.length) {
    return res.json({ ok: false, mensaje: 'No hay filas con datos para guardar.' });
  }
  if (conDatos.length > MAX_FILAS_POR_LOTE) {
    return res.json({ ok: false, mensaje: `Máximo ${MAX_FILAS_POR_LOTE} filas por envío.` });
  }

  const resultados = [];
  for (let i = 0; i < conDatos.length; i++) {
    try {
      const r = await guardarRegistro({
        tabla,
        campos: conDatos[i],
        reportadoPor: reportadoPor || '',
        textoTranscrito: textoTranscrito || '',
        canal: 'web',
        usuarioId: req.session?.usuarioId,
      });
      resultados.push({ fila: i + 1, ok: r.ok, mensaje: r.mensaje });
    } catch (e) {
      console.error(`Error guardando fila ${i + 1} de ${conDatos.length}:`, e.response?.data || e.message);
      resultados.push({ fila: i + 1, ok: false, mensaje: 'No se pudo guardar esta fila.' });
    }
  }

  const guardadas = resultados.filter((r) => r.ok).length;
  const fallidas = resultados.filter((r) => !r.ok).map((r) => r.fila);
  const mensaje = fallidas.length
    ? `Se guardaron ${guardadas} de ${resultados.length} filas. No entraron: fila ${fallidas.join(', ')}.`
    : `Se guardaron ${guardadas} ${guardadas === 1 ? 'fila' : 'filas'} correctamente.`;
  res.json({ ok: fallidas.length === 0, guardadas, total: resultados.length, fallidas, resultados, mensaje });
});

// Boton "Enviar" de la bandeja del archivo 4.1 (Rendimiento Diario Jornal, Insumos,
// Resumen Semanal) -- manda por correo lo que este en el formulario, independiente de
// si ya se guardo o no.
router.post('/bot-web-enviar', async (req, res) => {
  try {
    const { tabla, campos } = req.body || {};
    await enviarRegistroPorCorreo({ tabla, campos: campos || {} });
    res.json({ ok: true, mensaje: 'Correo enviado.' });
  } catch (e) {
    console.error('Error enviando registro por correo:', e.response?.data || e.message);
    res.status(200).json({ ok: false, mensaje: 'No se pudo enviar el correo.' });
  }
});

module.exports = router;
