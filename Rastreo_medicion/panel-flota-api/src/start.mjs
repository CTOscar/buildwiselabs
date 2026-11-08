// Arranque de la API. El servidor HTTP se levanta primero y la base de datos se conecta después:
// si la base falla, /api/panel/health responde con el motivo (en lugar de que Hostinger muestre un 503 mudo).
import { loadConfig } from './config.mjs';
import { createPool, createRepo, migrate } from './repo.mysql.mjs';
import { createApp } from './app.mjs';

const config = loadConfig();
const status = { ready: false, error: null };

// Mientras la base no esté lista, cualquier consulta falla con un error controlado (503), no con un cierre del proceso.
const notReady = () => {
  const e = new Error('Base de datos no disponible');
  e.status = 503;
  throw e;
};
let real = null;
const repo = new Proxy(
  {},
  {
    get: (_t, name) => (name === 'publicUser' ? (u) => real?.publicUser(u) : (...a) => (real ? real[name](...a) : notReady())),
  },
);

config.onReset = ({ email, token }) => console.log(`[recuperar] ${email}: token ${token} (válido 1 hora)`);
if (config.production && !config.allowedOrigins.length) console.warn('ALLOWED_ORIGINS está vacío: ningún sitio podrá llamar a la API desde el navegador.');
if (!config.ingestKey) console.warn('INGEST_KEY vacío: el envío de historial solo funcionará con una sesión iniciada.');

createApp({ repo, config, status: () => status }).listen(config.port, () => console.log(`API del panel escuchando en el puerto ${config.port}`));

(async () => {
  const faltan = ['user', 'name'].filter((k) => !config.db[k]).map((k) => `DB_${k.toUpperCase()}`);
  if (faltan.length) {
    status.error = `Falta configurar ${faltan.join(' y ')}`;
    console.error(status.error);
    return;
  }
  try {
    const pool = createPool(config);
    await migrate(pool);
    real = createRepo(pool);
    status.ready = true;
    console.log('Base de datos conectada y tablas verificadas');
    setInterval(() => real.purgeExpired().catch((e) => console.error('[limpieza]', e.message)), 6 * 3600e3).unref();
  } catch (e) {
    // Solo el código (p. ej. ER_ACCESS_DENIED_ERROR, ECONNREFUSED): nunca usuario ni contraseña.
    status.error = e.code || 'ERROR_BASE_DE_DATOS';
    console.error('No se pudo conectar a MySQL:', e.code || '', e.message);
  }
})();
