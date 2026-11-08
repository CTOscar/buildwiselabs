import 'dotenv/config';

const list = (v) =>
  String(v || '')
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean);

// Lee una variable de entorno por cualquiera de sus nombres, sin distinguir mayúsculas de minúsculas.
// Así acepta DB_NAME o name_database, DB_USER o user_database, etc.
function pick(env, ...names) {
  const wanted = names.map((n) => n.toLowerCase());
  for (const w of wanted) {
    const key = Object.keys(env).find((k) => k.toLowerCase() === w);
    if (key && String(env[key]).trim() !== '') return String(env[key]).trim();
  }
  return '';
}

export function loadConfig(env = process.env) {
  return {
    port: Number(env.PORT) || 3000,
    production: env.NODE_ENV === 'production',
    db: {
      host: pick(env, 'DB_HOST', 'host_database') || 'localhost',
      port: Number(pick(env, 'DB_PORT', 'port_database')) || 3306,
      user: pick(env, 'DB_USER', 'user_database'),
      // La contraseña no se recorta: puede llevar espacios al inicio o al final a propósito.
      password: (() => {
        const names = ['DB_PASSWORD', 'password_database', 'pass_database'].map((n) => n.toLowerCase());
        const key = Object.keys(env).find((k) => names.includes(k.toLowerCase()) && env[k] !== '');
        return key ? String(env[key]) : '';
      })(),
      name: pick(env, 'DB_NAME', 'name_database'),
    },
    allowedOrigins: list(env.ALLOWED_ORIGINS),
    ingestKey: env.INGEST_KEY || '',
    // Acceso con Google / Apple (opcional). Sin credenciales completas, esos botones quedan apagados.
    publicApiUrl: (env.PUBLIC_API_URL || '').replace(/\/$/, ''),
    panelUrl: (env.PANEL_URL || '').replace(/\/$/, ''),
    oauth: {
      google: { clientId: env.GOOGLE_CLIENT_ID || '', clientSecret: env.GOOGLE_CLIENT_SECRET || '' },
      apple: { clientId: env.APPLE_CLIENT_ID || '', teamId: env.APPLE_TEAM_ID || '', keyId: env.APPLE_KEY_ID || '', privateKey: env.APPLE_PRIVATE_KEY || '' },
    },
  };
}
