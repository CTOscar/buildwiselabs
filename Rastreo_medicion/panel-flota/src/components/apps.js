// Lanzador de servicios BuildWise Labs (como el menú de apps junto al perfil).
// Edita SERVICES para cambiar nombres, íconos o enlaces.
import { icon } from './icons.js';

const SITE = 'https://buildwiselabs.net';

// Rutas confirmadas en el sitio: /servicios/chatbot. Las demás apuntan al inicio
// del sitio hasta tener su ruta exacta. Los servicios con `soon: true` aún no existen:
// se muestran con la etiqueta "Pronto"; al tener su dirección, cambia `soon` por `href`.
export const SERVICES = [
  // color: color del ícono. img: ruta a un logo propio o con licencia (p. ej. '/brand/correo.svg');
  // si existe, se muestra en lugar del ícono.
  { id: 'rastreo', name: 'Rastreo y Medición', icon: 'tractor', color: '#1c965e', current: true },
  { id: 'correo', name: 'Correo Rastreo', icon: 'inbox', color: '#d6453a', soon: true, desc: 'Gestor de correo personalizado para Rastreo y Medición' },
  { id: 'chatbot', name: 'Chatbot IA', icon: 'chat', color: '#7a32ee', href: `${SITE}/servicios/chatbot`, desc: 'Asistente de BuildWise Labs' },
  { id: 'modelos', name: 'Modelos de IA', icon: 'sparkles', color: '#e0791e', soon: true, desc: 'Elige un modelo y hazle preguntas a tu gusto' },
  { id: 'seguridad', name: 'Seguridad y Redes', icon: 'shield', color: '#0a58f0', href: SITE },
  { id: 'docs', name: 'Documentación', icon: 'book', color: '#0e8f80', href: SITE },
  { id: 'contacto', name: 'Contacto', icon: 'phone', color: '#c026d3', href: SITE },
];

function tile(s) {
  const inner = `
    <span class="grid h-12 w-12 place-items-center rounded-2xl bg-white shadow-float ring-1 ring-line transition group-hover:scale-105" style="color:#000000">
      ${s.img ? `<img src="${s.img}" alt="" class="h-7 w-7 object-contain" />` : icon(s.icon, 'h-7 w-7')}</span>
    <span class="line-clamp-2 text-center text-xs font-medium leading-tight">${s.name}</span>
    ${s.current ? '<span class="absolute right-2 top-2 h-2 w-2 rounded-full bg-ok" title="Estás aquí"></span>' : ''}
    ${s.soon ? '<span class="absolute right-1 top-1 rounded-full bg-accent/15 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-accent">Pronto</span>' : ''}`;
  const cls = 'group relative grid justify-items-center gap-2 rounded-2xl px-1 py-3 transition hover:bg-raise focus-visible:bg-raise';
  if (s.current) return `<button type="button" data-app-close class="${cls}" aria-current="page" title="Estás aquí">${inner}</button>`;
  if (s.soon) return `<div class="${cls} cursor-default opacity-90" title="${s.desc || s.name} · próximamente">${inner}</div>`;
  return `<a href="${s.href}" target="_blank" rel="noopener" class="${cls}" ${s.desc ? `title="${s.desc}"` : ''}>${inner}</a>`;
}

export function appsPanelHtml() {
  return `
    <div class="flex items-center justify-between px-2 pb-2">
      <span class="text-sm font-semibold">Servicios BuildWise Labs</span>
      <span class="eyebrow">${SERVICES.length}</span>
    </div>
    <div class="grid grid-cols-3 gap-1">${SERVICES.map(tile).join('')}</div>
    <a href="${SITE}" target="_blank" rel="noopener" class="mt-2 flex items-center justify-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium text-accent transition hover:bg-raise">
      Ver todo en buildwiselabs.net ${icon('external', 'h-4 w-4')}
    </a>`;
}

// Botón de 9 puntos + panel flotante. Se monta en el contenedor que recibe.
export function mountAppsLauncher(container) {
  container.innerHTML = `
    <button type="button" data-apps-btn aria-haspopup="true" aria-expanded="false" aria-label="Servicios BuildWise Labs" title="Servicios BuildWise Labs"
      class="grid h-10 w-10 place-items-center rounded-full text-fg transition hover:bg-panel hover:shadow-float aria-expanded:bg-panel aria-expanded:shadow-float">
      ${icon('apps', 'h-5 w-5')}
    </button>
    <div data-apps-panel hidden role="dialog" aria-label="Servicios BuildWise Labs"
      class="absolute right-0 top-12 z-50 w-[328px] max-w-[calc(100vw-24px)] origin-top-right rounded-3xl border border-line bg-panel p-3 shadow-panel">
      ${appsPanelHtml()}
    </div>`;
  container.classList.add('relative');
  const btn = container.querySelector('[data-apps-btn]');
  const panel = container.querySelector('[data-apps-panel]');
  const set = (open) => {
    panel.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    if (open) panel.querySelector('a,button')?.focus();
  };
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    set(panel.hidden);
  });
  panel.addEventListener('click', (e) => {
    if (e.target.closest('[data-app-close]')) set(false);
  });
  document.addEventListener(
    'pointerdown',
    (e) => {
      if (!panel.hidden && !container.contains(e.target)) set(false);
    },
    true,
  );
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.hidden) {
      set(false);
      btn.focus();
    }
  });
}
