// Capa de datos sobre MySQL. Todas las consultas usan parámetros (nunca se arma SQL con texto del usuario).
import mysql from 'mysql2/promise';
import { SCHEMA } from './schema.mjs';

export function createPool(cfg) {
  return mysql.createPool({
    host: cfg.db.host,
    port: cfg.db.port,
    user: cfg.db.user,
    password: cfg.db.password,
    database: cfg.db.name,
    waitForConnections: true,
    connectionLimit: 8,
    timezone: 'Z', // fechas guardadas y leídas en UTC
    charset: 'utf8mb4',
  });
}

export async function migrate(pool) {
  for (const sql of SCHEMA) await pool.query(sql);
}

const parseJson = (v) => {
  if (v == null) return {};
  if (typeof v === 'object') return v;
  try {
    return JSON.parse(v);
  } catch {
    return {};
  }
};

const userRow = (r) =>
  r && {
    id: r.id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    role: r.role,
    attributes: parseJson(r.attributes),
    createdAt: r.created_at,
    lastLoginAt: r.last_login_at,
  };

export function createRepo(pool) {
  const q = async (sql, params) => (await pool.query(sql, params))[0];

  return {
    ping: async () => {
      await q('SELECT 1');
      return true;
    },

    // ---------- usuarios ----------
    countUsers: async () => (await q('SELECT COUNT(*) AS n FROM users'))[0].n,
    createUser: async ({ name, email, phone, role, attributes, passwordHash }) => {
      const r = await q('INSERT INTO users (name, email, phone, role, attributes, password_hash) VALUES (?, ?, ?, ?, ?, ?)', [
        name,
        email,
        phone || '',
        role || 'user',
        JSON.stringify(attributes || {}),
        passwordHash,
      ]);
      return r.insertId;
    },
    findUserByEmail: async (email) => (await q('SELECT * FROM users WHERE email = ? LIMIT 1', [email]))[0] || null,
    findUserById: async (id) => (await q('SELECT * FROM users WHERE id = ? LIMIT 1', [id]))[0] || null,
    publicUser: userRow,
    updateUser: async (id, { name, email, phone, attributes }) => {
      await q('UPDATE users SET name = ?, email = ?, phone = ?, attributes = ? WHERE id = ?', [name, email, phone || '', JSON.stringify(attributes || {}), id]);
    },
    setPassword: async (id, passwordHash) => {
      await q('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, id]);
    },
    setRole: async (id, role) => {
      await q('UPDATE users SET role = ? WHERE id = ?', [role, id]);
    },
    touchLogin: async (id) => {
      await q('UPDATE users SET last_login_at = UTC_TIMESTAMP(3) WHERE id = ?', [id]);
    },
    listUsers: async () => (await q('SELECT * FROM users ORDER BY id')).map(userRow),

    // ---------- sesiones ----------
    createSession: async ({ tokenHash, userId, expiresAt, ip, userAgent }) => {
      await q('INSERT INTO sessions (token_hash, user_id, expires_at, ip, user_agent) VALUES (?, ?, ?, ?, ?)', [tokenHash, userId, expiresAt, ip || null, (userAgent || '').slice(0, 255)]);
    },
    findSessionUser: async (tokenHash) => {
      const rows = await q(
        'SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > UTC_TIMESTAMP(3) LIMIT 1',
        [tokenHash],
      );
      return rows[0] || null;
    },
    deleteSession: async (tokenHash) => {
      await q('DELETE FROM sessions WHERE token_hash = ?', [tokenHash]);
    },
    deleteUserSessions: async (userId, exceptHash) => {
      await q('DELETE FROM sessions WHERE user_id = ? AND token_hash <> ?', [userId, exceptHash || '']);
    },
    purgeExpired: async () => {
      await q('DELETE FROM sessions WHERE expires_at <= UTC_TIMESTAMP(3)');
      await q('DELETE FROM password_resets WHERE expires_at <= UTC_TIMESTAMP(3)');
    },

    // ---------- recuperar contraseña ----------
    createReset: async ({ tokenHash, userId, expiresAt }) => {
      await q('INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES (?, ?, ?)', [tokenHash, userId, expiresAt]);
    },
    consumeReset: async (tokenHash) => {
      const rows = await q('SELECT user_id FROM password_resets WHERE token_hash = ? AND used_at IS NULL AND expires_at > UTC_TIMESTAMP(3) LIMIT 1', [tokenHash]);
      if (!rows[0]) return null;
      const r = await q('UPDATE password_resets SET used_at = UTC_TIMESTAMP(3) WHERE token_hash = ? AND used_at IS NULL', [tokenHash]);
      return r.affectedRows ? rows[0].user_id : null;
    },

    // ---------- bitácora de accesos ----------
    logLogin: async ({ userId, email, ok, ip, userAgent }) => {
      await q('INSERT INTO login_log (user_id, email, ok, ip, user_agent) VALUES (?, ?, ?, ?, ?)', [userId || null, String(email).slice(0, 190), ok ? 1 : 0, ip || null, (userAgent || '').slice(0, 255)]);
    },
    loginLog: async (limit = 100) =>
      (await q('SELECT id, user_id AS userId, email, ok, ip, created_at AS createdAt FROM login_log ORDER BY id DESC LIMIT ?', [Math.min(Number(limit) || 100, 500)])).map((r) => ({ ...r, ok: !!r.ok })),

    // ---------- cuentas de Google / Apple ----------
    findOAuth: async (provider, uid) => (await q('SELECT * FROM oauth_accounts WHERE provider = ? AND provider_uid = ? LIMIT 1', [provider, uid]))[0] || null,
    // Registra la cuenta del proveedor la primera vez; las siguientes solo actualiza el correo y el último acceso.
    linkOAuth: async ({ userId, provider, uid, email }) => {
      await q(
        'INSERT INTO oauth_accounts (user_id, provider, provider_uid, email, last_login_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP(3)) ON DUPLICATE KEY UPDATE email = VALUES(email), last_login_at = CURRENT_TIMESTAMP(3)',
        [userId, provider, uid, String(email).slice(0, 190)],
      );
    },
    listOAuth: async () =>
      q(
        'SELECT o.id, o.provider, o.email, o.user_id AS userId, u.name, o.created_at AS createdAt, o.last_login_at AS lastLoginAt FROM oauth_accounts o JOIN users u ON u.id = o.user_id ORDER BY o.id DESC LIMIT 500',
      ),

    // ---------- foto de perfil (una por cuenta) ----------
    savePhoto: async (userId, mime, data) => {
      await q('INSERT INTO user_photos (user_id, mime, data) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE mime = VALUES(mime), data = VALUES(data)', [userId, mime, data]);
    },
    getPhoto: async (userId) => {
      const r = (await q('SELECT mime, data, updated_at AS updatedAt FROM user_photos WHERE user_id = ? LIMIT 1', [userId]))[0];
      return r ? { mime: r.mime, data: Buffer.from(r.data), updatedAt: r.updatedAt } : null;
    },
    deletePhoto: async (userId) => {
      await q('DELETE FROM user_photos WHERE user_id = ?', [userId]);
    },

    // ---------- ajustes de tractores y lotes ----------
    deviceSettings: async () => (await q('SELECT device_id AS id, name, attributes FROM device_settings')).map((r) => ({ id: r.id, name: r.name, attributes: parseJson(r.attributes) })),
    saveDeviceSettings: async ({ id, name, attributes, userId }) => {
      await q(
        'INSERT INTO device_settings (device_id, name, attributes, updated_by) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), attributes = VALUES(attributes), updated_by = VALUES(updated_by)',
        [id, name, JSON.stringify(attributes || {}), userId || null],
      );
    },
    fenceSettings: async () => (await q('SELECT fence_id AS id, name, attributes FROM fence_settings')).map((r) => ({ id: r.id, name: r.name, attributes: parseJson(r.attributes) })),
    saveFenceSettings: async ({ id, name, attributes, userId }) => {
      await q(
        'INSERT INTO fence_settings (fence_id, name, attributes, updated_by) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), attributes = VALUES(attributes), updated_by = VALUES(updated_by)',
        [id, name, JSON.stringify(attributes || {}), userId || null],
      );
    },

    // ---------- historial de posiciones, combustible y velocidad ----------
    insertSamples: async (rows) => {
      if (!rows.length) return 0;
      const values = rows.map((s) => [s.deviceId, s.fixTime, s.latitude, s.longitude, s.speed, s.fuel, s.ignition ? 1 : 0]);
      const r = await q('INSERT IGNORE INTO position_samples (device_id, fix_time, lat, lon, speed_knots, fuel, ignition) VALUES ?', [values]);
      return r.affectedRows;
    },
    route: async (deviceId, from, to) =>
      (await q('SELECT device_id, fix_time, lat, lon, speed_knots, fuel, ignition FROM position_samples WHERE device_id = ? AND fix_time BETWEEN ? AND ? ORDER BY fix_time LIMIT 20000', [deviceId, from, to])).map((r) => ({
        deviceId: r.device_id,
        fixTime: new Date(r.fix_time).toISOString(),
        latitude: r.lat,
        longitude: r.lon,
        speed: r.speed_knots,
        attributes: { ...(r.fuel != null ? { fuel: r.fuel } : {}), ignition: !!r.ignition },
      })),
    // Muestras crudas de varios tractores en un rango, ordenadas por tractor y hora (para el resumen de combustible).
    samplesRange: async ({ from, to, deviceIds }) =>
      (
        await q(
          `SELECT device_id, fix_time, speed_knots, fuel FROM position_samples
           WHERE fix_time BETWEEN ? AND ? ${deviceIds?.length ? 'AND device_id IN (?)' : ''}
           ORDER BY device_id, fix_time LIMIT 3000000`,
          [from, to, ...(deviceIds?.length ? [deviceIds] : [])],
        )
      ).map((r) => ({ deviceId: r.device_id, fixTime: r.fix_time, speed: r.speed_knots, fuel: r.fuel })),
    // Cargas (sube >= minL) y descargas (baja >= minL con el tractor detenido) calculadas en la base.
    fuelEvents: async ({ from, to, deviceIds, minL = 20 }) => {
      const rows = await q(
        `SELECT device_id, fix_time, lat, lon, speed_knots, fuel, prev FROM (
           SELECT device_id, fix_time, lat, lon, speed_knots, fuel,
                  LAG(fuel) OVER (PARTITION BY device_id ORDER BY fix_time) AS prev
           FROM position_samples
           WHERE fix_time BETWEEN ? AND ? ${deviceIds?.length ? 'AND device_id IN (?)' : ''}
         ) t
         WHERE prev IS NOT NULL AND fuel IS NOT NULL
           AND ((prev - fuel >= ? AND speed_knots * 1.852 < 1) OR (fuel - prev >= ?))
         ORDER BY fix_time`,
        [from, to, ...(deviceIds?.length ? [deviceIds] : []), minL, minL],
      );
      return rows.map((r) => ({
        deviceId: r.device_id,
        eventTime: new Date(r.fix_time).toISOString(),
        type: r.prev - r.fuel > 0 ? 'drain' : 'refuel',
        liters: Math.round(Math.abs(r.prev - r.fuel)),
        latitude: r.lat,
        longitude: r.lon,
      }));
    },
  };
}
