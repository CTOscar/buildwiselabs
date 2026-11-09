// Contraseñas (scrypt, sin dependencias nativas), tokens de sesión, validaciones y límite de intentos.
import crypto from 'node:crypto';

const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 64;

const scrypt = (pw, salt, n = N, r = R, p = P) =>
  new Promise((resolve, reject) =>
    crypto.scrypt(pw, salt, KEYLEN, { N: n, r, p, maxmem: 64 * 1024 * 1024 }, (e, k) => (e ? reject(e) : resolve(k))),
  );

export async function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(pw, salt);
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${key.toString('base64')}`;
}

export async function verifyPassword(pw, stored) {
  const [alg, n, r, p, salt, hash] = String(stored || '').split('$');
  if (alg !== 'scrypt' || !hash) return false;
  const key = await scrypt(pw, Buffer.from(salt, 'base64'), Number(n), Number(r), Number(p));
  const want = Buffer.from(hash, 'base64');
  return key.length === want.length && crypto.timingSafeEqual(key, want);
}

export const newToken = () => crypto.randomBytes(32).toString('base64url');
export const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');

export const isEmail = (s) => typeof s === 'string' && s.length <= 190 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
// Misma regla que muestra el panel: 8 caracteres o más, con número y mayúscula.
export const strongPassword = (s) =>
  typeof s === 'string' && s.length >= 8 && s.length <= 200 && /\d/.test(s) && /[A-ZÁÉÍÓÚÑ]/.test(s);

/** Límite de intentos en memoria: máx. `max` en `windowMs` por clave. */
export function createLimiter(max, windowMs) {
  const hits = new Map();
  return {
    hit(key) {
      const now = Date.now();
      const list = (hits.get(key) || []).filter((t) => now - t < windowMs);
      list.push(now);
      hits.set(key, list);
      if (hits.size > 5000) {
        for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
      }
      return list.length > max;
    },
    reset(key) {
      hits.delete(key);
    },
  };
}
