// Arranca la API con la base EN MEMORIA (sin MySQL), solo para probar el panel en tu computadora.
// Los datos se pierden al detenerla. Para guardar de verdad usa `npm start` con MySQL.
import { loadConfig } from '../src/config.mjs'; // carga también el .env (acceso con Google/Apple)
import { createApp } from '../src/app.mjs';
import { createFakeRepo } from '../test/fake-repo.mjs';

const port = Number(process.env.PORT) || 3000;
const config = {
  ...loadConfig(),
  production: false,
  allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:5174').split(',').map((s) => s.trim()),
  ingestKey: process.env.INGEST_KEY || 'dev-ingest-key',
  onReset: ({ email, token }) => console.log(`[recuperar] ${email}: token ${token}`),
};
createApp({ repo: createFakeRepo(), config }).listen(port, () => console.log(`API en memoria (sin MySQL) en http://localhost:${port}`));
