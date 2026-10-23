import { state, subscribe, notify, select, statusOf, STATUS, mapApi, setView } from '../fleet/store.js';
import { icon } from '../../components/icons.js';
import { escapeHtml } from '../../lib/format.js';
import { createLinksMenu } from '../links/linksMenu.js';

const STATUS_CHIPS = [
  ['running', 'En marcha', 'bg-ok'],
  ['idle', 'Apagados', 'bg-muted'],
  ['nosignal', 'Sin señal', 'bg-crit'],
];

export function initSearch() {
  const box = document.getElementById('searchbox');
  box.innerHTML = `
    <form id="search-form" role="search" class="flex h-12 items-center gap-1 rounded-full bg-panel pl-1.5 pr-2 shadow-float ring-1 ring-line/60 focus-within:ring-2 focus-within:ring-accent/60">
      <button type="button" id="menu-btn" class="grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted hover:bg-raise hover:text-fg lg:hidden" aria-label="Abrir menú">${icon('menu')}</button>
      <span class="hidden h-10 w-10 shrink-0 place-items-center text-muted lg:grid">${icon('search')}</span>
      <label for="q" class="sr-only">Buscar tractor o lote</label>
      <input id="q" type="search" autocomplete="off" spellcheck="false" placeholder="Buscar tractor, IMEI o lote"
        class="h-full min-w-0 flex-1 bg-transparent text-[15px] placeholder:text-muted focus:outline-none [&::-webkit-search-cancel-button]:hidden" />
      <button type="button" id="q-clear" class="hidden h-9 w-9 shrink-0 place-items-center rounded-full text-muted hover:bg-raise hover:text-fg" aria-label="Borrar búsqueda">${icon('x')}</button>
      <button type="submit" class="grid h-9 w-9 shrink-0 place-items-center rounded-full text-accent hover:bg-raise lg:hidden" aria-label="Buscar">${icon('search')}</button>
    </form>
    <div id="suggest" class="mt-2 hidden overflow-hidden rounded-2xl bg-panel py-2 shadow-float ring-1 ring-line/60" role="listbox" aria-label="Sugerencias"></div>`;

  const form = box.querySelector('#search-form');
  const q = box.querySelector('#q');
  const clear = box.querySelector('#q-clear');
  const sug = box.querySelector('#suggest');
  let results = [];

  const compute = () => {
    const t = q.value.trim().toLowerCase();
    if (!t) return [];
    const devs = [...state.devices.values()]
      .filter((d) => d.name.toLowerCase().includes(t) || String(d.uniqueId).includes(t))
      .slice(0, 5)
      .map((d) => ({ type: 'device', id: d.id, title: d.name, sub: `${STATUS[statusOf(d.id)].label} · Nivel ${d.attributes?.nivel || '—'}`, st: statusOf(d.id) }));
    const fences = state.geofences
      .filter((g) => g.name.toLowerCase().includes(t))
      .slice(0, 3)
      .map((g) => ({ type: 'fence', id: g.id, title: g.name, sub: 'Lote · geocerca' }));
    return [...devs, ...fences];
  };

  const renderSug = () => {
    results = compute();
    if (!results.length || document.activeElement !== q) {
      sug.classList.add('hidden');
      return;
    }
    sug.innerHTML = results
      .map(
        (r, i) => `<button type="button" role="option" data-i="${i}" class="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-raise">
          <span class="grid h-8 w-8 shrink-0 place-items-center rounded-full ${r.type === 'device' ? STATUS[r.st].soft + ' ' + STATUS[r.st].text : 'bg-accent/15 text-accent'}">
            ${icon(r.type === 'device' ? 'tractor' : 'polygon', 'h-4 w-4')}</span>
          <span class="min-w-0"><span class="block truncate text-sm font-medium">${escapeHtml(r.title)}</span>
          <span class="block truncate text-xs text-muted">${escapeHtml(r.sub)}</span></span>
        </button>`,
      )
      .join('');
    sug.classList.remove('hidden');
  };

  const choose = (r) => {
    if (!r) return;
    sug.classList.add('hidden');
    q.blur();
    if (r.type === 'device') {
      select(r.id);
      mapApi.focusDevice(r.id);
    } else {
      setView('lotes');
      mapApi.fitFence(r.id);
    }
  };

  q.addEventListener('input', () => {
    state.query = q.value.trim().toLowerCase();
    clear.classList.toggle('hidden', !q.value);
    clear.classList.toggle('grid', !!q.value);
    renderSug();
    notify();
  });
  q.addEventListener('focus', renderSug);
  q.addEventListener('blur', () => setTimeout(() => sug.classList.add('hidden'), 150));
  q.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      sug.classList.add('hidden');
      q.blur();
    }
  });
  sug.addEventListener('mousedown', (e) => e.preventDefault());
  sug.addEventListener('click', (e) => {
    const b = e.target.closest('[data-i]');
    if (b) choose(results[Number(b.dataset.i)]);
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    choose(compute()[0]);
  });
  clear.addEventListener('click', () => {
    q.value = '';
    q.dispatchEvent(new Event('input'));
    q.focus();
  });
  box.querySelector('#menu-btn').addEventListener('click', () => window.dispatchEvent(new Event('open-drawer')));

  // Chips de filtro
  const chipsEl = document.getElementById('chips');
  chipsEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-chip]');
    if (!b) return;
    const [k, v] = b.dataset.chip.split(':');
    if (k === 'links') return links.toggle(b);
    const c = state.chips;
    if (k === 'status') c.status = c.status === v ? null : v;
    if (k === 'nivel') c.nivel = c.nivel === v ? null : v;
    if (k === 'sonda') c.sonda = !c.sonda;
    if (k === 'clear') state.chips = { status: null, nivel: null, sonda: false };
    notify();
  });

  const links = createLinksMenu(() => notify());
  chipsEl.addEventListener('scroll', () => links.isOpen() && links.reanchor(chipsEl.querySelector('[data-chip="links:1"]')));

  let last = '';
  subscribe(() => {
    const c = state.chips;
    const counts = { running: 0, idle: 0, nosignal: 0 };
    state.devices.forEach((_, id) => counts[statusOf(id)]++);
    const any = c.status || c.nivel || c.sonda;
    const html = [
      `<button type="button" class="fchip" data-chip="links:1" aria-haspopup="true" aria-expanded="${links.isOpen()}" aria-pressed="${links.isOpen()}">
        ${icon('external', 'h-4 w-4')}Enlaces<span class="transition-transform ${links.isOpen() ? '' : 'rotate-180'}">${icon('chevronUp', 'h-4 w-4')}</span></button>`,
      ...STATUS_CHIPS.map(
        ([k, label, dot]) =>
          `<button type="button" class="fchip" data-chip="status:${k}" aria-pressed="${c.status === k}">
            <span class="h-2 w-2 rounded-full ${dot}"></span>${label}<span class="font-mono text-xs opacity-70">${counts[k]}</span></button>`,
      ),
      `<button type="button" class="fchip" data-chip="nivel:A" aria-pressed="${c.nivel === 'A'}">${icon('bolt', 'h-4 w-4')}Nivel A · D+</button>`,
      `<button type="button" class="fchip" data-chip="nivel:B" aria-pressed="${c.nivel === 'B'}">${icon('chip', 'h-4 w-4')}Nivel B · CAN</button>`,
      `<button type="button" class="fchip" data-chip="sonda:1" aria-pressed="${c.sonda}">${icon('fuel', 'h-4 w-4')}Con sonda</button>`,
      any ? `<button type="button" class="fchip text-accent" data-chip="clear:1">${icon('x', 'h-4 w-4')}Quitar filtros</button>` : '',
    ].join('');
    if (html !== last) {
      chipsEl.innerHTML = last = html;
      if (links.isOpen()) links.reanchor(chipsEl.querySelector('[data-chip="links:1"]'));
    }
    if (document.activeElement === q) renderSug();
  });

}
