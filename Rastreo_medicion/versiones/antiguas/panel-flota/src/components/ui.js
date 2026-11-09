// Componentes compartidos del rediseño: tarjetas KPI, estados (carga / vacío / error) y tabla
// con búsqueda, orden y paginación. Todo el texto visible está en español de México.
import { icon } from './icons2.js';
import { escapeHtml } from '../lib/format.js';

const TONES = {
  ok: 'text-ok',
  warn: 'text-warn',
  crit: 'text-crit',
  info: 'text-info',
  '': 'text-fg',
};

export function kpiCard({ label, value, hint = '', tone = '', iconName = 'tractor' }) {
  return `<div class="card flex items-center gap-3 p-4">
    <span class="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-raise ${TONES[tone] || ''}">${icon(iconName, 'h-5 w-5')}</span>
    <div class="min-w-0">
      <div class="truncate text-xs font-medium text-muted">${escapeHtml(label)}</div>
      <div class="font-mono text-2xl font-semibold leading-tight tabular-nums ${TONES[tone] || ''}">${value}</div>
      ${hint ? `<div class="truncate text-xs text-muted">${escapeHtml(hint)}</div>` : ''}
    </div>
  </div>`;
}

// Estados de una vista: 'loading' | 'empty' | 'error'. `action` = { label, attr } (atributo data-… del botón).
export function stateBlock(kind, { title = '', text = '', action = null } = {}) {
  if (kind === 'loading') {
    return `<div class="grid gap-3 p-4" role="status" aria-live="polite" aria-label="${escapeHtml(title || 'Cargando')}">
      ${Array.from({ length: 4 }, () => '<div class="h-10 animate-pulse rounded-lg bg-raise"></div>').join('')}
      <span class="sr-only">${escapeHtml(title || 'Cargando…')}</span></div>`;
  }
  const isErr = kind === 'error';
  return `<div class="grid justify-items-center gap-2 px-6 py-12 text-center" ${isErr ? 'role="alert"' : ''}>
    <span class="grid h-12 w-12 place-items-center rounded-full ${isErr ? 'bg-crit/15 text-crit' : 'bg-raise text-muted'}">${icon(isErr ? 'alert' : 'inbox', 'h-6 w-6')}</span>
    <p class="font-medium">${escapeHtml(title || (isErr ? 'No se pudo cargar la información' : 'Sin resultados'))}</p>
    ${text ? `<p class="max-w-sm text-sm text-muted">${escapeHtml(text)}</p>` : ''}
    ${action ? `<button type="button" class="btn mt-2" ${action.attr || ''}>${icon('refresh', 'h-4 w-4')}${escapeHtml(action.label)}</button>` : ''}
  </div>`;
}

// Lógica pura de la tabla (se prueba por separado).
export function queryRows(rows, { q = '', searchText, sortValue, dir = 1, page = 0, pageSize = 10 }) {
  const t = q.trim().toLowerCase();
  let list = t && searchText ? rows.filter((r) => searchText(r).toLowerCase().includes(t)) : rows.slice();
  if (sortValue) {
    list.sort((a, b) => {
      const x = sortValue(a);
      const y = sortValue(b);
      const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x ?? '').localeCompare(String(y ?? ''), 'es', { numeric: true });
      return c * dir;
    });
  }
  const total = list.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const p = Math.min(Math.max(0, page), pages - 1);
  list = list.slice(p * pageSize, p * pageSize + pageSize);
  return { rows: list, total, pages, page: p };
}

const HIDE = { sm: 'hidden sm:table-cell', md: 'hidden md:table-cell', lg: 'hidden lg:table-cell' };

