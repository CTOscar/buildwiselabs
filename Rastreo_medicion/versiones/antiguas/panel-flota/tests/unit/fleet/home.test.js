import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { agoText, hiRes, num, safeUrl, weekday, windDir, wmo } from '../../../src/features/home/helpers.js';
import { fleetCentroid, weatherHtml, windowRisk, DEFAULT_LL } from '../../../src/features/home/weather.js';
import { fetchNews, newsHtml, parseApiNews, parseGoogleNews, NEWS_CATS } from '../../../src/features/home/news.js';
import { fleetHtml, fleetStats } from '../../../src/features/home/fleet.js';
import { earthUrl, initialEarth } from '../../../src/features/home/earth.js';
import { escapeHtml } from '../../../src/lib/format.js';

describe('helpers de la portada', () => {
  test('wmo, rosa de los vientos y números', () => {
    expect(wmo(0, 1)).toEqual(['Despejado', '☀️']);
    expect(wmo(0, 0)[1]).toBe('🌙');
    expect(wmo(999, 1)[0]).toBe('—');
    expect(windDir(0)).toBe('N');
    expect(windDir(92)).toBe('E');
    expect(windDir(359)).toBe('N');
    expect(num(3.456, 1)).toBe('3.5');
    expect(num(null)).toBe('—');
    expect(num(undefined, 2)).toBe('—');
  });
  test('agoText', () => {
    const now = 10_000_000_000;
    expect(agoText(now - 20_000, now)).toBe('ahora');
    expect(agoText(now - 5 * 60000, now)).toBe('hace 5 min');
    expect(agoText(now - 3 * 3600000, now)).toBe('hace 3 h');
    expect(agoText(now - 50 * 3600000, now)).toBe('hace 2 d');
  });
  test('hiRes quita el tamaño de la miniatura y safeUrl solo deja http(s)', () => {
    expect(hiRes('https://x.mx/foto-300x200.jpg?v=1')).toBe('https://x.mx/foto.jpg?v=1');
    expect(hiRes(null)).toBeNull();
    expect(safeUrl('https://a.mx/?q=1', escapeHtml)).toContain('https://a.mx/');
    expect(safeUrl('javascript:alert(1)', escapeHtml)).toBe('#');
    expect(weekday('2026-11-08', true)).toMatch(/domingo/i);
  });
});

describe('clima', () => {
  const series = (n, f) => Array.from({ length: n }, (_, i) => f(i));
  const sample = {
    current: { temperature_2m: 31.2, apparent_temperature: 33, relative_humidity_2m: 40, wind_speed_10m: 10, wind_gusts_10m: 15, wind_direction_10m: 90, precipitation: 0, weather_code: 1, is_day: 1 },
    hourly: { time: series(48, (i) => `2026-11-08T${String(i % 24).padStart(2, '0')}:00`), precipitation_probability: series(48, () => 10) },
    daily: {
      time: series(15, (i) => `2026-11-${String(1 + i).padStart(2, '0')}`),
      weather_code: series(15, () => 0),
      temperature_2m_max: series(15, () => 34),
      temperature_2m_min: series(15, () => 20),
      precipitation_sum: series(15, (i) => (i === 7 ? 2.5 : 0)),
      precipitation_probability_max: series(15, () => 20),
    },
  };
  test('arma las tres tarjetas y las cifras de las tarjetas KPI', () => {
    const w = weatherHtml(sample, Date.parse('2026-11-08T12:00:00'));
    expect(w.now).toContain('31<small>°C</small>');
    expect(w.now).toContain('Favorable');
    expect(w.forecast.match(/<li>/g)).toHaveLength(7);
    expect(w.forecast).toContain('Hoy');
    expect(w.rain).toContain('2.5 mm');
    expect(w.temp).toBe(31.2);
    expect(w.rainToday).toBe(2.5);
  });
  test('ventana de aplicación: viento, lluvia y calor', () => {
    const base = { wind_speed_10m: 5, wind_gusts_10m: 8, temperature_2m: 25, precipitation: 0 };
    expect(windowRisk(base, 0)[0]).toBe('ok');
    expect(windowRisk({ ...base, wind_speed_10m: 18 }, 0)[0]).toBe('warn');
    expect(windowRisk({ ...base, temperature_2m: 40 }, 0)[0]).toBe('bad');
    expect(windowRisk(base, 70)[0]).toBe('bad');
  });
  test('centro de la flota', () => {
    expect(fleetCentroid([])).toEqual(DEFAULT_LL);
    expect(fleetCentroid([{ latitude: 22, longitude: -105 }, { latitude: 24, longitude: -107 }])).toEqual([23, -106]);
  });
});

