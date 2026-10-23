import { describe, expect, test } from '@jest/globals';
import {
  fmtHours,
  fmtAgo,
  knotsToKmh,
  escapeHtml,
  describeEvent,
  startOfToday,
  msToHours,
} from '../../../src/lib/format.js';

describe('formato de horas', () => {
  test('convierte milisegundos a horas con un decimal', () => {
    expect(fmtHours(5_400_000)).toBe('1.5');
    expect(fmtHours(3_600_000 * 3412)).toBe('3,412.0');
  });

  test('valores vacíos se muestran como 0.0', () => {
    expect(fmtHours(undefined)).toBe('0.0');
    expect(fmtHours(null)).toBe('0.0');
    expect(msToHours('abc')).toBe(0);
  });
});

describe('velocidad', () => {
  test('nudos de Traccar a km/h, redondeado', () => {
    expect(knotsToKmh(10)).toBe(19);
    expect(knotsToKmh(0)).toBe(0);
    expect(knotsToKmh(undefined)).toBe(0);
  });
});

describe('tiempo relativo', () => {
  test('textos según la antigüedad', () => {
    expect(fmtAgo(new Date())).toBe('hace segundos');
    expect(fmtAgo(new Date(Date.now() - 5 * 60e3))).toBe('hace 5 min');
    expect(fmtAgo(new Date(Date.now() - 3 * 3600e3))).toBe('hace 3 h');
    expect(fmtAgo(new Date(Date.now() - 2 * 86400e3))).toBe('hace 2 d');
    expect(fmtAgo('no-es-fecha')).toBe('sin datos');
  });
});

describe('escapeHtml', () => {
  test('escapa caracteres peligrosos', () => {
    expect(escapeHtml(`<a href="x">&'`)).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&#39;');
  });

  test('acepta valores vacíos', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });
});

describe('describeEvent', () => {
  test('alarmas críticas', () => {
    expect(describeEvent({ type: 'alarm', attributes: { alarm: 'powerCut' } })).toEqual({
      label: 'Corte de alimentación del equipo',
      sev: 'crit',
    });
  });

  test('alarma desconocida queda como aviso', () => {
    const r = describeEvent({ type: 'alarm', attributes: { alarm: 'otraCosa' } });
    expect(r.sev).toBe('warn');
    expect(r.label).toContain('otraCosa');
  });

  test('eventos de motor y combustible', () => {
    expect(describeEvent({ type: 'ignitionOn' }).sev).toBe('ok');
    expect(describeEvent({ type: 'deviceFuelDrop' }).sev).toBe('crit');
  });

  test('tipo desconocido conserva el nombre', () => {
    expect(describeEvent({ type: 'algoNuevo' })).toEqual({ label: 'algoNuevo', sev: 'info' });
  });
});

describe('startOfToday (America/Mazatlan)', () => {
  test('es la medianoche de hoy en la zona del proyecto', () => {
    const start = startOfToday();
    const now = Date.now();
    expect(start.getTime()).toBeLessThanOrEqual(now);
    expect(now - start.getTime()).toBeLessThan(24 * 3600e3);
    const hhmm = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Mazatlan',
      hourCycle: 'h23',
      hour: '2-digit',
      minute: '2-digit',
    }).format(start);
    expect(hhmm).toBe('00:00');
  });
});