/*
  Tabla con búsqueda, orden y paginación.
  columns: [{ key, label, html(row), sort?(row), align?: 'right', hide?: 'sm'|'md'|'lg' }]
  Devuelve { setRows, setStatus, rerender }. status: 'loading' | 'ready' | 'error'.
*/
export function createTable(host, opts) {
  const {
    columns,
    rowKey = (r) => r.id,
    pageSize = 10,
    searchText = null,
    searchPlaceholder = 'Buscar…',
    onRowClick = null,
    emptyTitle = 'Sin resultados',
    emptyText = 'Prueba con otra búsqueda.',
    label = 'Tabla',
    toolbar = '',
    onRetry = null,
  } = opts;
  let rows = [];
  let status = 'ready';
  let q = '';
  let sortKey = null;
  let dir = 1;
  let page = 0;
  const uid = 't-' + label.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  host.innerHTML = `
    <div class="flex flex-wrap items-center gap-2 p-3">
      ${
        searchText
          ? `<div class="relative min-w-[200px] flex-1 sm:max-w-xs">
              <label class="sr-only" for="${uid}-q">${escapeHtml(searchPlaceholder)}</label>
              <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">${icon('search', 'h-4 w-4')}</span>
              <input id="${uid}-q" data-q type="search" autocomplete="off" placeholder="${escapeHtml(searchPlaceholder)}"
                class="h-10 w-full rounded-full border border-line bg-panel pl-9 pr-3 text-sm placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60" />
            </div>`
          : ''
      }
      <span data-count class="text-sm text-muted" aria-live="polite"></span>
      <div class="ml-auto flex flex-wrap items-center gap-2">${toolbar}</div>
    </div>
    <div data-body class="overflow-x-auto border-t border-line"></div>
    <div data-pager class="flex items-center justify-between gap-2 border-t border-line p-3 text-sm"></div>`;

  const body = host.querySelector('[data-body]');
  const pager = host.querySelector('[data-pager]');
  const count = host.querySelector('[data-count]');

  const draw = () => {
    if (status === 'loading') {
      body.innerHTML = stateBlock('loading', { title: 'Cargando datos' });
      pager.innerHTML = '';
      count.textContent = '';
      return;
    }
    if (status === 'error') {
      body.innerHTML = stateBlock('error', {
        text: 'Revisa tu conexión e inténtalo de nuevo.',
        action: onRetry ? { label: 'Reintentar', attr: 'data-retry' } : null,
      });
      pager.innerHTML = '';
      count.textContent = '';
      return;
    }
    const col = columns.find((c) => c.key === sortKey);
    const r = queryRows(rows, { q, searchText, sortValue: col?.sort, dir, page, pageSize });
    page = r.page;
    count.textContent = `${r.total} ${r.total === 1 ? 'resultado' : 'resultados'}`;
    if (!r.total) {
      body.innerHTML = stateBlock('empty', { title: rows.length ? emptyTitle : 'Aún no hay registros', text: rows.length ? emptyText : '' });
      pager.innerHTML = '';
      return;
    }
    const head = columns
      .map((c) => {
        const cls = `${c.hide ? HIDE[c.hide] : ''} ${c.align === 'right' ? 'text-right' : 'text-left'}`;
        const sorted = sortKey === c.key;
        const inner = c.sort
          ? `<button type="button" data-sort="${c.key}" class="inline-flex items-center gap-1 font-semibold hover:text-fg">${escapeHtml(c.label)}${sorted ? icon(dir > 0 ? 'sortUp' : 'sortDown', 'h-3.5 w-3.5') : ''}</button>`
          : escapeHtml(c.label);
        return `<th scope="col" ${c.sort ? `aria-sort="${sorted ? (dir > 0 ? 'ascending' : 'descending') : 'none'}"` : ''}
          class="whitespace-nowrap px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted ${cls}">${inner}</th>`;
      })
      .join('');
    const trs = r.rows
      .map((row) => {
        const tds = columns
          .map(
            (c) => `<td class="px-4 py-3 align-middle ${c.hide ? HIDE[c.hide] : ''} ${c.align === 'right' ? 'text-right' : ''}">${c.html(row)}</td>`,
          )
          .join('');
        return `<tr data-key="${escapeHtml(rowKey(row))}" class="border-b border-line/70 last:border-0 ${onRowClick ? 'cursor-pointer hover:bg-raise focus-visible:bg-raise' : ''}" ${onRowClick ? 'tabindex="0"' : ''}>${tds}</tr>`;
      })
      .join('');
    body.innerHTML = `<table class="w-full min-w-[560px] border-collapse text-sm"><caption class="sr-only">${escapeHtml(label)}</caption><thead class="bg-raise/60"><tr>${head}</tr></thead><tbody>${trs}</tbody></table>`;
    pager.innerHTML = `<span class="text-muted">Página ${r.page + 1} de ${r.pages}</span>
      <span class="flex gap-2">
        <button type="button" class="btn !px-3 !py-1.5" data-page="-1" ${r.page === 0 ? 'disabled' : ''}>${icon('chevronLeft', 'h-4 w-4')}Anterior</button>
        <button type="button" class="btn !px-3 !py-1.5" data-page="1" ${r.page >= r.pages - 1 ? 'disabled' : ''}>Siguiente${icon('chevronRight', 'h-4 w-4')}</button>
      </span>`;
  };

  host.addEventListener('input', (e) => {
    if (!e.target.matches('[data-q]')) return;
    q = e.target.value;
    page = 0;
    draw();
  });
  host.addEventListener('click', (e) => {
    const s = e.target.closest('[data-sort]');
    if (s) {
      dir = sortKey === s.dataset.sort ? -dir : 1;
      sortKey = s.dataset.sort;
      page = 0;
      return draw();
    }
    const p = e.target.closest('[data-page]');
    if (p) {
      page += Number(p.dataset.page);
      return draw();
    }
    if (e.target.closest('[data-retry]')) return onRetry?.();
    const tr = e.target.closest('tr[data-key]');
    if (tr && onRowClick && !e.target.closest('a,button,input,select')) {
      const row = rows.find((x) => String(rowKey(x)) === tr.dataset.key);
      if (row) onRowClick(row);
    }
  });
  host.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || !onRowClick) return;
    const tr = e.target.closest('tr[data-key]');
    const row = tr && rows.find((x) => String(rowKey(x)) === tr.dataset.key);
    if (row) onRowClick(row);
  });

  draw();
  return {
    setRows(next) {
      rows = next || [];
      status = 'ready';
      draw();
    },
    setStatus(s) {
      status = s;
      draw();
    },
    rerender: draw,
  };
}
