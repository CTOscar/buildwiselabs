const express = require('express');
const path = require('path');
const fs = require('fs');
const config = require('../config');
const { hayBaseDeDatos } = require('../services/prisma');
const usuariosService = require('../services/usuarios');
const fotos = require('../services/fotos');

const router = express.Router();

// GET /login -> sirve la pagina de inicio de sesion (publica, sin sesion requerida).
router.get('/login', (req, res) => {
  if (req.session && req.session.autenticado) return res.redirect('/bot-web');
  res.sendFile(path.join(__dirname, '..', 'public', 'login.html'));
});

// POST /login -> arranca la sesion. Dos caminos, en este orden:
//   1) Si HAY base de datos configurada, valida contra la tabla de usuarios (cada quien
//      con su cuenta, su nombre y su rol).
//   2) Si NO la hay, cae al acceso unico compartido de siempre (config.auth). Esto es a
//      proposito: permite subir esta version a un servidor que todavia no tiene MySQL
//      sin dejar a nadie fuera.
router.post('/login', async (req, res) => {
  const { usuario, password } = req.body || {};

  if (hayBaseDeDatos()) {
    try {
      const u = await usuariosService.verificarCredenciales(usuario, password);
      if (u) {
        req.session.autenticado = true;
        req.session.usuarioId = u.id;
        req.session.usuario = u.usuario;
        req.session.nombre = u.nombre;
        req.session.rol = u.rol;
        return res.json({ ok: true });
      }
      if (await usuariosService.cuentaPendiente(usuario, password)) {
        return res.status(403).json({
          ok: false,
          mensaje: 'Tu cuenta está pendiente de aprobación. Un administrador tiene que activarla antes de que puedas entrar.',
        });
      }
      return res.status(401).json({ ok: false, mensaje: 'Usuario o contraseña incorrectos.' });
    } catch (e) {
      // La base esta configurada pero no responde (credenciales malas, servidor caido,
      // tablas sin migrar...). Se avisa claro en vez de dejar entrar por la puerta de
      // atras sin querer.
      console.error('Error validando usuario contra la base:', e.message);
      return res.status(500).json({
        ok: false,
        mensaje: 'No se pudo validar el acceso contra la base de datos: ' + e.message,
      });
    }
  }

  // Modo compartido (sin base de datos). El unico acceso que existe es el del dueño,
  // por eso su rol es "admin".
  if (usuario === config.auth.usuario && password === config.auth.password) {
    req.session.autenticado = true;
    req.session.usuario = usuario;
    req.session.nombre = usuario;
    req.session.rol = 'admin';
    return res.json({ ok: true });
  }
  res.status(401).json({ ok: false, mensaje: 'Usuario o contraseña incorrectos.' });
});

// POST /logout -> cierra la sesion.
router.post('/logout', (req, res) => {
  if (!req.session) return res.json({ ok: true });
  req.session.destroy(() => res.json({ ok: true }));
});

// GET /perfil -> datos minimos del usuario con sesion iniciada (para el chip de perfil).
router.get('/perfil', (req, res) => {
  if (!req.session || !req.session.autenticado) return res.status(401).json({ ok: false });
  res.json({
    ok: true,
    usuario: req.session.usuario,
    // El id sirve para que /usuarios sepa cual de las filas es la de quien esta mirando y
    // no le ofrezca cambiarse el rol a si mismo (el servidor lo rechaza igual, pero mejor
    // no ofrecer un boton que solo da error).
    usuarioId: req.session.usuarioId || null,
    nombre: req.session.nombre || req.session.usuario,
    rol: req.session.rol || 'usuario',
    // La UI usa esto para mostrar u ocultar el acceso a /usuarios.
    multiusuario: hayBaseDeDatos(),
  });
});

// Foto de perfil, UNA POR PERSONA (ver services/fotos.js).
//
// Antes era una sola foto compartida para todo el equipo: el ultimo que subiera la suya se
// la pisaba a los demas. Ahora cada cuenta guarda la suya, identificada por el id del
// usuario de la sesion. En el modo de acceso unico (sin base de datos) sigue habiendo una
// sola, que es lo correcto ahi porque tambien hay un solo acceso.

