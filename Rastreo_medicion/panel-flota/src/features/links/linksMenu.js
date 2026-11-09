// Menú desplegable "Enlaces" de la barra de chips: grupos que se expanden con más enlaces.
// Se dibuja fuera de la barra de chips (que tiene scroll horizontal) para que no se recorte.
import { icon } from '../../components/icons.js';
import { escapeHtml } from '../../lib/format.js';
import { LINK_GROUPS } from '../../config/links.js';
import { linkCard } from '../../components/linkCard.js';

export function createLinksMenu(onChange = () => {}) {
  const el = document.createElement('div');
  el.hidden = true;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'Enlaces');
  el.className = 'fixed z-50 w-[440px] max-w-[calc(100vw-24px)] overflow-hidden rounded-3xl border border-line bg-panel shadow-panel';
  el.innerHTML = `
    <div class="flex items-center justify-between border-b border-line px-4 py-3">
      <span class="text-sm font-semibold">Enlaces del proyecto</span>
      <button type="button" data-links-expand class="text-xs font-medium text-accent hover:underline">Expandir todo</button>
    </div>
    <div class="max-h-[70vh] overflow-y-auto p-2">
      ${LINK_GROUPS.map(
        (g, i) => `
        <details class="group/det rounded-2xl" ${i === 0 ? 'open' : ''}>
          <summary class="flex cursor-pointer list-none items-center gap-3 rounded-2xl px-3 py-2.5 hover:bg-raise [&::-webkit-details-marker]:hidden">
            <span class="grid h-8 w-8 place-items-center rounded-xl bg-raise">${icon(g.icon, 'h-4 w-4')}</span>
            <span class="flex-1 text-sm font-medium">${escapeHtml(g.title)}</span>
            <span class="font-mono text-xs text-muted">${g.links.length}</span>
            <span class="text-muted transition-transform group-open/det:rotate-180">${icon('chevronUp', 'h-4 w-4 rotate-180')}</span>
          </summary>
          <div class="grid grid-cols-2 gap-2 px-1 pb-2 pt-1">
            ${g.links.map((l) => linkCard(l, { icon: g.icon })).join('')}
          </div>
        </details>`,
      ).join('')}
    </div>`;
  document.getElementById('root').appendChild(el);

  let anchor = null;
  const place = () => {
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    const w = el.offsetWidth || 440;
    el.style.top = `${r.bottom + 8}px`;
    el.style.left = `${Math.max(12, Math.min(r.left, window.innerWidth - w - 12))}px`;
  };
  const close = () => {
    if (el.hidden) return;
    el.hidden = true;
    onChange(false);
  };

  el.querySelector('[data-links-expand]').addEventListener('click', (e) => {
    const all = [...el.querySelectorAll('details')];
    const openAll = all.some((d) => !d.open);
    all.forEach((d) => (d.open = openAll));
    e.currentTarget.textContent = openAll ? 'Contraer todo' : 'Expandir todo';
  });
  // Captura: el mapa detiene la propagación de sus clics.
  document.addEventListener(
    'pointerdown',
    (e) => {
      if (!el.hidden && !el.contains(e.target) && !e.target.closest('[data-chip="links:1"]')) close();
    },
    true,
  );
  document.addEventListener('keydown', (e) => e.key === 'Escape' && close());
  window.addEventListener('resize', place);

  return {
    isOpen: () => !el.hidden,
    toggle(btn) {
      anchor = btn;
      if (el.hidden) {
        el.hidden = false;
        place();
        onChange(true);
      } else close();
    },
    reanchor(btn) {
      anchor = btn;
      place();
    },
  };
}
