import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { ALL, DAYS, KEY, createStatus, dayKey, seed, worst } from '../../../src/features/status/model.js';
import { statusHtml } from '../../../src/features/status/html.js';
import { createStatusPage } from '../../../src/features/status/status.js';

const NOW = Date.parse('2026-11-08T18:00:00Z');
const memory = () => {
  const data = {};
  return { getItem: (k) => data[k] ?? null, setItem: (k, v) => (data[k] = v), data };
};
const make = (storage = memory()) => ({ storage, model: createStatus({ storage, clock: () => NOW }) });

describe('modelo de Status', () => {
  test('la demo trae todos los componentes, un incidente abierto y mantenimientos', () => {
    const s = seed(NOW);
    expect(Object.keys(s.comps)).toEqual(ALL);
    expect(s.incidents).toHaveLength(1);
    expect(s.maint.map((m) => m.state)).toEqual(['progress', 'scheduled', 'scheduled']);
    expect(worst(['operational', 'maintenance', 'degraded'])).toBe('degraded');
    expect(worst([])).toBe('operational');
  });

  test('disponibilidad: los días degradados restan y "nodata" no cuenta', () => {
    const { model } = make();
    expect(model.uptime('Servidor GPS (Traccar)')).toBeLessThan(100);
    expect(model.uptime('Servidor GPS (Traccar)')).toBeGreaterThan(99);
    // "Sitio web" tiene un día sin datos y ningún corte: sigue en 100 %
    expect(model.uptime('Sitio web')).toBe(100);
    expect(model.uptime('API / Backend')).toBeCloseTo(((DAYS - 1 + 0.8) / DAYS) * 100 - ((1 - 0.98) / DAYS) * 100, 5);
  });

  test('reportar y resolver un incidente actualiza el estado del componente y el historial', () => {
    const { model } = make();
    const a = model.actions;
    a.incident({ title: 'Caída', comp: 'API / Backend', sev: 'major', phase: 'Investigando', msg: 'Revisando' });
    expect(model.state().comps['API / Backend']).toBe('major');
    expect(model.state().hist['API / Backend'][dayKey(NOW)]).toBe('major');
    const id = model.state().incidents[0].id;
    a.update(id, 'Resuelto', 'Listo');
    expect(model.state().comps['API / Backend']).toBe('operational');
    expect(model.state().incidents.find((i) => i.id === id)).toBeUndefined();
    expect(model.state().past[0]).toMatchObject({ title: 'Caída', text: 'Listo' });
  });

  test('mantenimiento: iniciar pone el componente en mantenimiento; completar lo libera', () => {
    const { model } = make();
    const a = model.actions;
    a.startMaint(12);
    expect(model.state().comps['Parches del sistema (Debian)']).toBe('maintenance');
    a.doneMaint(12);
    expect(model.state().comps['Parches del sistema (Debian)']).toBe('operational');
    expect(model.state().past[0].title).toContain('(completado)');
    a.doneMaint(999); // no existe: no truena
    a.cancelMaint(13);
    expect(model.state().maint.find((m) => m.id === 13)).toBeUndefined();
  });

  test('se guarda y se recupera del almacenamiento; un JSON dañado vuelve a la demo', () => {
    const { storage, model } = make();
    model.actions.admin();
    model.save();
    expect(JSON.parse(storage.data[KEY]).admin).toBe(true);
    expect(make(storage).model.state().admin).toBe(true);
    storage.data[KEY] = '{no es json';
    expect(make(storage).model.state().admin).toBe(false);
    expect(createStatus({ storage: null, clock: () => NOW }).state().incidents).toHaveLength(1);
  });
});

describe('HTML de Status', () => {
  test('banner, grupos, 90 barras por componente y flota en vivo', () => {
    const { model } = make();
    const h = statusHtml(model, { running: 5, idle: 3, nosignal: 2 });
    expect(h).toContain('Algunos sistemas con rendimiento degradado');
    expect(h.match(/class="hs-card hs-group"/g)).toHaveLength(3);
    expect(h.match(/class="hs-bar[ "]/g)).toHaveLength(ALL.length * DAYS);
    expect(h).toContain('Flota en vivo: <b>5</b>');
    expect(h).toContain('Mantenimiento de la base de datos');
    expect(h).not.toContain('Controles de administrador');
  });
  test('en modo administrador muestra controles y selector por componente', () => {
    const { model } = make();
    model.actions.admin();
    const h = statusHtml(model);
    expect(h).toContain('Controles de administrador');
    expect(h.match(/data-comp=/g)).toHaveLength(ALL.length);
    expect(h).not.toContain('Flota en vivo');
  });
  test('escapa el texto de los incidentes', () => {
    const { model } = make();
    model.actions.incident({ title: '<img src=x onerror=alert(1)>', comp: 'Sitio web', sev: 'degraded', phase: 'Investigando', msg: '<b>hola</b>' });
    const h = statusHtml(model);
    expect(h).not.toContain('<img src=x');
    expect(h).toContain('&lt;img src=x');
  });
});

describe('página Status (DOM)', () => {
  let view;
  let page;
  beforeEach(() => {
    document.body.innerHTML = '<section id="home-view"><section id="dh-content"></section></section>';
    view = document.getElementById('home-view');
    page = createStatusPage(view, { storage: memory(), confirmFn: () => true });
    page.render();
  });

  test('Administrar alterna el modo y cambiar un componente actualiza el banner', () => {
    view.querySelector('[data-hs="admin"]').click();
    expect(view.querySelector('.hs-admin')).not.toBeNull();
    const sel = view.querySelector('select[data-comp="Sitio web"]');
    sel.value = 'major';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    expect(view.querySelector('.hs-banner').textContent).toContain('interrupciones');
    expect(page.model.state().comps['Sitio web']).toBe('major');
  });

  test('publicar un incidente desde el formulario y restablecer la demo', () => {
    view.querySelector('[data-hs="admin"]').click();
    view.querySelector('[data-hs="show"][data-t="inc"]').click();
    const form = view.querySelector('.hs-form[data-f="inc"]');
    expect(form.hidden).toBe(false);
    const field = (n) => form.querySelector(`[name="${n}"]`); // form.title sería el atributo title del formulario
    field('title').value = 'Errores al entrar';
    field('msg').value = 'Estamos revisando';
    field('comp').value = 'Inicio de sesión';
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(view.textContent).toContain('Errores al entrar');
    expect(page.model.state().incidents[0].comp).toBe('Inicio de sesión');
    view.querySelector('[data-hs="reset"]').click();
    expect(view.textContent).not.toContain('Errores al entrar');
    expect(page.model.state().admin).toBe(true);
  });

  test('no reacciona si la página mostrada no es Status', () => {
    view.querySelector('#dh-content').innerHTML = '<button data-hs="admin">x</button>';
    view.querySelector('[data-hs="admin"]').click();
    expect(page.model.state().admin).toBe(false);
    const spy = jest.fn();
    view.addEventListener('x', spy);
    expect(spy).not.toHaveBeenCalled();
  });
});
