// Funciones compartidas para darle forma a la respuesta de CUALQUIER proveedor de IA
// (Gemini, Claude, etc.) al mismo formato que espera el resto del codigo. Cada
// servicio (services/gemini.js, services/claude.js) le pasa el JSON ya extraido de su
// respuesta (o null si no se pudo obtener) mas el texto crudo como respaldo, y estas
// funciones se encargan de rellenar valores por defecto si algo vino vacio.
//
// Se separaron de services/gemini.js para que services/claude.js use exactamente la
// misma logica -- evita que los dos proveedores se vayan desalineando con el tiempo.

// --- Automatico (WhatsApp): la IA decide la tabla o si es consulta ---
function parsearRespuestaAuto(data, raw) {
  if (!data) return { tabla: 'no_identificada', confianza: 'baja', texto_transcrito: raw || '', campos: {} };
  return {
    tabla: data.tabla || 'no_identificada',
    confianza: data.confianza || 'baja',
    texto_transcrito: data.texto_transcrito || '',
    campos: data.campos || {},
  };
}

// --- Forzado (pagina web, botones "Agregar Datos"): ya se eligio tabla, solo extrae ---
// Un mensaje puede traer VARIOS registros (ej. "cuadrilla 1 corto 40, cuadrilla 2
// corto 35"): llegan en "registros", uno por fila. "campos" se sigue llenando con el
// primero para no romper a quien solo lee un registro (WhatsApp, codigo viejo).
function parsearRespuestaForzada(data, raw) {
  if (!data) return { confianza: 'baja', texto_transcrito: raw || '', campos: {}, registros: [{}] };
  const registros = Array.isArray(data.registros)
    ? data.registros.filter((r) => r && typeof r === 'object' && !Array.isArray(r))
    : [];
  const campos = data.campos || registros[0] || {};
  return {
    confianza: data.confianza || 'baja',
    texto_transcrito: data.texto_transcrito || '',
    campos,
    registros: registros.length ? registros : [campos],
  };
}

// --- Forzado (pagina web, botones "Leer / Preguntar"): ya se eligio tabla, extrae filtros ---
function parsearRespuestaConsulta(data, raw) {
  if (!data) return { texto_transcrito: raw || '', campos: {} };
  return {
    texto_transcrito: data.texto_transcrito || '',
    campos: data.campos || {},
  };
}

module.exports = { parsearRespuestaAuto, parsearRespuestaForzada, parsearRespuestaConsulta };
