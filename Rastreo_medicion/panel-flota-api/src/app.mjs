// Rutas de la API del panel. La capa de datos (`repo`) se inyecta: MySQL en producción, memoria en las pruebas.
import express from 'express';
import { hashPassword, verifyPassword, newToken, sha256, isEmail, strongPassword, createLimiter } from './security.mjs';
import { registerOAuth } from './oauth.mjs';
import { summarizeSamples } from './fuel-summary.mjs';

const COOKIE = 'pf_sid';
const DAY = 864e5;

const readCookie = (req, name) => {
  const m = String(req.headers.cookie || '').match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
};

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const cleanAttributes = (a) => {
  if (!a || typeof a !== 'object' || Array.isArray(a)) return {};
  const out = {};
  for (const [k, v] of Object.entries(a).slice(0, 40)) {
    if (!/^[\w.-]{1,40}$/.test(k)) continue;
    if (v === null || ['string', 'number', 'boolean'].includes(typeof v)) out[k] = typeof v === 'string' ? v.slice(0, 500) : v;
  }
  return out;
};
const toDate = (v) => {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function createApp({ repo, config, status }) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1); // Hostinger va detrás de un proxy: así se ve la IP real
  const loginLimit = createLimiter(8, 15 * 60e3);
  const registerLimit = createLimiter(10, 60 * 60e3);
  const resetLimit = createLimiter(5, 60 * 60e3);
  const origins = new Set(config.allowedOrigins);

  // CORS con credenciales solo para los orígenes permitidos; bloquea escrituras desde otros orígenes.
  app.use((req, res, next) => {
    const o = req.headers.origin;
    if (o && origins.has(o)) {
      res.setHeader('Access-Control-Allow-Origin', o);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Ingest-Key');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      res.setHeader('Vary', 'Origin');
    }
    if (req.method === 'OPTIONS') return res.sendStatus(o && origins.has(o) ? 204 : 403);
    // El retorno de Apple es un POST desde appleid.apple.com: se protege con el estado de la cookie, no con el origen.
    if (o && !origins.has(o) && req.method !== 'GET' && !req.path.startsWith('/api/panel/auth/')) return res.status(403).json({ error: 'Origen no permitido' });
    next();
  });
  app.use(express.json({ limit: '2mb' }));
  // Sesión, usuarios y tractores nunca deben quedar en la caché del navegador ni de un proxy.
  app.use('/api/panel', (_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });

  const clientIp = (req) => req.ip || req.socket?.remoteAddress || '';
  const ua = (req) => String(req.headers['user-agent'] || '').slice(0, 255);

  async function startSession(req, res, user, remember) {
    const token = newToken();
    const ttl = remember ? 30 * DAY : 12 * 3600e3;
    await repo.createSession({ tokenHash: sha256(token), userId: user.id, expiresAt: new Date(Date.now() + ttl), ip: clientIp(req), userAgent: ua(req) });
    const parts = [`${COOKIE}=${encodeURIComponent(token)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax'];
    if (config.production) parts.push('Secure');
    if (remember) parts.push(`Max-Age=${Math.floor(ttl / 1000)}`);
    res.setHeader('Set-Cookie', parts.join('; '));
    await repo.touchLogin(user.id);
  }
  const clearCookie = (res) => res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${config.production ? '; Secure' : ''}`);

  // Carga el usuario de la sesión en req.user (si hay).
  app.use(
    wrap(async (req, _res, next) => {
      const token = readCookie(req, COOKIE);
      if (token) {
        req.sessionHash = sha256(token);
        const row = await repo.findSessionUser(req.sessionHash);
        if (row) req.user = row;
      }
      next();
    }),
  );
  const needAuth = (req, res, next) => (req.user ? next() : res.status(401).json({ error: 'Sin sesión' }));
  const needAdmin = (req, res, next) => (req.user?.role === 'admin' ? next() : res.status(403).json({ error: 'Solo administradores' }));
  const needIngest = (req, res, next) => {
    const key = req.headers['x-ingest-key'];
    if (config.ingestKey && typeof key === 'string' && key.length === config.ingestKey.length && sha256(key) === sha256(config.ingestKey)) return next();
    return req.user ? next() : res.status(401).json({ error: 'Clave de envío o sesión requerida' });
  };

  const r = express.Router();

  r.get('/health', wrap(async (_req, res) => {
    // Con la base caída responde 503 con el motivo (solo un código, nunca datos de conexión).
    if (status && !status().ready) return res.status(503).json({ ok: false, db: status().error || 'iniciando' });
    await repo.ping();
    res.json({ ok: true, db: 'ok' });
  }));

  // ---------- cuentas y sesión ----------
  r.post('/register', wrap(async (req, res) => {
    if (registerLimit.hit(clientIp(req))) return res.status(429).json({ error: 'Demasiados registros, intenta más tarde' });
    const name = str(req.body?.name, 120);
    const email = str(req.body?.email, 190).toLowerCase();
    const phone = str(req.body?.phone, 40);
    const password = req.body?.password;
    if (name.length < 2) return res.status(400).json({ error: 'Escribe tu nombre completo' });
    if (!isEmail(email)) return res.status(400).json({ error: 'Correo no válido' });
    if (!strongPassword(password)) return res.status(400).json({ error: 'La contraseña necesita 8 caracteres, un número y una mayúscula' });
    if (await repo.findUserByEmail(email)) return res.status(400).json({ error: 'El correo ya existe' });
    // La primera cuenta registrada queda como administradora.
    const role = (await repo.countUsers()) === 0 ? 'admin' : 'user';
    const id = await repo.createUser({ name, email, phone, role, attributes: cleanAttributes(req.body?.attributes), passwordHash: await hashPassword(password) });
    res.status(201).json(repo.publicUser(await repo.findUserById(id)));
  }));

  r.post('/login', wrap(async (req, res) => {
    const email = str(req.body?.email, 190).toLowerCase();
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const key = `${clientIp(req)}|${email}`;
    if (loginLimit.hit(key)) return res.status(429).json({ error: 'Demasiados intentos, espera unos minutos' });
    const user = isEmail(email) ? await repo.findUserByEmail(email) : null;
    const ok = user ? await verifyPassword(password, user.password_hash) : (await hashPassword(password || 'x'), false); // mismo costo con o sin usuario
    await repo.logLogin({ userId: user?.id, email, ok, ip: clientIp(req), userAgent: ua(req) });
    if (!ok) return res.status(401).json({ error: 'Credenciales incorrectas' });
    loginLimit.reset(key);
    await startSession(req, res, user, req.body?.remember !== false);
    res.json(repo.publicUser(await repo.findUserById(user.id)));
  }));

  registerOAuth(r, { repo, config, express, startSession, logLogin: (e) => repo.logLogin(e), clientIp, ua, cleanName: (v) => str(v, 120) || 'Usuario' });

  r.get('/session', needAuth, (req, res) => res.json(repo.publicUser(req.user)));
  // Cerrar sesión: DELETE /session (estándar) y POST /logout (alias para proxies o servidores locales que no reenvían DELETE).
  const endSession = wrap(async (req, res) => {
    if (req.sessionHash) await repo.deleteSession(req.sessionHash);
    clearCookie(res);
    res.sendStatus(204);
  });
  r.delete('/session', endSession);
  r.post('/logout', endSession);

  // Perfil: cada quien edita el suyo; un administrador puede editar cualquiera.
  r.put('/users/:id', needAuth, wrap(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Id no válido' });
    if (req.user.id !== id && req.user.role !== 'admin') return res.status(403).json({ error: 'Sin permiso' });
    const cur = await repo.findUserById(id);
    if (!cur) return res.status(404).json({ error: 'No encontrado' });
    const name = str(req.body?.name, 120) || cur.name;
    const email = (str(req.body?.email, 190) || cur.email).toLowerCase();
    if (!isEmail(email)) return res.status(400).json({ error: 'Correo no válido' });
    const other = await repo.findUserByEmail(email);
    if (other && other.id !== id) return res.status(400).json({ error: 'El correo ya existe' });
    const phone = req.body?.phone === undefined ? cur.phone : str(req.body.phone, 40);
    const attributes = req.body?.attributes === undefined ? repo.publicUser(cur).attributes : cleanAttributes(req.body.attributes);
    await repo.updateUser(id, { name, email, phone, attributes });
    if (req.body?.password) {
      if (!strongPassword(req.body.password)) return res.status(400).json({ error: 'La contraseña necesita 8 caracteres, un número y una mayúscula' });
      await repo.setPassword(id, await hashPassword(req.body.password));
      await repo.deleteUserSessions(id, id === req.user.id ? req.sessionHash : '');
    }
    res.json(repo.publicUser(await repo.findUserById(id)));
  }));

  // Foto de perfil: se guarda por id de cuenta. Cada quien cambia la suya; un administrador puede cambiar cualquiera.
  const PHOTO_TYPES = { 'image/jpeg': [0xff, 0xd8, 0xff], 'image/png': [0x89, 0x50, 0x4e, 0x47], 'image/webp': [0x52, 0x49, 0x46, 0x46] };
  const PHOTO_MAX = 400 * 1024;
  const photoOwner = (req, res, next) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Id no válido' });
    if (req.user.id !== id && req.user.role !== 'admin') return res.status(403).json({ error: 'Sin permiso' });
    req.targetId = id;
    next();
  };
  r.get('/users/:id/photo', needAuth, wrap(async (req, res) => {
    const id = Number(req.params.id);
    const photo = Number.isInteger(id) ? await repo.getPhoto(id) : null;
    if (!photo) return res.status(404).json({ error: 'Sin foto' });
    const etag = `"${id}-${new Date(photo.updatedAt).getTime()}-${photo.data.length}"`;
    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'private, no-cache'); // siempre revalida: cambia al instante cuando la persona sube otra
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (req.headers['if-none-match'] === etag) return res.sendStatus(304);
    res.type(photo.mime).send(photo.data);
  }));
  r.put('/users/:id/photo', needAuth, photoOwner, wrap(async (req, res) => {
    const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(String(req.body?.image || ''));
    if (!m) return res.status(400).json({ error: 'Usa una imagen JPG, PNG o WebP' });
    const data = Buffer.from(m[2], 'base64');
    if (data.length > PHOTO_MAX) return res.status(413).json({ error: 'La foto pesa demasiado (máximo 400 KB)' });
    if (!PHOTO_TYPES[m[1]].every((b, i) => data[i] === b)) return res.status(400).json({ error: 'El archivo no es una imagen válida' });
    if (!(await repo.findUserById(req.targetId))) return res.status(404).json({ error: 'No encontrado' });
    await repo.savePhoto(req.targetId, m[1], data);
    res.status(204).end();
  }));
  r.delete('/users/:id/photo', needAuth, photoOwner, wrap(async (req, res) => {
    await repo.deletePhoto(req.targetId);
    res.status(204).end();
  }));

  // Correos que han entrado con Google o Apple.
  r.get('/oauth-accounts', needAuth, needAdmin, wrap(async (_req, res) => res.json(await repo.listOAuth())));

  r.get('/users', needAuth, needAdmin, wrap(async (_req, res) => res.json(await repo.listUsers())));
  r.patch('/users/:id/role', needAuth, needAdmin, wrap(async (req, res) => {
    const id = Number(req.params.id);
    const role = req.body?.role;
    if (!Number.isInteger(id) || !['admin', 'user'].includes(role)) return res.status(400).json({ error: 'Datos no válidos' });
    if (id === req.user.id && role !== 'admin') return res.status(400).json({ error: 'No puedes quitarte el rol de administrador' });
    if (!(await repo.findUserById(id))) return res.status(404).json({ error: 'No encontrado' });
    await repo.setRole(id, role);
    res.json(repo.publicUser(await repo.findUserById(id)));
  }));
  r.get('/login-log', needAuth, needAdmin, wrap(async (req, res) => res.json(await repo.loginLog(req.query.limit))));

  // Recuperar contraseña: responde igual exista o no el correo. El envío por correo requiere SMTP (pendiente);
  // mientras tanto el enlace queda en la bitácora del servidor para que el administrador lo entregue.
  r.post('/password/reset', wrap(async (req, res) => {
    const email = str(req.body?.email, 190).toLowerCase();
    if (resetLimit.hit(clientIp(req))) return res.sendStatus(204);
    const user = isEmail(email) ? await repo.findUserByEmail(email) : null;
    if (user) {
      const token = newToken();
      await repo.createReset({ tokenHash: sha256(token), userId: user.id, expiresAt: new Date(Date.now() + 3600e3) });
      config.onReset?.({ email, token });
    }
    res.sendStatus(204);
  }));
  r.post('/password/confirm', wrap(async (req, res) => {
    const { token, password } = req.body || {};
    if (typeof token !== 'string' || !strongPassword(password)) return res.status(400).json({ error: 'Datos no válidos' });
    const userId = await repo.consumeReset(sha256(token));
    if (!userId) return res.status(400).json({ error: 'El enlace expiró o ya se usó' });
    await repo.setPassword(userId, await hashPassword(password));
    await repo.deleteUserSessions(userId, '');
    res.sendStatus(204);
  }));

  // ---------- ajustes de tractores y lotes ----------
  const settings = (path, list, save) => {
    r.get(path, needAuth, wrap(async (_req, res) => res.json(await repo[list]())));
    r.put(`${path}/:id`, needAuth, wrap(async (req, res) => {
      const id = Number(req.params.id);
      const name = str(req.body?.name, 120);
      if (!Number.isInteger(id) || id < 1 || !name) return res.status(400).json({ error: 'Datos no válidos' });
      await repo[save]({ id, name, attributes: cleanAttributes(req.body?.attributes), userId: req.user.id });
      res.json({ id, name, attributes: cleanAttributes(req.body?.attributes) });
    }));
  };
  settings('/devices', 'deviceSettings', 'saveDeviceSettings');
  settings('/fences', 'fenceSettings', 'saveFenceSettings');

  // ---------- historial de combustible y velocidad ----------
  // Recibe posiciones de Traccar (o del script de sincronización). Ignora las repetidas.
  r.post('/samples', needIngest, wrap(async (req, res) => {
    const list = Array.isArray(req.body?.samples) ? req.body.samples : [];
    if (!list.length) return res.status(400).json({ error: 'Sin muestras' });
    if (list.length > 5000) return res.status(413).json({ error: 'Máximo 5000 muestras por envío' });
    const rows = [];
    for (const s of list) {
      const deviceId = Number(s?.deviceId);
      const fixTime = toDate(s?.fixTime);
      if (!Number.isInteger(deviceId) || deviceId < 1 || !fixTime) continue;
      const num = (v) => (Number.isFinite(Number(v)) && v !== null && v !== '' ? Number(v) : null);
      rows.push({
        deviceId,
        fixTime,
        latitude: num(s.latitude),
        longitude: num(s.longitude),
        speed: num(s.speed) ?? 0,
        fuel: num(s.fuel ?? s.attributes?.fuel),
        ignition: !!(s.ignition ?? s.attributes?.ignition),
      });
    }
    const inserted = await repo.insertSamples(rows);
    res.status(201).json({ received: list.length, valid: rows.length, inserted });
  }));

  r.get('/route', needAuth, wrap(async (req, res) => {
    const deviceId = Number(req.query.deviceId);
    const from = toDate(req.query.from);
    const to = toDate(req.query.to);
    if (!Number.isInteger(deviceId) || !from || !to || to < from) return res.status(400).json({ error: 'Parámetros no válidos' });
    if (to - from > 31 * DAY) return res.status(400).json({ error: 'El periodo máximo es de 31 días' });
    res.json(await repo.route(deviceId, from, to));
  }));

  r.get('/fuel-events', needAuth, wrap(async (req, res) => {
    const from = toDate(req.query.from);
    const to = toDate(req.query.to);
    if (!from || !to || to < from) return res.status(400).json({ error: 'Parámetros no válidos' });
    if (to - from > 31 * DAY) return res.status(400).json({ error: 'El periodo máximo es de 31 días' });
    const ids = []
      .concat(req.query.deviceId || [])
      .map(Number)
      .filter((n) => Number.isInteger(n) && n > 0)
      .slice(0, 500);
    res.json(await repo.fuelEvents({ from, to, deviceIds: ids }));
  }));

  // Resumen por tractor y día (consumo, cargas, descargas, velocidad y horas en movimiento), calculado aquí
  // para no mandar al navegador todas las muestras. Ej.: GET /fuel-summary?from=...&to=...&deviceId=1&deviceId=2
  r.get('/fuel-summary', needAuth, wrap(async (req, res) => {
    const from = toDate(req.query.from);
    const to = toDate(req.query.to);
    if (!from || !to || to < from) return res.status(400).json({ error: 'Parámetros no válidos' });
    if (to - from > 31 * DAY) return res.status(400).json({ error: 'El periodo máximo es de 31 días' });
    const ids = [].concat(req.query.deviceId || []).map(Number).filter((n) => Number.isInteger(n) && n > 0).slice(0, 500);
    res.json(summarizeSamples(await repo.samplesRange({ from, to, deviceIds: ids })));
  }));

  app.use('/api/panel', r);
  app.use((_req, res) => res.status(404).json({ error: 'No encontrado' }));
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON no válido' });
    if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'Cuerpo demasiado grande' });
    if (err?.status === 503) return res.status(503).json({ error: err.message });
    console.error('[api]', err);
    res.status(500).json({ error: 'Error interno' });
  });
  return app;
}
