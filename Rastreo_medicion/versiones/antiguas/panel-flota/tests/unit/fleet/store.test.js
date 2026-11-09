import { beforeEach, describe, expect, test } from '@jest/globals';
import { state, applyMessage, statusOf, matches, select, setView, setEngineToday, fenceNameOf } from '../../../src/features/fleet/store.js';

const HOUR = 3600e3;
const now = () => new Date().toISOString();

function reset() {
  state.devices.clear();
  state.positions.clear();
  state.engineToday.clear();
  state.events = [];
  state.geofences = [{ id: 7, name: 'El Álamo · Lote 2', area: '' }];
  state.selected = null;
  state.query = '';
  state.view = 'fleet';
  state.backView = 'fleet';
  state.follow = false;
  state.chips = { status: null, nivel: null, sonda: false };
}

const device = (id, extra = {}) => ({
  id,
  name: `TRC-${String(id).padStart(4, '0')}`,
  uniqueId: `86000000000${id}`,
  status: 'online',
  lastUpdate: now(),
  attributes: { nivel: 'A' },
  ...extra,
});
const position = (deviceId, attributes = {}, extra = {}) => ({
  id: Math.random(),
  deviceId,
  latitude: 23,
  longitude: -105.9,
  fixTime: now(),
  geofenceIds: [7],
  attributes,
  ...extra,
});

beforeEach(reset);

describe('estado del tractor (statusOf)', () => {
  test('en marcha cuando hay ignición', () => {
    applyMessage({ devices: [device(1)], positions: [position(1, { ignition: true })] });
    expect(statusOf(1)).toBe('running');
  });

  test('apagado cuando reporta sin ignición', () => {
    applyMessage({ devices: [device(1)], positions: [position(1, { ignition: false })] });
    expect(statusOf(1)).toBe('idle');
  });

  test('sin señal si el equipo está offline', () => {
    applyMessage({ devices: [device(1, { status: 'offline' })], positions: [position(1, { ignition: true })] });
    expect(statusOf(1)).toBe('nosignal');
  });

  test('sin señal si el último reporte es viejo (más de 35 min)', () => {
    const old = new Date(Date.now() - 2 * HOUR).toISOString();
    applyMessage({ devices: [device(1, { lastUpdate: old })], positions: [position(1, { ignition: true }, { fixTime: old })] });
    expect(statusOf(1)).toBe('nosignal');
  });

  test('tractor desconocido = sin señal', () => {
    expect(statusOf(999)).toBe('nosignal');
  });
});

describe('horas de motor del día (applyMessage)', () => {
  test('suma el avance del horómetro entre posiciones', () => {
    setEngineToday([{ deviceId: 1, engineHours: 2 * HOUR }]);
    applyMessage({ devices: [device(1)], positions: [position(1, { hours: 100 * HOUR })] });
    applyMessage({ positions: [position(1, { hours: 100.5 * HOUR })] });
    expect(state.engineToday.get(1)).toBe(2.5 * HOUR);
  });

  test('ignora saltos imposibles (más de 6 h entre reportes)', () => {
    applyMessage({ devices: [device(1)], positions: [position(1, { hours: 100 * HOUR })] });
    applyMessage({ positions: [position(1, { hours: 110 * HOUR })] });
    expect(state.engineToday.get(1) || 0).toBe(0);
  });

  test('actualiza lastUpdate del tractor con la posición más nueva', () => {
    const old = new Date(Date.now() - HOUR).toISOString();
    applyMessage({ devices: [device(1, { lastUpdate: old })] });
    const fresh = now();
    applyMessage({ positions: [position(1, {}, { fixTime: fresh })] });
    expect(state.devices.get(1).lastUpdate).toBe(fresh);
  });
});

describe('eventos', () => {
  test('no duplica y ordena del más nuevo al más viejo', () => {
    const e1 = { id: 1, type: 'ignitionOn', deviceId: 1, eventTime: new Date(Date.now() - 60e3).toISOString() };
    const e2 = { id: 2, type: 'ignitionOff', deviceId: 1, eventTime: now() };
    applyMessage({ events: [e1] });
    applyMessage({ events: [e1, e2] });
    expect(state.events.map((e) => e.id)).toEqual([2, 1]);
  });
});

describe('filtros (matches)', () => {
  beforeEach(() => {
    applyMessage({
      devices: [device(1), device(2, { attributes: { nivel: 'B' } }), device(3, { attributes: { nivel: 'A', sondaBLE: true } })],
      positions: [position(1, { ignition: true }), position(2, { ignition: false }), position(3, { ignition: true })],
    });
  });

  test('sin filtros pasan todos', () => {
    expect([1, 2, 3].filter(matches)).toEqual([1, 2, 3]);
  });

  test('por estado', () => {
    state.chips.status = 'running';
    expect([1, 2, 3].filter(matches)).toEqual([1, 3]);
  });

  test('por nivel y sonda', () => {
    state.chips.nivel = 'B';
    expect([1, 2, 3].filter(matches)).toEqual([2]);
    state.chips = { status: null, nivel: null, sonda: true };
    expect([1, 2, 3].filter(matches)).toEqual([3]);
  });

  test('por búsqueda de código o IMEI', () => {
    state.query = 'trc-0002';
    expect([1, 2, 3].filter(matches)).toEqual([2]);
    state.query = '860000000003';
    expect([1, 2, 3].filter(matches)).toEqual([3]);
  });
});

describe('navegación del panel', () => {
  test('seleccionar abre la tarjeta y volver regresa a la vista anterior', () => {
    applyMessage({ devices: [device(1)] });
    setView('alerts');
    select(1);
    expect(state.view).toBe('device');
    expect(state.backView).toBe('alerts');
    select(null);
    expect(state.view).toBe('alerts');
  });

  test('cambiar de vista quita la selección y el modo seguir', () => {
    select(1);
    state.follow = true;
    setView('reports');
    expect(state.selected).toBeNull();
    expect(state.follow).toBe(false);
  });

  test('nombre del lote según la geocerca de la posición', () => {
    applyMessage({ devices: [device(1)], positions: [position(1)] });
    expect(fenceNameOf(1)).toBe('El Álamo · Lote 2');
  });
});

describe('recorrido (trazo)', () => {
  test('applyMessage guarda el trazo sin duplicar puntos y trailKm mide la distancia', async () => {
    const { applyMessage, state, trailKm } = await import('../../../src/features/fleet/store.js');
    const pos = (lat, lon) => ({ id: Math.random(), deviceId: 999, latitude: lat, longitude: lon, fixTime: new Date().toISOString(), attributes: {} });
    applyMessage({ positions: [pos(23, -105.9)] });
    applyMessage({ positions: [pos(23, -105.9)] });
    applyMessage({ positions: [pos(23.01, -105.9)] });
    const t = state.trails.get(999);
    expect(t).toHaveLength(2);
    expect(trailKm(t)).toBeCloseTo(1.112, 2);
  });
});
