import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import { createMockClient } from '../../../src/api/mock.js';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('cliente simulado: flota', () => {
  test('85 tractores, 55 de nivel A y 30 de nivel B', async () => {
    const c = createMockClient();
    const devices = await c.getDevices();
    expect(devices).toHaveLength(85);
    expect(devices.filter((d) => d.attributes.nivel === 'A')).toHaveLength(55);
    expect(devices.filter((d) => d.attributes.nivel === 'B')).toHaveLength(30);
    expect(devices[0].name).toBe('TRC-0001');
  });

  test('cada tractor tiene posición y está dentro de una geocerca', async () => {
    const c = createMockClient();
    const [positions, fences] = await Promise.all([c.getPositions(), c.getGeofences()]);
    expect(positions).toHaveLength(85);
    const ids = new Set(fences.map((f) => f.id));
    positions.forEach((p) => expect(ids.has(p.geofenceIds[0])).toBe(true));
    expect(fences[0].area).toMatch(/^POLYGON\(\(/);
  });

  test('las respuestas son copias (no se modifica el estado interno)', async () => {
    const c = createMockClient();
    const a = await c.getDevices();
    a[0].name = 'cambiado';
    const b = await c.getDevices();
    expect(b[0].name).toBe('TRC-0001');
  });
});

describe('cliente simulado: sesión y cuentas', () => {
  test('sin sesión responde 401', async () => {
    const c = createMockClient();
    await expect(c.getSession()).rejects.toMatchObject({ status: 401 });
  });

  test('entra con la cuenta demo y no expone la contraseña', async () => {
    const c = createMockClient();
    const user = await c.login('demo@buildwiselabs.mx', 'demo1234');
    expect(user.email).toBe('demo@buildwiselabs.mx');
    expect(user).not.toHaveProperty('password');
    await expect(c.getSession()).resolves.toMatchObject({ email: 'demo@buildwiselabs.mx' });
  });

  test('contraseña incorrecta responde 401', async () => {
    const c = createMockClient();
    await expect(c.login('demo@buildwiselabs.mx', 'mala')).rejects.toMatchObject({ status: 401 });
  });

  test('registro nuevo, correo repetido responde 400', async () => {
    const c = createMockClient();
    const u = await c.register({ name: 'Prueba', email: 'nuevo@empresa.mx', password: 'Clave12345', attributes: {} });
    expect(u.id).toBeGreaterThan(1);
    await expect(c.register({ name: 'Otro', email: 'NUEVO@empresa.mx', password: 'x', attributes: {} })).rejects.toMatchObject({ status: 400 });
  });

  test('actualizar perfil conserva la contraseña si no se envía', async () => {
    const c = createMockClient();
    const u = await c.login('demo@buildwiselabs.mx', 'demo1234');
    await c.updateUser({ ...u, name: 'Nombre Nuevo' });
    await c.logout();
    await expect(c.login('demo@buildwiselabs.mx', 'demo1234')).resolves.toMatchObject({ name: 'Nombre Nuevo' });
  });

  test('cerrar sesión borra la sesión', async () => {
    const c = createMockClient();
    await c.login('demo@buildwiselabs.mx', 'demo1234');
    await c.logout();
    await expect(c.getSession()).rejects.toMatchObject({ status: 401 });
  });
});

describe('cliente simulado: tiempo real', () => {
  afterEach(() => jest.useRealTimers());

  test('emite posiciones cada 2 s y avisa conexión', () => {
    jest.useFakeTimers();
    const c = createMockClient();
    const onMessage = jest.fn();
    const onStatus = jest.fn();
    const stop = c.connect(onMessage, onStatus);
    expect(onStatus).toHaveBeenCalledWith('connecting');
    jest.advanceTimersByTime(2000);
    expect(onStatus).toHaveBeenCalledWith('online');
    expect(onMessage).toHaveBeenCalledTimes(1);
    const msg = onMessage.mock.calls[0][0];
    expect(Array.isArray(msg.positions)).toBe(true);
    expect(msg.positions.length).toBeGreaterThan(0);
    stop();
    jest.advanceTimersByTime(10000);
    expect(onMessage).toHaveBeenCalledTimes(1);
  });
});

describe('cliente simulado: recorrido por surcos', () => {
  afterEach(() => jest.useRealTimers());

  test('el tractor simulado reporta cada tick, encendido y dentro de su lote', async () => {
    jest.useFakeTimers();
    const c = createMockClient();
    const fences = await (async () => {
      const p = c.getGeofences();
      jest.advanceTimersByTime(300);
      return p;
    })();
    const msgs = [];
    const stop = c.connect((m) => msgs.push(m), () => {});
    await c.simulateRoute(5, 4);
    jest.advanceTimersByTime(2000 * 40);
    stop();
    const mine = msgs.flatMap((m) => m.positions).filter((p) => p.deviceId === 5);
    expect(mine.length).toBeGreaterThanOrEqual(40);
    const fence = fences.find((f) => f.id === mine[0].geofenceIds[0]);
    const nums = fence.area.match(/-?\d+\.\d+/g).map(Number);
    const lats = nums.filter((_, i) => i % 2 === 0);
    const lons = nums.filter((_, i) => i % 2 === 1);
    mine.forEach((p) => {
      expect(p.attributes.ignition).toBe(true);
      expect(p.latitude).toBeGreaterThanOrEqual(Math.min(...lats));
      expect(p.latitude).toBeLessThanOrEqual(Math.max(...lats));
      expect(p.longitude).toBeGreaterThanOrEqual(Math.min(...lons));
      expect(p.longitude).toBeLessThanOrEqual(Math.max(...lons));
    });
    // Se mueve en tramos rectos: cada paso cambia solo latitud o solo longitud (o ambas en la vuelta).
    const moved = mine.slice(1).filter((p, i) => p.latitude !== mine[i].latitude || p.longitude !== mine[i].longitude);
    expect(moved.length).toBeGreaterThanOrEqual(39);
  });

  test('simulateRoute(null) detiene el recorrido', async () => {
    jest.useFakeTimers();
    const c = createMockClient();
    const msgs = [];
    const stop = c.connect((m) => msgs.push(m), () => {});
    await c.simulateRoute(7, 1);
    await c.simulateRoute(null);
    jest.advanceTimersByTime(2000 * 9);
    stop();
    const mine = msgs.flatMap((m) => m.positions).filter((p) => p.deviceId === 7);
    expect(mine.length).toBeLessThan(5);
  });
});
