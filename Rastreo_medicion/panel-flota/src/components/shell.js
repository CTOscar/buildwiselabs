import { state, subscribe, notify, setView } from '../features/fleet/store.js';
import { icon } from './icons.js';
import { logoMark, logo } from './brand.js';
import { initials } from '../features/profile/profile.js';
import { mountAppsLauncher, appsPanelHtml } from './apps.js';

const NAV = [
  { view: 'fleet', label: 'Flota', icon: 'tractor' },
  { view: 'alerts', label: 'Alertas', icon: 'bell' },
  { view: 'lotes', label: 'Lotes', icon: 'polygon' },
  { view: 'reports', label: 'Reportes', icon: 'chart' },
  { view: 'sim', label: 'Simulador', icon: 'plug' },
  { view: '3d', label: 'Vista 3D', icon: 'cube' },
];

const CONN = {
  online: ['Conectado', 'border-ok/50 text-ok'],
  connecting: ['Conectando…', 'border-line text-muted'],
  reconnecting: ['Reconectando…', 'border-warn/50 text-warn'],
};

const SHEET = { peek: '136px', half: '46vh', full: 'calc(100% - 72px)' };

/*
  Arquitectura (como un mapa web):
  - Mapa a pantalla completa al fondo.
  - Riel de navegación a la izquierda (escritorio) / menú lateral (celular).
  - Panel lateral con la vista activa (escritorio) / hoja inferior deslizable (celular).
  - Buscador flotante + chips de filtro arriba.
  - Controles flotantes: capas abajo a la izquierda; centrar y zoom abajo a la derecha.
*/
export function renderShell(app, { onLogout }) {
  app.innerHTML = `
  <div id="root" data-panel="open" class="group/app relative h-[100dvh] w-full overflow-hidden bg-ink text-fg">
    <div id="map" class="layer-map absolute inset-0 z-0" aria-label="Mapa de la flota"></div>

    <!-- Riel de navegación (escritorio) -->
    <nav id="rail" aria-label="Secciones"
      class="absolute inset-y-0 left-0 z-40 hidden w-[72px] flex-col items-center gap-2 border-r border-line bg-panel py-3 lg:flex">
      <div class="mb-2 grid h-11 w-11 place-items-center" title="BuildWise Labs · Rastreo y Medición">
        ${logoMark('h-10 w-10')}
      </div>
      ${NAV.map((n) => `
        <button type="button" class="rail-btn" data-view="${n.view}" aria-current="false">
          <span class="relative">${icon(n.icon)}${n.view === 'alerts' ? '<b data-badge class="absolute right-2.5 top-0 hidden min-w-[16px] rounded-full bg-crit px-1 text-[10px] font-semibold leading-4 text-white"></b>' : ''}</span>
          <span>${n.label}</span>
        </button>`).join('')}
      <div class="mt-auto grid justify-items-center gap-2">
        <button type="button" data-act="logout" class="rail-btn" title="Cerrar sesión">
          <span>${icon('logout')}</span><span>Salir</span>
        </button>
      </div>
    </nav>

    <!-- Panel lateral / hoja inferior -->
    <aside id="panel" aria-label="Panel de información"
      class="absolute z-20 flex flex-col overflow-hidden bg-panel shadow-panel transition-[transform,height] duration-300 ease-sheet
             max-lg:inset-x-0 max-lg:bottom-0 max-lg:h-[var(--sheet-h)] max-lg:rounded-t-3xl
             lg:bottom-0 lg:left-[72px] lg:top-0 lg:w-[408px] lg:border-r lg:border-line
             lg:group-data-[panel=closed]/app:-translate-x-full">
      <button type="button" id="sheet-handle" class="grid w-full place-items-center py-2.5 lg:hidden" aria-label="Expandir o contraer panel">
        <span class="h-1.5 w-10 rounded-full bg-line"></span>
      </button>
      <div class="hidden h-[76px] shrink-0 lg:block"></div>
      <section data-section="fleet" class="flex min-h-0 flex-1 flex-col"></section>
      <section data-section="alerts" class="flex min-h-0 flex-1 flex-col"></section>
      <section data-section="lotes" class="flex min-h-0 flex-1 flex-col"></section>
      <section data-section="reports" class="flex min-h-0 flex-1 flex-col"></section>
      <section data-section="device" class="flex min-h-0 flex-1 flex-col"></section>
      <section data-section="profile" class="flex min-h-0 flex-1 flex-col"></section>
      <section data-section="lote" class="flex min-h-0 flex-1 flex-col"></section>
      <section data-section="tractor" class="flex min-h-0 flex-1 flex-col"></section>
    </aside>

    <!-- Pestaña para colapsar el panel (escritorio) -->
    <button type="button" id="panel-toggle" aria-label="Ocultar panel"
      class="absolute top-1/2 z-20 hidden h-12 w-6 -translate-y-1/2 place-items-center rounded-r-lg border border-l-0 border-line bg-panel text-muted shadow-float transition-[left] duration-300 ease-sheet hover:text-fg lg:grid
             lg:left-[480px] lg:group-data-[panel=closed]/app:left-[72px]">
      <span class="transition-transform group-data-[panel=closed]/app:rotate-180">${icon('chevronLeft', 'h-4 w-4')}</span>
    </button>

    <!-- Buscador flotante -->
    <div id="searchbox" class="absolute left-3 right-3 top-3 z-30 lg:left-[84px] lg:right-auto lg:w-[384px]"></div>

    <!-- Chips de filtro -->
    <div id="chips" role="toolbar" aria-label="Filtros"
      class="no-scrollbar absolute left-3 right-3 top-[68px] z-10 flex gap-2 overflow-x-auto pb-2 pr-6 [mask-image:linear-gradient(to_right,black_calc(100%_-_32px),transparent)] transition-[left] duration-300 ease-sheet
             lg:right-[356px] lg:top-3 lg:left-[492px] lg:group-data-[panel=closed]/app:left-[480px]"></div>

    <!-- Estado y usuario (escritorio) -->
    <div class="absolute right-3 top-3 z-10 hidden items-center gap-2 lg:flex">
      <span id="mode"></span>
      <span id="conn" aria-live="polite"></span>
      <div id="apps-launcher"></div>
      <button type="button" data-view="profile" data-avatar class="grid h-10 w-10 place-items-center rounded-full bg-white font-semibold text-black shadow-float ring-1 ring-black/10 transition hover:ring-accent/40" aria-label="Mi perfil" title="Mi perfil"></button>
    </div>

    <!-- Capas (abajo a la izquierda) -->
    <button type="button" id="layer-btn" aria-label="Cambiar capa del mapa"
      class="group absolute z-10 hidden h-[76px] w-[76px] overflow-hidden rounded-xl shadow-float ring-2 ring-panel transition-[left] duration-300 ease-sheet sm:block
             bottom-6 left-3 lg:left-[492px] lg:group-data-[panel=closed]/app:left-[84px] max-lg:bottom-[calc(var(--sheet-h)_+_12px)]">
      <span id="layer-thumb" class="absolute inset-0 transition-transform group-hover:scale-110"></span>
      <span class="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-4 text-xs font-semibold text-white">
        ${icon('layers', 'h-3.5 w-3.5')}<span id="layer-label">Satélite</span>
      </span>
    </button>

    <!-- Controles del mapa (abajo a la derecha) -->
    <div class="absolute bottom-6 right-3 z-10 flex flex-col items-center gap-3 max-lg:bottom-[calc(var(--sheet-h)_+_12px)]">
      <button type="button" id="ctl-layer-sm" class="fab sm:hidden" aria-label="Cambiar capa del mapa">${icon('layers')}</button>
      <button type="button" id="ctl-fit" class="fab" aria-label="Ver toda la flota" title="Ver toda la flota">${icon('target')}</button>
      <div class="grid overflow-hidden rounded-full bg-panel shadow-float ring-1 ring-line/60">
        <button type="button" id="ctl-zin" class="grid h-10 w-10 place-items-center hover:bg-raise" aria-label="Acercar">${icon('plus')}</button>
        <span class="mx-2 h-px bg-line"></span>
        <button type="button" id="ctl-zout" class="grid h-10 w-10 place-items-center hover:bg-raise" aria-label="Alejar">${icon('minus')}</button>
      </div>
    </div>

    <!-- Simulador de instalación: ocupa el área del mapa -->
    <section id="sim-view" hidden aria-label="Simulador de instalación" class="absolute inset-0 z-[35] lg:left-[72px]"></section>
    <!-- Vista 3D: ocupa el área del mapa -->
    <section id="scene-view" hidden aria-label="Tractor en 3D" class="absolute inset-0 z-[35] lg:left-[72px]"></section>

    <!-- Menú lateral (celular) -->
    <div id="drawer" class="fixed inset-0 z-50 hidden" role="dialog" aria-modal="true" aria-label="Menú">
      <div data-act="drawer-close" class="absolute inset-0 bg-black/40"></div>
      <div class="absolute inset-y-0 left-0 flex w-72 flex-col gap-1 overflow-y-auto bg-panel p-3 shadow-panel">
        <div class="mb-3 flex items-center gap-3 px-2 py-2">
          <div class="grid gap-1.5">${logo({ mark: 'h-8 w-8', text: 'text-lg' })}<div class="eyebrow">Panel de flota · Rastreo y Medición</div></div>
        </div>
        ${NAV.map((n) => `
          <button type="button" data-view="${n.view}" class="flex items-center gap-4 rounded-full px-4 py-3 text-left text-sm font-medium hover:bg-raise aria-[current=true]:bg-accent/15 aria-[current=true]:text-accent" aria-current="false">
            ${icon(n.icon)}<span>${n.label}</span>
          </button>`).join('')}
        <button type="button" data-view="profile" class="flex items-center gap-4 rounded-full px-4 py-3 text-left text-sm font-medium hover:bg-raise aria-[current=true]:bg-accent/15 aria-[current=true]:text-accent" aria-current="false">
          ${icon('user')}<span>Mi perfil</span>
        </button>
        <details class="mt-2 rounded-2xl border border-line p-2">
          <summary class="flex cursor-pointer list-none items-center gap-4 rounded-full px-2 py-2 text-sm font-medium">${icon('apps')}<span>Servicios BuildWise</span></summary>
          <div class="pt-2">${appsPanelHtml()}</div>
        </details>
        <div class="mt-auto flex flex-wrap gap-2 px-2 pt-3" id="drawer-status"></div>
        <button type="button" data-act="logout" class="mt-2 flex items-center gap-4 rounded-full px-4 py-3 text-left text-sm font-medium hover:bg-raise">${icon('logout')}<span>Cerrar sesión</span></button>
      </div>
    </div>
  </div>`;

  const root = app.querySelector('#root');
  mountAppsLauncher(app.querySelector('#apps-launcher'));
  const panel = app.querySelector('#panel');
  const drawer = app.querySelector('#drawer');

  const paintAvatar = () =>
    app.querySelectorAll('[data-avatar]').forEach((a) => {
      a.textContent = initials(state.user?.name);
      a.title = state.user?.name ? `Mi perfil · ${state.user.name}` : 'Mi perfil';
    });
  paintAvatar();
  window.addEventListener('user-updated', paintAvatar);

  app.addEventListener('click', (e) => {
    const nav = e.target.closest('[data-view]');
    if (nav) {
      setView(nav.dataset.view);
      drawer.classList.add('hidden');
      return;
    }
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'logout') onLogout();
    if (act === 'drawer-close') drawer.classList.add('hidden');
  });
  window.addEventListener('open-drawer', () => drawer.classList.remove('hidden'));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') drawer.classList.add('hidden');
  });

  app.querySelector('#panel-toggle').addEventListener('click', () => {
    state.panelOpen = !state.panelOpen;
    notify();
  });
  app.querySelector('#sheet-handle').addEventListener('click', () => {
    state.sheet = { peek: 'half', half: 'full', full: 'peek' }[state.sheet];
    notify();
  });

  const modeEl = app.querySelector('#mode');
  const connEl = app.querySelector('#conn');
  const drawerStatus = app.querySelector('#drawer-status');
  const sections = [...panel.querySelectorAll('[data-section]')];

  subscribe(() => {
    root.dataset.panel = state.panelOpen ? 'open' : 'closed';
    app.querySelector('#panel-toggle').setAttribute('aria-label', state.panelOpen ? 'Ocultar panel' : 'Mostrar panel');
    document.documentElement.style.setProperty('--sheet-h', SHEET[state.sheet]);
    sections.forEach((s) => (s.hidden = s.dataset.section !== state.view));
    sections.forEach((s) => s.classList.toggle('hidden', s.dataset.section !== state.view));

    const active = state.view === 'device' ? state.backView : state.view === 'lote' ? 'lotes' : state.view === 'tractor' ? 'fleet' : state.view;
    app.querySelectorAll('[data-view]').forEach((b) => b.setAttribute('aria-current', String(b.dataset.view === active)));

    const mode =
      state.mode === 'mock'
        ? '<span class="chip border-warn/50 bg-panel text-warn shadow-float" title="El backend aún no está conectado">Datos simulados</span>'
        : '<span class="chip border-ok/50 bg-panel text-ok shadow-float">En vivo · Traccar</span>';
    const [label, cls] = CONN[state.conn] || CONN.connecting;
    const conn = `<span class="chip ${cls} bg-panel shadow-float"><span class="h-1.5 w-1.5 rounded-full bg-current"></span>${label}</span>`;
    if (modeEl.innerHTML !== mode) modeEl.innerHTML = mode;
    if (connEl.innerHTML !== conn) connEl.innerHTML = conn;
    if (drawerStatus.innerHTML !== mode + conn) drawerStatus.innerHTML = mode + conn;
  });
}
