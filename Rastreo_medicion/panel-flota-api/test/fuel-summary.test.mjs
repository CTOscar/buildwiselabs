import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { summarizeSamples, localDay } from '../src/fuel-summary.mjs';
import { createApp } from '../src/app.mjs';
import { createFakeRepo } from './fake-repo.mjs';

const MIN = 60000;
// 2026-11-08 12:00 UTC = 05:00 en Sinaloa (mismo día local)
const T0 = Date.parse('2026-11-08T12:00:00Z');
const row = (deviceId, i, fuel, kmh = 0) => ({ deviceId, fixTime: new Date(T0 + i * MIN), speed: kmh / 1.852, fuel });

describe('summarizeSamples', () => {
  test('consumo, carga y descarga con los mismos umbrales que el panel', () => {
    const [d] = summarizeSamples([row(1, 0, 200, 5), row(1, 1, 195, 5), row(1, 2, 150, 0), row(1, 3, 250, 0), row(1, 4, 245, 6)]);
    assert.equal(d.consumed, 10); // 5 + 5
    assert.equal(d.drainL, 45);
    assert.equal(d.refuelL, 100);
    assert.equal(d.samples, 5);
  });

  test('una caída grande con el tractor en marcha cuenta como consumo, no como descarga', () => {
    const [d] = summarizeSamples([row(1, 0, 200, 8), row(1, 1, 160, 8)]);
    assert.equal(d.drainL, 0);
    assert.equal(d.consumed, 40);
  });

  test('velocidad promedio y máxima solo con puntos en movimiento; horas por tiempo real', () => {
    const [d] = summarizeSamples([row(1, 0, 100, 0), row(1, 1, 99, 6), row(1, 2, 98, 10), row(1, 62, 97, 10)]);
    assert.equal(d.avgKmh, 9); // (6 + 10 + 10) / 3 = 8.67
    assert.equal(d.maxKmh, 10);
    // 1 + 1 min + (hueco de 60 min limitado a 10 min) = 12 min = 0.2 h
    assert.equal(d.movingH, 0.2);
  });

  test('separa por tractor y por día de Sinaloa; el nivel previo no cruza de un tractor a otro', () => {
    const lateUtc = Date.parse('2026-11-09T05:30:00Z'); // 22:30 del 8 en Sinaloa
    const nextDay = Date.parse('2026-11-09T07:30:00Z'); // 00:30 del 9
    const out = summarizeSamples([
      { deviceId: 1, fixTime: new Date(lateUtc), speed: 0, fuel: 100 },
      { deviceId: 1, fixTime: new Date(nextDay), speed: 0, fuel: 90 },
      { deviceId: 2, fixTime: new Date(nextDay), speed: 0, fuel: 10 }, // no se compara con el 90 del tractor 1
    ]);
    assert.deepEqual(out.map((d) => [d.deviceId, d.day, d.consumed]), [[1, '2026-11-08', 0], [1, '2026-11-09', 10], [2, '2026-11-09', 0]]);
    assert.equal(localDay(lateUtc), '2026-11-08');
    assert.equal(localDay(nextDay), '2026-11-09');
  });

  test('ignora fechas inválidas y niveles vacíos', () => {
    const out = summarizeSamples([{ deviceId: 1, fixTime: 'nada', speed: 0, fuel: 1 }, row(1, 0, null), row(1, 1, 90)]);
    assert.equal(out.length, 1);
    assert.equal(out[0].consumed, 0);
    assert.deepEqual(summarizeSamples([]), []);
  });
});

describe('GET /api/panel/fuel-summary', () => {
  async function start() {
    const repo = createFakeRepo();
    repo.samplesRange = async ({ deviceIds }) => [row(1, 0, 200, 5), row(1, 1, 190, 5), row(2, 0, 80, 0)].filter((r) => !deviceIds?.length || deviceIds.includes(r.deviceId));
    const server = createApp({ repo, config: { production: false, allowedOrigins: ['http://localhost'], ingestKey: 'k', onReset() {} } }).listen(0);
    await new Promise((r) => server.once('listening', r));
    const base = `http://127.0.0.1:${server.address().port}/api/panel`;
    const json = { 'Content-Type': 'application/json' };
    const creds = { email: 'a@test.mx', password: 'Clave1234!' };
    await fetch(`${base}/register`, { method: 'POST', headers: json, body: JSON.stringify({ name: 'Ana', ...creds }) });
    const login = await fetch(`${base}/login`, { method: 'POST', headers: json, body: JSON.stringify(creds) });
    const cookie = login.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
    return { base, cookie, close: () => server.close() };
  }
  const range = `from=${encodeURIComponent('2026-11-08T00:00:00Z')}&to=${encodeURIComponent('2026-11-09T00:00:00Z')}`;

  test('exige sesión, valida el periodo y devuelve el resumen por tractor', async () => {
    const { base, cookie, close } = await start();
    try {
      assert.equal((await fetch(`${base}/fuel-summary?${range}`)).status, 401);
      assert.equal((await fetch(`${base}/fuel-summary?from=x&to=y`, { headers: { cookie } })).status, 400);
      const tooLong = `from=${encodeURIComponent('2026-01-01T00:00:00Z')}&to=${encodeURIComponent('2026-03-01T00:00:00Z')}`;
      assert.equal((await fetch(`${base}/fuel-summary?${tooLong}`, { headers: { cookie } })).status, 400);

      const all = await (await fetch(`${base}/fuel-summary?${range}`, { headers: { cookie } })).json();
      assert.deepEqual(all.map((d) => [d.deviceId, d.consumed]), [[1, 10], [2, 0]]);
      const one = await (await fetch(`${base}/fuel-summary?${range}&deviceId=2`, { headers: { cookie } })).json();
      assert.deepEqual(one.map((d) => d.deviceId), [2]);
    } finally {
      close();
    }
  });
});
