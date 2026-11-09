import { describe, it, expect } from '@jest/globals';
import { MODULES, VIEWS, moduleOf, tabsOf, activeTab, pageOf } from '../../../src/components/nav.js';

describe('navegación', () => {
  it('tiene los 5 módulos pedidos, en orden', () => {
    expect(MODULES.map((m) => m.label)).toEqual(['Inicio', 'Plan', 'Analizar', 'Mantenimiento', 'Configuración']);
  });
  it('la vista inicial de cada módulo está registrada y pertenece a ese módulo', () => {
    MODULES.forEach((m) => expect(VIEWS.find((v) => v.view === m.home)?.module).toBe(m.id));
  });
  it('el panel de unidad conserva el módulo desde el que se abrió', () => {
    expect(pageOf('device', 'reports')).toBe('reports');
    expect(moduleOf('device', 'reports').id).toBe('analizar');
  });
  it('una subpantalla marca la pestaña de su padre', () => {
    expect(activeTab('lote')).toBe('lotes');
    expect(tabsOf('inicio').map((t) => t.view)).toEqual(['fleet', 'alerts']);
  });
});
