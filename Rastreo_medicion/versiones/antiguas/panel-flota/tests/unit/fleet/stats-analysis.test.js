import { describe, expect, test } from '@jest/globals';
import { aggregateFleet, analyzeSeries, eventsCsv, fuelSvg, litersOf, normalizeRoute } from '../../../src/features/stats/analysis.js';

const MIN = 5 * 60 * 1000;
const T0 = Date.parse('2026-11-08T15:00:00Z');
const pt = (i, fuel, kmh = 0, ign = true) => ({ t: T0 + i * MIN, fuel, kmh, ign, lat: 23 + i / 1000, lon: -105 });

describe('normalizeRoute', () => {
  test('pasa nudos a km/h y toma fuel e ignición de attributes', () => {
    const [p] = normalizeRoute([{ fixTime: '2026-11-08T15:00:00Z', speed: 10, latitude: 23, longitude: -105, attributes: { fuel: 180, ignition: true } }]);
    expect(p).toMatchObject({ kmh: 19, lat: 23, lon: -105, fuel: 180, ign: true });
    expect(p.t).toBe(T0);
  });
  test('sin fuel queda en null', () => {
    expect(normalizeRoute([{ fixTime: '2026-11-08T15:00:00Z', speed: 0, attributes: {} }])[0].fuel).toBeNull();
  });
});

describe('analyzeSeries', () => {
  test('suma el consumo, y separa cargas y descargas de 20 L o más', () => {
    const a = analyzeSeries([pt(0, 200, 5), pt(1, 195, 5), pt(2, 150, 0), pt(3, 250, 0), pt(4, 245, 6)]);
    expect(a.consumed).toBe(10); // 5 + 5
    expect(a.events).toEqual([
      expect.objectContaining({ type: 'drain', liters: 45 }),
      expect.objectContaining({ type: 'refuel', liters: 100 }),
    ]);
    expect(litersOf(a.events, 'drain')).toBe(45);
    expect(litersOf(a.events, 'refuel')).toBe(100);
  });

  test('una caída grande con el tractor en marcha no es descarga: cuenta como consumo', () => {
    const a = analyzeSeries([pt(0, 200, 8), pt(1, 160, 8)]);
    expect(a.events).toEqual([]);
    expect(a.consumed).toBe(40);
  });

  test('velocidades: promedio y máxima solo cuentan puntos en movimiento', () => {
    const a = analyzeSeries([pt(0, 100, 0), pt(1, 99, 6), pt(2, 98, 10)]);
    expect(a.avgKmh).toBe(8);
    expect(a.maxKmh).toBe(10);
    expect(a.movingH).toBe(0.2); // 2 puntos de 5 min
  });

  test('ignora puntos sin combustible y series vacías', () => {
    expect(analyzeSeries([]).events).toEqual([]);
    expect(analyzeSeries([pt(0, null), pt(1, 100)]).consumed).toBe(0);
  });
});

describe('aggregateFleet', () => {
  const mk = (id, name, series) => ({ device: { id, name }, series, analysis: analyzeSeries(series) });

  test('agrupa por lote, acumula litros y reparte el consumo por hora', () => {
    const entries = [mk(1, 'A', [pt(0, 100, 5), pt(1, 90, 5)]), mk(2, 'B', [pt(0, 50, 0), pt(1, 45, 0)])];
    const r = aggregateFleet(entries, (id) => (id === 1 ? 'Lote Norte' : null));
    expect(r.consL).toBe(15);
    expect(Object.fromEntries(r.lotes.map(([n, v]) => [n, v.cons]))).toEqual({ 'Lote Norte': 10, 'Fuera de lote': 5 });
    expect(r.perTractor.map((t) => t.name)).toEqual(['A', 'B']);
    expect(r.hours.reduce((s, h) => s + h.cons, 0)).toBe(15);
    expect(r.cumul.at(-1).y).toBe(15);
  });

  test('las cargas y descargas no cuentan como consumo por hora', () => {
    const r = aggregateFleet([mk(1, 'A', [pt(0, 200, 0), pt(1, 100, 0)])]);
    expect(r.drainL).toBe(100);
    expect(r.hours.reduce((s, h) => s + h.cons, 0)).toBe(0);
  });
});

describe('fuelSvg', () => {
  test('con menos de 2 puntos no dibuja nada', () => {
    expect(fuelSvg([pt(0, 100)])).toEqual({ html: '', events: [] });
  });
  test('dibuja las dos curvas y marca las descargas', () => {
    const { html, events } = fuelSvg([pt(0, 200, 5), pt(1, 150, 0), pt(2, 148, 3)]);
    expect(html).toContain('<svg');
    expect(html.match(/<path /g)).toHaveLength(2);
    expect(events).toHaveLength(1);
    expect(html).toContain('stroke-dasharray="3 3"');
  });
});

describe('eventsCsv', () => {
  test('encabezado, BOM y costo con el precio del diésel', () => {
    const csv = eventsCsv([{ device: { name: 'JD "1"', uniqueId: '123' }, type: 'drain', t: T0, liters: 40, lat: 23.1, lon: -105.2 }], 24, () => '08/11/2026');
    const [head, row] = csv.replace('﻿', '').split('\r\n');
    expect(csv.startsWith('﻿')).toBe(true);
    expect(head).toContain('Costo estimado MXN');
    expect(row).toBe('"JD ""1""","123","08/11/2026",Descarga,40,960,23.1,-105.2');
  });
});

describe('recorrido simulado (mock.getRoute)', () => {
  test('devuelve puntos cada 5 min con combustible y se puede analizar', async () => {
    const { createMockClient } = await import('../../../src/api/mock.js');
    const c = createMockClient();
    const positions = await c.getPositions();
    const probe = positions.find((p) => typeof p.attributes?.fuel === 'number');
    const from = new Date(Date.now() - 24 * 3600e3);
    const rows = await c.getRoute(probe.deviceId, from, new Date());
    expect(rows.length).toBeGreaterThan(100);
    const series = normalizeRoute(rows);
    expect(series.every((p) => typeof p.fuel === 'number')).toBe(true);
    const a = analyzeSeries(series);
    expect(a.consumed).toBeGreaterThan(0);
    expect(a.events.some((e) => e.type === 'refuel')).toBe(true);
    expect(await c.getRoute(probe.deviceId, new Date(), new Date())).toEqual([]);
  });
});
