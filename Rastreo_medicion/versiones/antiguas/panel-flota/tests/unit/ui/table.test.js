import { describe, it, expect } from '@jest/globals';
import { queryRows, createTable } from '../../../src/components/ui.js';

const rows = Array.from({ length: 25 }, (_, i) => ({ id: i + 1, name: `TRC-${String(i + 1).padStart(4, '0')}`, n: (i * 7) % 10 }));
const base = { searchText: (r) => r.name, sortValue: (r) => r.n };

describe('queryRows', () => {
  it('pagina de 10 en 10', () => {
    const r = queryRows(rows, { pageSize: 10, page: 2 });
    expect(r.rows).toHaveLength(5);
    expect(r.pages).toBe(3);
  });
  it('busca sin distinguir mayúsculas', () => {
    expect(queryRows(rows, { ...base, q: 'trc-0007' }).total).toBe(1);
  });
  it('ordena ascendente y descendente', () => {
    const up = queryRows(rows, { ...base, dir: 1, pageSize: 25 }).rows.map((r) => r.n);
    const down = queryRows(rows, { ...base, dir: -1, pageSize: 25 }).rows.map((r) => r.n);
    expect(up).toEqual([...up].sort((a, b) => a - b));
    expect(down).toEqual([...up].reverse());
  });
  it('acota la página fuera de rango', () => {
    expect(queryRows(rows, { page: 99, pageSize: 10 }).page).toBe(2);
  });
});

describe('createTable', () => {
  const mk = () => {
    const host = document.createElement('div');
    const t = createTable(host, { label: 'Prueba', pageSize: 10, searchText: (r) => r.name, columns: [{ key: 'name', label: 'Nombre', sort: (r) => r.name, html: (r) => r.name }] });
    return { host, t };
  };
  it('muestra estados de carga, error y vacío', () => {
    const { host, t } = mk();
    t.setStatus('loading');
    expect(host.querySelector('[role="status"]')).not.toBeNull();
    t.setStatus('error');
    expect(host.querySelector('[role="alert"]')).not.toBeNull();
    t.setRows([]);
    expect(host.textContent).toContain('Aún no hay registros');
  });
  it('pagina con los botones', () => {
    const { host, t } = mk();
    t.setRows(rows);
    expect(host.querySelectorAll('tbody tr')).toHaveLength(10);
    host.querySelector('[data-page="1"]').click();
    expect(host.textContent).toContain('Página 2 de 3');
  });
});
