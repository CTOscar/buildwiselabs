// En Vite, import.meta.env trae las variables VITE_*; en las pruebas (Jest) no existe.
const env = import.meta.env || {};

export const config = {
  // Por defecto simulado: el backend se implementa después.
  useMock: env.VITE_USE_MOCK !== 'false',
  apiBase: (env.VITE_TRACCAR_URL || '').replace(/\/$/, ''),
  // API propia del panel (/api/panel): cuentas, perfil, foto, ajustes e historial.
  // 'same-origin' = misma dirección que el panel; vacío = sin API (solo Traccar/mock).
  panelApi: env.VITE_PANEL_API_URL === 'same-origin' ? '/' : (env.VITE_PANEL_API_URL || '').replace(/\/$/, ''),
  tz: 'America/Mazatlan',
  // Sin reporte en este tiempo = "sin señal". Detenido reporta cada 30 min.
  offlineAfterMin: 35,
};
