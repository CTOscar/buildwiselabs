// Verifica la conexión a MySQL, crea las tablas y prueba cada consulta con datos temporales.
// Todo se hace dentro de una transacción que se deshace: no deja datos en la base.
// Uso:  npm run check:db
import { loadConfig } from '../src/config.mjs';
import { createPool, createRepo, migrate } from '../src/repo.mysql.mjs';
import { SCHEMA } from '../src/schema.mjs';

const config = loadConfig();
const pool = createPool(config);
let fail = 0;
const step = async (name, fn) => {
  try {
    const out = await fn();
    console.log(`  ok   ${name}${out === undefined ? '' : ` → ${out}`}`);
  } catch (e) {
    fail++;
    console.log(`  FALLA ${name}: ${e.code || ''} ${e.message}`);
  }
};

console.log(`Base: ${config.db.user}@${config.db.host}:${config.db.port}/${config.db.name}`);
await step('conexión', async () => (await pool.query('SELECT VERSION() AS v'))[0][0].v);
if (fail) {
  console.log('\nNo se pudo conectar: revisa DB_HOST, DB_USER, DB_PASSWORD y DB_NAME en el archivo .env');
  await pool.end().catch(() => {});
  process.exit(1);
}
await step(`crear ${SCHEMA.length} tablas`, () => migrate(pool));

// Las consultas de repo.mysql.js usan el pool; para deshacerlo todo se ejecutan en una conexión con transacción.
const conn = await pool.getConnection();
await conn.beginTransaction();
const txPool = { query: (...a) => conn.query(...a) };
const repo = createRepo(txPool);
try {
  let uid;
  await step('crear usuario', async () => (uid = await repo.createUser({ name: 'Prueba', email: 'prueba@check.local', phone: '', role: 'user', attributes: { puesto: 'x' }, passwordHash: 'h' })));
  await step('buscar por correo y por id', async () => (await repo.findUserByEmail('prueba@check.local')).id === uid && (await repo.findUserById(uid)).name);
  await step('actualizar perfil', () => repo.updateUser(uid, { name: 'Prueba 2', email: 'prueba@check.local', phone: '1', attributes: { puesto: 'y' } }));
  await step('rol, contraseña y último acceso', async () => {
    await repo.setRole(uid, 'admin');
    await repo.setPassword(uid, 'h2');
    await repo.touchLogin(uid);
  });
  await step('listar usuarios', async () => (await repo.listUsers()).length);
  await step('sesión: crear, leer, borrar', async () => {
    await repo.createSession({ tokenHash: 'a'.repeat(64), userId: uid, expiresAt: new Date(Date.now() + 60e3), ip: '127.0.0.1', userAgent: 'check' });
    const u = await repo.findSessionUser('a'.repeat(64));
    await repo.deleteUserSessions(uid, '');
    return u?.id === uid ? 'leída' : 'NO se leyó';
  });
  await step('recuperar contraseña', async () => {
    await repo.createReset({ tokenHash: 'b'.repeat(64), userId: uid, expiresAt: new Date(Date.now() + 60e3) });
    return (await repo.consumeReset('b'.repeat(64))) === uid && (await repo.consumeReset('b'.repeat(64))) === null ? 'una sola vez' : 'NO funcionó';
  });
  await step('bitácora de accesos', async () => {
    await repo.logLogin({ userId: uid, email: 'prueba@check.local', ok: true, ip: '127.0.0.1', userAgent: 'check' });
    return (await repo.loginLog(5)).length;
  });
  await step('cuentas de Google: ligar, reconocer por id, actualizar correo', async () => {
    await repo.linkOAuth({ userId: uid, provider: 'google', uid: 'check-sub-1', email: 'a@gmail.com' });
    await repo.linkOAuth({ userId: uid, provider: 'google', uid: 'check-sub-1', email: 'b@gmail.com' });
    const row = await repo.findOAuth('google', 'check-sub-1');
    const list = (await repo.listOAuth()).filter((o) => o.userId === uid);
    return row?.email === 'b@gmail.com' && list.length === 1 ? 'ok (1 fila, correo actualizado)' : 'NO funcionó';
  });
  await step('foto de perfil: guardar, reemplazar, leer, borrar', async () => {
    await repo.savePhoto(uid, 'image/png', Buffer.from([0x89, 0x50, 0x4e, 0x47, 1]));
    await repo.savePhoto(uid, 'image/jpeg', Buffer.from([0xff, 0xd8, 0xff, 2]));
    const p = await repo.getPhoto(uid);
    await repo.deletePhoto(uid);
    return p?.mime === 'image/jpeg' && p.data.length === 4 && (await repo.getPhoto(uid)) === null ? 'ok' : 'NO funcionó';
  });
  await step('ajustes de tractor y lote', async () => {
    await repo.saveDeviceSettings({ id: 999999, name: 'TRC-CHECK', attributes: { nivel: 'A' }, userId: uid });
    await repo.saveFenceSettings({ id: 999999, name: 'Lote check', attributes: { cultivo: 'Tomate' }, userId: uid });
    return `${(await repo.deviceSettings()).some((d) => d.id === 999999)} / ${(await repo.fenceSettings()).some((d) => d.id === 999999)}`;
  });
  await step('historial, ruta y eventos de combustible (LAG)', async () => {
    const t0 = Date.parse('2026-01-01T00:00:00Z');
    const rows = [200, 198, 150, 240].map((fuel, i) => ({ deviceId: 999999, fixTime: new Date(t0 + i * 300e3), latitude: 23, longitude: -105, speed: i === 3 ? 3 : 0, fuel, ignition: false }));
    const n = await repo.insertSamples(rows);
    const route = await repo.route(999999, new Date(t0 - 1), new Date(t0 + 3600e3));
    const ev = await repo.fuelEvents({ from: new Date(t0 - 1), to: new Date(t0 + 3600e3), deviceIds: [999999] });
    return `${n} guardadas, ${route.length} en ruta, eventos: ${ev.map((e) => `${e.type} ${e.liters} L`).join(', ')}`;
  });
} finally {
  await conn.rollback();
  conn.release();
}
await pool.end();
console.log(fail ? `\n${fail} verificación(es) fallaron.` : '\nTodo correcto. No se dejó ningún dato de prueba.');
process.exit(fail ? 1 : 0);
