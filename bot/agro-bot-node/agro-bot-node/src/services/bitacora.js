// Bitacora diaria del campo: cada captura que se guarda bien (web, Captura rapida, varias
// filas o WhatsApp) deja tambien una copia en la tabla "registros" de la base de datos
// (modelo Registro de prisma/schema.prisma), y de ahi se arma el resumen del dia por
// huerta que se ve en /bitacora.
//
// Igual que el resto de la base, es OPCIONAL: sin DATABASE_URL (o si la base falla) no se
// registra nada y el guardado en Google Sheets sigue exactamente igual -- nunca se tumba
// una captura por culpa de la bitacora.
const config = require('../config');
const { obtenerPrisma, porQueNoHayBase } = require('./prisma');

// Solo las tablas que AGREGAN filas. Resumen Semanal sobreescribe un bloque fijo y no es
// una actividad del dia.
const TABLAS_BITACORA = ['reporte_campo', 'actividades_diarias', 'maquinaria', 'insumos'];

const NOMBRES_TABLA = {
  reporte_campo: 'Rendimiento Diario Jornal',
  actividades_diarias: 'Actividades Diarias',
  maquinaria: 'Maquinaria',
  insumos: 'Insumos',
};

async function registrarCaptura({ tabla, campos, reportadoPor, canal, textoTranscrito, whatsappFrom, whatsappPhoneNumberId, usuarioId }) {
  if (!TABLAS_BITACORA.includes(tabla)) return;
  const prisma = obtenerPrisma();
  if (!prisma) return;
  try {
    await prisma.registro.create({
      data: {
        tabla,
        campos: campos || {},
        reportadoPor: reportadoPor || null,
        canal: canal || 'web',
        textoTranscrito: textoTranscrito || null,
        whatsappFrom: whatsappFrom || null,
        whatsappPhoneNumberId: whatsappPhoneNumberId || null,
        usuarioId: usuarioId || null,
      },
    });
  } catch (e) {
    console.error('[bitacora] No se pudo registrar la captura (el guardado en Sheets si quedo):', e.message);
  }
}

// "YYYY-MM-DD" de una fecha en la zona horaria del bot (America/Mazatlan por defecto).
function diaLocal(fecha) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: config.timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(fecha);
}
function horaLocal(fecha) {
  return new Intl.DateTimeFormat('es-MX', { timeZone: config.timezone, hour: '2-digit', minute: '2-digit', hour12: false }).format(fecha);
}

function hoy() {
  return diaLocal(new Date());
}

