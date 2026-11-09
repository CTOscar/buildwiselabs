import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import { createPanelClient } from '../../../src/api/panel.js';
import { createClient, mergeSettings } from '../../../src/api/index.js';

const json = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });

let fetchMock;
beforeEach(() => {
  fetchMock = jest.fn();
  globalThis.fetch = fetchMock;
});
afterEach(() => {
  delete globalThis.fetch;
});

describe('cliente de la API del panel', () => {
  test('login manda JSON con cookie de sesión', async () => {
    fetchMock.mockResolvedValue(json({ id: 1, email: 'a@b.mx' }));
    const c = createPanelClient('https://api.example.mx/');
    const user = await c.login('a@b.mx', 'Clave1234', true);
    expect(user.id).toBe(1);
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.example.mx/api/panel/login');
    expect(opts.method).toBe('POST');
    expect(opts.credentials).toBe('include');
    expect(JSON.parse(opts.body)).toEqual({ email: 'a@b.mx', password: 'Clave1234', remember: true });
  });

  test('base "/" apunta a /api/panel del mismo origen', async () => {
    fetchMock.mockResolvedValue(json({ ok: true }));
    await createPanelClient('/').getSession();
    expect(fetchMock.mock.calls[0][0]).toBe('/api/panel/session');
  });

  test('401 llega como error con status y mensaje de la API', async () => {
    fetchMock.mockResolvedValue(json({ error: 'No autorizado' }, 401));
    await expect(createPanelClient('/').getSession()).rejects.toMatchObject({ status: 401, message: 'No autorizado' });
  });

  test('204 devuelve null (cerrar sesión)', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 204, json: async () => null });
    await expect(createPanelClient('/').logout()).resolves.toBeNull();
  });

  test('sin red: error con status 0', async () => {
    fetchMock.mockRejectedValue(new TypeError('fallo'));
    await expect(createPanelClient('/').getSession()).rejects.toMatchObject({ status: 0 });
  });

  test('updateUser solo manda la contraseña si viene', async () => {
    fetchMock.mockResolvedValue(json({ id: 3 }));
    const c = createPanelClient('/');
    await c.updateUser({ id: 3, name: 'Ana', email: 'a@b.mx', phone: '1', attributes: {}, role: 'admin' });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).not.toHaveProperty('password');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).not.toHaveProperty('role');
    await c.updateUser({ id: 3, name: 'Ana', email: 'a@b.mx', password: 'Nueva1234' });
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).password).toBe('Nueva1234');
  });

  test('getRoute codifica las fechas en ISO', async () => {
    fetchMock.mockResolvedValue(json([]));
    await createPanelClient('/').getRoute(7, new Date('2026-11-08T00:00:00Z'), new Date('2026-11-08T12:00:00Z'));
    expect(fetchMock.mock.calls[0][0]).toBe(
      '/api/panel/route?deviceId=7&from=2026-11-08T00%3A00%3A00.000Z&to=2026-11-08T12%3A00%3A00.000Z',
    );
  });

  test('getPhoto devuelve null si no hay foto', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404 });
    await expect(createPanelClient('/').getPhoto(1)).resolves.toBeNull();
  });
});

describe('cliente combinado (Traccar/mock + API del panel)', () => {
  test('sin API del panel devuelve el cliente base sin cambios', () => {
    const c = createClient('');
    expect(c.panel).toBeUndefined();
    expect(c.mode).toBe('mock');
  });

  test('con API: sesión y cuentas salen del panel; los ajustes se mezclan con los del mock', async () => {
    const c = createClient('/');
    expect(c.panel).toBeDefined();
    const devices = await c.getDevices.call(c).catch(() => null);
    expect(devices).not.toBeNull(); // si el panel falla, usa solo los datos del mock
    fetchMock.mockResolvedValue(json({ id: 9 }));
    await c.getSession();
    expect(fetchMock.mock.calls.at(-1)[0]).toBe('/api/panel/session');
  });

  test('mergeSettings respeta nombre y mezcla attributes', () => {
    const merged = mergeSettings(
      [{ id: 1, name: 'A', attributes: { x: 1, y: 2 } }, { id: 2, name: 'B', attributes: {} }],
      [{ id: 1, name: 'Renombrado', attributes: { y: 9 } }],
    );
    expect(merged[0]).toEqual({ id: 1, name: 'Renombrado', attributes: { x: 1, y: 9 } });
    expect(merged[1].name).toBe('B');
  });
});
