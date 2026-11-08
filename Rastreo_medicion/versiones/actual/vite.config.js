import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // TRACCAR_PROXY_TARGET no lleva prefijo VITE_: solo lo usa el servidor de desarrollo
  // y nunca se incluye en el bundle.
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.TRACCAR_PROXY_TARGET || 'http://localhost:8082';

  return {
    server: {
      port: 5173,
      proxy: {
        '/api': { target, changeOrigin: true, ws: true },
      },
    },
    build: {
      target: 'es2022',
      chunkSizeWarningLimit: 800,
    },
  };
});