// POST /perfil-foto -> guarda la foto de QUIEN tiene la sesion abierta. El navegador ya la
// manda recortada a cuadro y comprimida a JPEG (ver recortarYComprimirFoto en index.js),
// asi que aqui solo se decodifica el base64 y se escribe.
router.post('/perfil-foto', (req, res) => {
  if (!req.session || !req.session.autenticado) return res.status(401).json({ ok: false });
  const { foto_base64: fotoBase64 } = req.body || {};
  if (!fotoBase64) return res.status(400).json({ ok: false, mensaje: 'Falta la foto.' });
  try {
    fotos.guardar(fotos.claveDeSesion(req.session), Buffer.from(fotoBase64, 'base64'));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, mensaje: 'No se pudo guardar la foto: ' + e.message });
  }
});

// GET /perfil-foto -> devuelve la foto de quien tiene la sesion abierta, o 404 si todavia
// no ha subido ninguna (y entonces la pantalla deja el circulo con su inicial).
//
// Va por una ruta y no como archivo estatico por dos motivos: exige sesion, y manda
// "no-cache". Eso ultimo importa porque la direccion es siempre la misma aunque la foto
// cambie; sin esa cabecera el navegador seguiria mostrando la anterior. "no-cache" no
// significa "no la guardes", sino "preguntame antes de usarla": si no cambio, el servidor
// contesta 304 y no se vuelve a descargar.
router.get('/perfil-foto', (req, res) => {
  if (!req.session || !req.session.autenticado) return res.status(401).end();
  const archivo = fotos.rutaParaServir(fotos.claveDeSesion(req.session));
  if (!archivo) return res.status(404).end();
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Content-Type', 'image/jpeg');
  res.sendFile(archivo);
});

// Pagina minima reutilizable (mismo estilo del resto) para avisos sin credenciales.
function paginaSimple(titulo, texto) {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(titulo)} - La Pedregoza</title>
<link rel="icon" type="image/png" sizes="32x32" href="/img/favicon-32.png?v=2">
<script src="https://cdn.tailwindcss.com"></script>
<style>body { font-family: 'Segoe UI', system-ui, sans-serif; }</style>
</head>
<body class="min-h-screen bg-stone-50 flex items-center justify-center px-4">
  <div class="w-full max-w-sm bg-white rounded-3xl shadow-sm border border-stone-100 p-8 text-center">
    <img src="/img/pedregoza-logo.png" alt="La Pedregoza" class="h-8 w-auto mx-auto mb-5">
    <h1 class="text-xl font-bold text-stone-800">${escapeHtml(titulo)}</h1>
    <p class="text-sm text-stone-500 mt-3">${escapeHtml(texto)}</p>
    <button type="button" onclick="window.location.href='/login'"
      class="w-full bg-stone-900 hover:bg-black text-white font-semibold rounded-full py-3 text-sm transition mt-6">
      Ir a iniciar sesion
    </button>
  </div>
