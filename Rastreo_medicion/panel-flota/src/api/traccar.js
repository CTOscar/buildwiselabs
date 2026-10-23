// Cliente de Traccar (solo consumo desde el front).
// Endpoints habituales de la API REST de Traccar: confirmar contra la versión instalada.
import { config } from '../config.js';

const base = () => config.apiBase;

async function request(path, { method = 'GET', body, headers = {} } = {}) {
  const res = await fetch(base() + path, {
    method,
    body,
    credentials: 'include',
    headers: { Accept: 'application/json', ...headers },
  });
  // Traccar responde 404 en GET /api/session cuando no hay sesión.
  if (res.status === 401 || (res.status === 404 && path === '/api/session')) {
    throw Object.assign(new Error('Sesión no válida'), { status: 401 });
  }
  if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });
  const type = res.headers.get('content-type') || '';
  return type.includes('json') ? res.json() : null;
}

function rangeParams(deviceIds, from, to) {
  const p = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
  deviceIds.forEach((id) => p.append('deviceId', id));
  return p;
}

export function createTraccarClient() {
  return {
    mode: 'live',
    getSession: () => request('/api/session'),
    login: (email, password) =>
      request('/api/session', {
        method: 'POST',
        body: new URLSearchParams({ email, password }),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }),
    logout: () => request('/api/session', { method: 'DELETE' }),
    // Registro: requiere tener activado el registro de usuarios en el servidor Traccar.
    register: (user) =>
      request('/api/users', {
        method: 'POST',
        body: JSON.stringify(user),
        headers: { 'Content-Type': 'application/json' },
      }),
    // Envía correo de recuperación (requiere correo SMTP configurado en Traccar).
    resetPassword: (email) =>
      request('/api/password/reset', {
        method: 'POST',
        body: new URLSearchParams({ email }),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }),
    updateUser: (user) =>
      request(`/api/users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify(user),
        headers: { 'Content-Type': 'application/json' },
      }),
    // Inicio con Google vía OpenID Connect (configurado en traccar.xml).
    openIdUrl: () => base() + '/api/session/openid/auth',
    getDevices: () => request('/api/devices'),
    // Ajustes del tractor: nombre y attributes (nivel, sonda, operador, mantenimiento…).
    updateDevice: (d) =>
      request(`/api/devices/${d.id}`, {
        method: 'PUT',
        body: JSON.stringify(d),
        headers: { 'Content-Type': 'application/json' },
      }),
    getPositions: () => request('/api/positions'),
    getGeofences: () => request('/api/geofences'),
    // Ajustes del lote: se guardan en attributes de la geocerca (cultivo, superficie, color, alertas…).
    updateGeofence: (g) =>
      request(`/api/geofences/${g.id}`, {
        method: 'PUT',
        body: JSON.stringify(g),
        headers: { 'Content-Type': 'application/json' },
      }),
    // Resumen del día por tractor: incluye engineHours (ms).
    getSummary: (ids, from, to) => request('/api/reports/summary?' + rangeParams(ids, from, to)),
    getEvents: (ids, from, to) => {
      const p = rangeParams(ids, from, to);
      p.append('type', 'allEvents');
      return request('/api/reports/events?' + p);
    },

    // Tiempo real: WebSocket /api/socket (requiere sesión). Reconexión con backoff exponencial.
    connect(onMessage, onStatus) {
      let ws;
      let retry = 0;
      let timer;
      let closed = false;
      const url = () => (base() || location.origin).replace(/^http/, 'ws') + '/api/socket';

      const open = () => {
        onStatus('connecting');
        ws = new WebSocket(url());
        ws.onopen = () => {
          retry = 0;
          onStatus('online');
        };
        ws.onmessage = (e) => {
          try {
            onMessage(JSON.parse(e.data));
          } catch {
            /* mensaje no JSON: se ignora */
          }
        };
        ws.onerror = () => ws.close();
        ws.onclose = () => {
          if (closed) return;
          onStatus('reconnecting');
          const delay = Math.min(30000, 1000 * 2 ** retry++) + Math.random() * 500;
          timer = setTimeout(open, delay);
        };
      };

      open();
      return () => {
        closed = true;
        clearTimeout(timer);
        ws?.close();
      };
    },
  };
}
