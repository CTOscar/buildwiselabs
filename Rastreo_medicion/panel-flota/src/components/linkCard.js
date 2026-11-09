// Tarjeta de enlace con imagen (componente reutilizable).
// Uso: linkCard({ label, note, href, image, price }, { icon: 'chip' })
import { icon } from './icons.js';
import { escapeHtml } from '../lib/format.js';

const host = (href) => {
  try {
    return new URL(href).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

export function linkCard(l, { icon: fallback = 'external' } = {}) {
  const img = l.image
    ? `<img src="${l.image}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer"
         class="h-full w-full object-contain p-2 transition duration-300 group-hover/card:scale-105"
         onerror="this.parentElement.dataset.noimg='1'; this.remove()" />`
    : '';
  return `
    <a href="${l.href}" target="_blank" rel="noopener"
      class="group/card grid overflow-hidden rounded-2xl border border-line bg-panel transition hover:-translate-y-0.5 hover:shadow-float focus-visible:shadow-float">
      <span class="relative grid aspect-[4/3] place-items-center overflow-hidden bg-white text-[#5c6275]" ${l.image ? '' : 'data-noimg="1"'}>
        ${img}
        <span class="pointer-events-none absolute hidden [[data-noimg]>&]:grid">${icon(fallback, 'h-8 w-8')}</span>
        ${l.price ? `<span class="absolute bottom-1.5 left-1.5 rounded-full bg-black/75 px-2 py-0.5 font-mono text-[10px] font-medium text-white">${escapeHtml(l.price)}</span>` : ''}
        <span class="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white opacity-0 transition group-hover/card:opacity-100">${icon('external', 'h-3.5 w-3.5')}</span>
      </span>
      <span class="grid gap-0.5 border-t border-line px-2.5 py-2">
        <span class="line-clamp-2 text-[13px] font-medium leading-snug">${escapeHtml(l.label)}</span>
        ${l.note ? `<span class="truncate text-[11px] text-muted">${escapeHtml(l.note)}</span>` : ''}
        <span class="truncate font-mono text-[10px] text-muted/80">${escapeHtml(host(l.href))}</span>
      </span>
    </a>`;
}