</body>
</html>`;
}

function escapeHtml(v) {
  return String(v || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// --- "Crear perfil" desde el login (publico, sin sesion) ---
//
// Solo existe con base de datos (los perfiles son filas de la tabla usuarios). El perfil
// nace DESACTIVADO y con rol "usuario" SIEMPRE (no se acepta "rol" del navegador): un
// administrador lo activa desde /usuarios. Sin esa aprobacion, cualquiera con el enlace del
// bot podria crearse cuenta y escribir en las hojas del equipo.
router.get('/registro/estado', (req, res) => {
  res.json({ ok: true, disponible: hayBaseDeDatos() });
});

const PATRON_USUARIO = /^[a-zA-Z0-9._-]{3,30}$/;
const PATRON_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post('/registro', async (req, res) => {
  if (!hayBaseDeDatos()) {
    return res.status(200).json({
      ok: false,
      mensaje: 'Por ahora el bot usa un acceso compartido y no permite crear perfiles. Pide el acceso a un administrador.',
    });
  }
  const { nombre, usuario, email, password } = req.body || {};
  const nombreLimpio = String(nombre || '').trim();
  const usuarioLimpio = String(usuario || '').trim();
  const emailLimpio = String(email || '').trim();
  if (nombreLimpio.length < 3 || nombreLimpio.length > 80) {
    return res.status(400).json({ ok: false, mensaje: 'Escribe tu nombre completo (3 a 80 caracteres).' });
  }
  if (!PATRON_USUARIO.test(usuarioLimpio)) {
    return res.status(400).json({ ok: false, mensaje: 'El usuario debe tener de 3 a 30 caracteres: letras, números, punto, guion o guion bajo, sin espacios.' });
  }
  if (emailLimpio && (!PATRON_CORREO.test(emailLimpio) || emailLimpio.length > 120)) {
    return res.status(400).json({ ok: false, mensaje: 'El correo no parece válido.' });
  }
  if (String(password || '').length < 6 || String(password).length > 100) {
    return res.status(400).json({ ok: false, mensaje: 'La contraseña debe tener al menos 6 caracteres.' });
  }
  try {
    await usuariosService.crearUsuario({
      nombre: nombreLimpio,
      usuario: usuarioLimpio,
      email: emailLimpio || null,
      password: String(password),
      rol: 'usuario',
      activo: false,
    });
    res.json({
      ok: true,
      mensaje: 'Perfil creado. Un administrador tiene que activarlo; cuando lo haga podrás entrar con tu usuario y contraseña.',
    });
  } catch (e) {
    if (e.code === 'P2002') {
      return res.status(409).json({ ok: false, mensaje: 'Ese usuario o correo ya está registrado.' });
    }
    console.error('Error creando perfil desde el login:', e.message);
    res.status(500).json({ ok: false, mensaje: 'No se pudo crear el perfil. Intenta de nuevo más tarde.' });
  }
});

// GET /register -> "Ver usuario y contraseña" del login.
//
// En modo compartido muestra el acceso del equipo, como siempre. En cuanto haya base de
// datos NO muestra ninguna credencial: con cuentas individuales seria un agujero enorme
// (esta pagina es publica), asi que en ese modo solo explica que hay que pedirle acceso
// a un administrador.
router.get('/register', (req, res) => {
  if (hayBaseDeDatos()) {
    return res.send(paginaSimple(
      'Acceso individual',
      'Este bot ya usa cuentas individuales: cada persona tiene su propio usuario y contraseña. ' +
      'Si todavia no tienes acceso, pideselo a un administrador del equipo, que puede crearte una ' +
      'cuenta desde la pantalla de Usuarios.'
    ));
  }
  res.send(`<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Usuario y contraseña - La Pedregoza</title>
<script src="https://cdn.tailwindcss.com"></script>
<style>
  body { font-family: 'Segoe UI', system-ui, sans-serif; }
</style>
</head>
<body class="min-h-screen bg-stone-50 flex items-center justify-center px-4">

<div class="w-full max-w-sm">
  <div class="flex items-center gap-2 justify-center mb-8">
    <img src="/img/pedregoza-logo.png" alt="La Pedregoza" class="h-7 w-auto">
    <span class="font-semibold text-stone-700 tracking-tight">La Pedregoza</span>
  </div>

  <div class="bg-white rounded-3xl shadow-sm border border-stone-100 p-8">
    <h1 class="text-xl font-bold text-stone-800 text-center">Usuario y contraseña</h1>
    <p class="text-sm text-stone-400 text-center mt-1 mb-6">Este es el acceso compartido del equipo para entrar al bot.</p>

    <div class="space-y-3">
      <div class="bg-stone-50 border border-stone-200 rounded-2xl px-5 py-3">
        <p class="text-xs font-semibold text-stone-400 uppercase tracking-wide">Usuario</p>
        <p class="text-sm font-semibold text-stone-800 mt-0.5">${escapeHtml(config.auth.usuario)}</p>
      </div>
      <div class="bg-stone-50 border border-stone-200 rounded-2xl px-5 py-3">
        <p class="text-xs font-semibold text-stone-400 uppercase tracking-wide">Contraseña</p>
        <p class="text-sm font-semibold text-stone-800 mt-0.5">${escapeHtml(config.auth.password)}</p>
      </div>
    </div>

    <button type="button" onclick="window.location.href='/login'"
      class="w-full bg-stone-900 hover:bg-black text-white font-semibold rounded-full py-3 text-sm transition mt-6">
      Ir a iniciar sesión
    </button>
  </div>

  <p class="text-xs text-stone-400 text-center mt-6">No compartas esta pagina fuera del equipo.</p>
</div>
</body>
</html>`);
});

module.exports = router;
