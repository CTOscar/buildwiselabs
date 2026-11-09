import { config } from '../config.js';
import { createTraccarClient } from './traccar.js';
import { createMockClient } from './mock.js';
import { createPanelClient } from './panel.js';

// Une los ajustes guardados en la API del panel (nombre y attributes) con los datos de Traccar/mock.
export function mergeSettings(base, saved) {
  const byId = new Map(saved.map((x) => [x.id, x]));
  return base.map((x) => (byId.has(x.id) ? { ...x, name: byId.get(x.id).name, attributes: { ...x.attributes, ...byId.get(x.id).attributes } } : x));
}

// Sin API del panel (VITE_PANEL_API_URL vacío) devuelve el cliente de Traccar/mock tal cual.
// Con API: cuentas, perfil, foto, ajustes e historial salen de ahí; posiciones en vivo, de Traccar.
export function createClient(panelBase = config.panelApi) {
  const base = config.useMock ? createMockClient() : createTraccarClient();
  if (!panelBase) return base;

  const panel = createPanelClient(panelBase);
  const orElse = async (promise, fallback) => {
    try {
      return await promise;
    } catch {
      return fallback;
    }
  };

  return {
    ...base,
    panel,
    getSession: () => panel.getSession(),
    getPhoto: (id) => panel.getPhoto(id),
    setPhoto: (id, image) => panel.setPhoto(id, image),
    removePhoto: (id) => panel.removePhoto(id),
    socialUrl: (p) => panel.socialUrl(p),
    socialProviders: () => panel.providers(),
    login: (email, password, remember) => panel.login(email, password, remember),
    logout: () => panel.logout(),
    register: (u) => panel.register(u),
    resetPassword: (email) => panel.resetPassword(email),
    updateUser: (u) => panel.updateUser(u),
    listUsers: () => panel.listUsers(),
    setRole: (id, role) => panel.setRole(id, role),
    getDevices: async () => mergeSettings(await base.getDevices(), await orElse(panel.getDevices(), [])),
    updateDevice: async (d) => {
      const out = await base.updateDevice(d);
      await panel.saveDevice(d);
      return out;
    },
    getGeofences: async () => mergeSettings(await base.getGeofences(), await orElse(panel.getFences(), [])),
    updateGeofence: async (g) => {
      const out = await base.updateGeofence(g);
      await panel.saveFence(g);
      return out;
    },
    getRoute: async (id, from, to) => {
      const rows = await orElse(panel.getRoute(id, from, to), []);
      return rows.length || typeof base.getRoute !== 'function' ? rows : base.getRoute(id, from, to);
    },
  };
}
