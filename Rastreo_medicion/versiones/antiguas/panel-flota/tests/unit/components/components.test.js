import { describe, expect, test } from '@jest/globals';
import { linkCard } from '../../../src/components/linkCard.js';
import { SERVICES, appsPanelHtml } from '../../../src/components/apps.js';
import { icon } from '../../../src/components/icons.js';
import { initials } from '../../../src/features/profile/profile.js';

const render = (html) => {
  const d = document.createElement('div');
  d.innerHTML = html;
  return d;
};

describe('linkCard', () => {
  const card = (l) => render(linkCard(l, { icon: 'chip' })).querySelector('a');

  test('abre en otra pestaña de forma segura', () => {
    const a = card({ label: 'Teltonika FMC130', href: 'https://www.teltonika-gps.com/x' });
    expect(a.getAttribute('href')).toBe('https://www.teltonika-gps.com/x');
    expect(a.target).toBe('_blank');
    expect(a.rel).toContain('noopener');
  });

  test('muestra el dominio sin www', () => {
    const a = card({ label: 'X', href: 'https://www.traccar.org/' });
    expect(a.textContent).toContain('traccar.org');
  });

  test('escapa el texto y muestra el precio', () => {
    const a = card({ label: '<b>Sello</b>', note: 'Amazon', price: '$584 · 50 pzas', href: 'https://a.mx' });
    expect(a.innerHTML).not.toContain('<b>Sello</b>');
    expect(a.textContent).toContain('<b>Sello</b>');
    expect(a.textContent).toContain('$584 · 50 pzas');
  });

  test('sin imagen marca la tarjeta para mostrar el ícono', () => {
    const a = card({ label: 'X', href: 'https://a.mx' });
    expect(a.querySelector('[data-noimg]')).not.toBeNull();
    expect(a.querySelector('img')).toBeNull();
  });

  test('con imagen la carga en diferido', () => {
    const img = card({ label: 'X', href: 'https://a.mx', image: 'https://img/x.png' }).querySelector('img');
    expect(img.getAttribute('loading')).toBe('lazy');
  });
});

describe('servicios BuildWise', () => {
  test('incluye los servicios acordados', () => {
    const ids = SERVICES.map((s) => s.id);
    expect(ids).toEqual(expect.arrayContaining(['rastreo', 'correo', 'chatbot', 'modelos']));
    expect(ids).not.toContain('consultoria');
  });

  test('los "pronto" no son enlaces y el actual no navega', () => {
    const d = render(appsPanelHtml());
    const hrefs = [...d.querySelectorAll('a')].map((a) => a.textContent);
    expect(hrefs.join(' ')).not.toContain('Correo Rastreo');
    expect(hrefs.join(' ')).not.toContain('Modelos de IA');
    expect(d.querySelector('[aria-current="page"]').textContent).toContain('Rastreo y Medición');
  });
});

describe('utilidades de interfaz', () => {
  test('icon genera un SVG accesible', () => {
    const svg = render(icon('search', 'h-4 w-4')).querySelector('svg');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('class')).toBe('h-4 w-4');
  });

  test('iniciales del perfil', () => {
    expect(initials('Oscar Macías')).toBe('OM');
    expect(initials('demo')).toBe('D');
    expect(initials('')).toBe('?');
  });
});
