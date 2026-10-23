// Compuerta del modo mantenimiento (ver services/mantenimiento.js).
//
// Cuando esta activo, TODO el mundo recibe la pagina de "cerrado" menos los
// administradores, que siguen navegando normal -- si no, quien lo encendio quedaria
// encerrado afuera sin poder apagarlo.
//
// Donde se monta importa (ver server.js): va DESPUES de /login, del webhook de WhatsApp
// y de los assets estaticos, para que:
//   - un administrador pueda entrar a iniciar sesion y apagarlo,
//   - la pagina de mantenimiento pueda cargar su CSS y el logo,
//   - Meta siga pudiendo entregar mensajes al webhook (si se le responde error una y
//     otra vez, Meta termina dando de baja la suscripcion; eso no se arregla solo).
const mantenimiento = require('../services/mantenimiento');

function escapeHtml(v) {
  return String(v || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function paginaCerrado(estado) {
  const desde = estado.desde
    ? new Date(estado.desde).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
    : null;
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>No disponible - La Pedregoza</title>
<link rel="icon" type="image/png" sizes="32x32" href="/img/favicon-32.png?v=2">
<link rel="icon" href="/favicon.ico?v=2" sizes="any">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  body { font-family: Inter, 'Segoe UI', system-ui, sans-serif; background:#fafaf9; color:#1c1917;
         min-height:100vh; margin:0; display:flex; align-items:center; justify-content:center; padding:1rem; }
  .caja { background:#fff; border:1px solid #f5f5f4; border-radius:1.5rem; padding:2.5rem 2rem;
          max-width:26rem; width:100%; text-align:center; box-shadow:0 1px 3px rgba(0,0,0,.06); }
  img { height:2.5rem; width:auto; margin:0 auto 1.25rem; display:block; }
  h1 { font-size:1.25rem; margin:0 0 .75rem; }
  p { color:#78716c; font-size:.9rem; line-height:1.55; margin:0; }
  .pie { color:#a8a29e; font-size:.75rem; margin-top:1.5rem; }
</style>
</head>
<body>
  <div class="caja">
    <img src="/img/pedregoza-logo.png" alt="La Pedregoza">
    <h1>El bot no esta disponible</h1>
    <p>${escapeHtml(estado.mensaje)}</p>
    ${desde ? `<p class="pie">En pausa desde el ${escapeHtml(desde)}.</p>` : ''}
  </div>
</body>
</html>`;
}

function compuertaMantenimiento(req, res, next) {
  if (!mantenimiento.estaActivo()) return next();

  // Los administradores pasan: son los unicos que pueden volver a encenderlo.
  if (req.session && req.session.autenticado && req.session.rol === 'admin') return next();

  const estado = mantenimiento.obtenerEstado();

  // 503 + Retry-After es la respuesta correcta para "no disponible temporalmente":
  // los buscadores entienden que NO deben desindexar la pagina, a diferencia de un 404.
  res.status(503);
  res.set('Retry-After', '3600');

  // A las llamadas del frontend (fetch) se les contesta JSON, no HTML, para que el bot
  // pueda mostrar el aviso en vez de intentar parsear una pagina.
  const esLlamadaApi = req.path.startsWith('/bot-web-') || req.path.startsWith('/admin/') ||
    req.path.startsWith('/monitoreo/') || req.path.startsWith('/documentos') ||
    req.path === '/perfil' || req.path.startsWith('/enviar-tab-correo');
  if (esLlamadaApi || req.xhr || (req.get('accept') || '').includes('application/json')) {
    return res.json({ ok: false, mantenimiento: true, mensaje: estado.mensaje });
  }

  return res.send(paginaCerrado(estado));
}

module.exports = { compuertaMantenimiento };