function numero(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function texto(v) {
  return v === null || v === undefined ? '' : String(v).trim();
}

// Convierte un registro guardado al rengloncito que se ve en la bitacora, sin importar de
// que tabla venga (cada tabla nombra distinto la huerta, la gente, la cantidad...).
function aEntrada(r) {
  const c = r.campos || {};
  const huerta = texto(c.Huerta) || [texto(c.Campo), texto(c.Lote)].filter(Boolean).join(' / ') || 'Sin huerta';
  const personas = numero(c.NumeroDePersonas) || numero(c.NumeroJornaleros);
  let cantidad = '';
  if (r.tabla === 'reporte_campo' && texto(c.CantidadRealizada)) cantidad = `${c.CantidadRealizada} ${texto(c.UnidadDeMedida)}`.trim();
  if (r.tabla === 'maquinaria' && texto(c.AvanceRendimiento)) cantidad = `${c.AvanceRendimiento} ha`;
  if (r.tabla === 'insumos' && texto(c.Cantidad)) cantidad = `${c.Cantidad} ${texto(c.UnidadDeMedida)}`.trim();
  const incidencia = texto(c.Incidencia).toLowerCase().startsWith('si');
  return {
    id: r.id,
    hora: horaLocal(r.creadoEn),
    tabla: r.tabla,
    tablaNombre: NOMBRES_TABLA[r.tabla] || r.tabla,
    huerta,
    ubicacion: texto(c.Ubicacion),
    actividad: texto(c.Actividad) || texto(c.RecursoInsumo) || '(sin actividad)',
    responsable: texto(c.Responsable),
    cuadrilla: texto(c.ProcedenciaCuadrilla),
    personas,
    cantidad,
    meta: texto(c.MetaDeRendimiento),
    equipo: [texto(c.Equipo), texto(c.Implemento)].filter(Boolean).join(' + '),
    litros: numero(c.Litros),
    insumo: r.tabla === 'insumos' ? texto(c.RecursoInsumo) : '',
    incidencia,
    motivoIncidencia: incidencia ? texto(c.MotivoDeIncidencia) : '',
    observaciones: texto(c.Observaciones),
    reportadoPor: texto(r.reportadoPor),
    canal: r.canal,
  };
}

// Resumen del dia: totales + una seccion por huerta. Cuenta para el dia todo registro
// cuya Fecha capturada sea ese dia; si no traia Fecha, el dia en que se capturo.
async function obtenerBitacoraDia(dia) {
  const prisma = obtenerPrisma();
  if (!prisma) return { disponible: false, motivo: porQueNoHayBase(), dia };

  // Ventana amplia por fecha de captura (cubre cualquier zona horaria) + los que traen
  // esa Fecha aunque se hayan capturado otro dia; luego se filtra exacto abajo.
  const inicio = new Date(`${dia}T00:00:00Z`);
  const desde = new Date(inicio.getTime() - 36 * 3600 * 1000);
  const hasta = new Date(inicio.getTime() + 60 * 3600 * 1000);
  const filas = await prisma.registro.findMany({
    where: {
      tabla: { in: TABLAS_BITACORA },
      OR: [
        { creadoEn: { gte: desde, lt: hasta } },
        // OJO con la sintaxis de "path": Prisma la escribe distinto segun el motor.
        // En MySQL es una cadena JSONPath ('$.Fecha'); en PostgreSQL seria un arreglo
        // (['Fecha']). Este proyecto usa MySQL (ver prisma/schema.prisma), asi que va la
        // cadena -- con el arreglo la consulta truena en tiempo de ejecucion.
        { campos: { path: '$.Fecha', equals: dia } },
      ],
    },
    orderBy: { creadoEn: 'asc' },
    take: 2000,
  });

  const delDia = filas.filter((r) => {
    const fecha = texto((r.campos || {}).Fecha).slice(0, 10);
    return fecha ? fecha === dia : diaLocal(r.creadoEn) === dia;
  });
  const entradas = delDia.map(aEntrada);

  const porHuerta = new Map();
  entradas.forEach((e) => {
    if (!porHuerta.has(e.huerta)) porHuerta.set(e.huerta, { huerta: e.huerta, ubicacion: e.ubicacion, entradas: [], personas: 0, incidencias: 0, litros: 0 });
    const h = porHuerta.get(e.huerta);
    h.entradas.push(e);
    h.personas += e.personas;
    h.litros += e.litros;
    if (e.incidencia) h.incidencias++;
    if (!h.ubicacion && e.ubicacion) h.ubicacion = e.ubicacion;
  });
  const huertas = Array.from(porHuerta.values()).sort((a, b) => b.entradas.length - a.entradas.length);

  const porTabla = {};
  entradas.forEach((e) => { porTabla[e.tablaNombre] = (porTabla[e.tablaNombre] || 0) + 1; });

  return {
    disponible: true,
    dia,
    totales: {
      registros: entradas.length,
      huertas: huertas.length,
      personas: entradas.reduce((s, e) => s + e.personas, 0),
      incidencias: entradas.filter((e) => e.incidencia).length,
      litros: entradas.reduce((s, e) => s + e.litros, 0),
      porTabla,
    },
    huertas,
  };
}

module.exports = { registrarCaptura, obtenerBitacoraDia, hoy, TABLAS_BITACORA };
