import { describe, expect, test } from '@jest/globals';
import { LINK_GROUPS } from '../../../src/config/links.js';
import { config } from '../../../src/config.js';

describe('enlaces del proyecto', () => {
  const all = LINK_GROUPS.flatMap((g) => g.links.map((l) => ({ ...l, group: g.title })));

  test('cada grupo tiene título, ícono y al menos un enlace', () => {
    LINK_GROUPS.forEach((g) => {
      expect(g.title).toBeTruthy();
      expect(g.icon).toBeTruthy();
      expect(g.links.length).toBeGreaterThan(0);
    });
  });

  test.each(all.map((l) => [l.label, l]))('%s: enlace https y nombre', (_, l) => {
    expect(l.label).toBeTruthy();
    expect(l.href).toMatch(/^https:\/\//);
  });

  test('las imágenes son https o archivos locales', () => {
    all.filter((l) => l.image).forEach((l) => expect(l.image).toMatch(/^(https:\/\/|\/)/));
  });

  test('no hay enlaces repetidos', () => {
    const hrefs = all.map((l) => l.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});

describe('configuración', () => {
  test('sin variables de entorno arranca en modo simulado y zona Mazatlán', () => {
    expect(config.useMock).toBe(true);
    expect(config.tz).toBe('America/Mazatlan');
    expect(config.apiBase).toBe('');
  });
});