describe('noticias', () => {
  const cat = NEWS_CATS[0];
  test('parseApiNews exige items y usa la foto grande con la miniatura de respaldo', () => {
    expect(() => parseApiNews({ items: [] })).toThrow();
    const d = parseApiNews({ items: [{ title: 'A', url: 'https://a.mx', source: 'S', image: 'https://i.mx/f-300x200.jpg', publishedAt: '2026-11-08T10:00:00Z' }] });
    expect(d.items[0]).toMatchObject({ image: 'https://i.mx/f.jpg', imageLo: 'https://i.mx/f-300x200.jpg' });
  });
  test('parseGoogleNews separa la fuente del título', () => {
    const d = parseGoogleNews({ status: 'ok', items: [{ title: 'Llueve en Sinaloa - El Debate', link: 'https://x.mx', pubDate: '2026-11-08 10:00:00' }] });
    expect(d.items[0]).toMatchObject({ title: 'Llueve en Sinaloa', source: 'El Debate' });
    expect(() => parseGoogleNews({ status: 'error' })).toThrow();
  });
  test('agro cae a Google Noticias si la API falla; otras categorías no', async () => {
    const fetchFn = jest.fn((url) =>
      url.includes('buildwiselabs')
        ? Promise.resolve({ ok: false, status: 400 })
        : Promise.resolve({ ok: true, json: async () => ({ status: 'ok', items: [{ title: 'T - F', link: 'https://x.mx', pubDate: '2026-11-08 10:00:00' }] }) }),
    );
    const d = await fetchNews(cat, { fetchFn });
    expect(d.items[0].source).toBe('F');
    await expect(fetchNews(NEWS_CATS[1], { fetchFn })).rejects.toThrow();
  });
  test('HTML: escapa el texto, no deja enlaces peligrosos y marca la pestaña activa', () => {
    const html = newsHtml(cat, { items: [{ title: '<b>x</b>', url: 'javascript:alert(1)', source: 'S&P', publishedAt: NaN }], sources: [], updatedAt: Date.now() });
    expect(html).not.toContain('<b>x</b>');
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;');
    expect(html).toContain('href="#"');
    expect(html).toContain('aria-selected="true"');
    expect(newsHtml(cat, null, 'loading')).toContain('nw-skel');
    expect(newsHtml(cat, null, 'error')).toContain('Reintentar');
  });
});

describe('tarjetas de flota', () => {
  const dev = (id, name) => [id, { id, name }];
  const s = {
    devices: new Map([dev(1, 'JD <1>'), dev(2, 'NH 2'), dev(3, 'JD 3')]),
    positions: new Map([[1, { geofenceIds: [10] }], [2, { geofenceIds: [10] }]]),
    engineToday: new Map([[1, 3 * 36e5], [2, 1 * 36e5]]),
    geofences: [{ id: 10, name: 'Lote Norte', attributes: { color: '#112233' } }],
    events: [
      { id: 1, type: 'deviceFuelDrop', deviceId: 1, eventTime: new Date().toISOString() },
      { id: 2, type: 'ignitionOn', deviceId: 2, eventTime: new Date().toISOString() },
    ],
  };
  const statusOf = (id) => ({ 1: 'running', 2: 'idle', 3: 'nosignal' })[id];

  test('conteos y horas', () => {
    const r = fleetStats(s, statusOf);
    expect(r.st).toEqual({ running: 1, idle: 1, nosignal: 1 });
    expect(r.totalH).toBe(4);
    expect(r.working).toBe(2);
  });
  test('HTML: alertas altas, lotes con conteo y nombres escapados', () => {
    const h = fleetHtml(s, statusOf);
    expect(h.kpi).toMatchObject({ running: 1, idle: 1, nosignal: 1, hours: 4 });
    expect(h.alerts).toContain('Caída de combustible');
    expect(h.alerts).not.toContain('ignitionOn');
    expect(h.alerts).toContain('JD &lt;1&gt;');
    expect(h.lotes).toContain('2 tractores dentro');
    expect(h.work).toContain('2 de 3');
  });
  test('sin equipos ni lotes muestra mensajes vacíos', () => {
    const h = fleetHtml({ devices: new Map(), positions: new Map(), engineToday: new Map(), geofences: [], events: [] }, statusOf);
    expect(h.equip).toContain('ningún equipo');
    expect(h.lotes).toContain('Aún no hay lotes');
    expect(h.alerts).toContain('No hay alertas altas');
  });
});

describe('Earth', () => {
  test('la URL lleva capa, vista y proyección', () => {
    const u = earthUrl(initialEarth());
    expect(u).toContain('earth.nullschool.net');
    expect(u).toContain('bleaching_alert_area');
    expect(u).toContain('orthographic=-106,21,2600');
  });
});

describe('portada (humo)', () => {
  beforeEach(() => {
    document.body.innerHTML = '<section id="home-view" hidden></section>';
    globalThis.fetch = jest.fn(() => Promise.reject(new Error('sin red')));
  });
  test('se pinta al abrir la vista, los enlaces cambian de vista y sin red muestra reintentar', async () => {
    const { state, notify } = await import('../../../src/features/fleet/store.js');
    const { initHome, PAGE_VIEW } = await import('../../../src/features/home/home.js');
    initHome();
    const view = document.getElementById('home-view');
    expect(view.querySelectorAll('#dh-navbar a[data-hm-page]')).toHaveLength(8);
    state.view = 'home';
    notify();
    await new Promise((r) => setTimeout(r, 50));
    expect(view.hidden).toBe(false);
    expect(view.querySelector('#dh-kpis').textContent).toContain('En marcha');
    expect(view.querySelector('#dh-equip').textContent).toContain('ningún equipo');
    await new Promise((r) => setTimeout(r, 50));
    expect(view.querySelector('#dh-now').textContent).toContain('Reintentar');
    view.querySelector('[data-hm-page="reportes"]').click();
    expect(state.view).toBe(PAGE_VIEW.reportes);
    expect(PAGE_VIEW.combustible).toBe('stats');
  });
});
