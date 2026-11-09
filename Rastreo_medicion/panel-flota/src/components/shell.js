import { state, subscribe, notify, setView, select } from '../features/fleet/store.js';
import { icon } from './icons2.js';
import { logoMark, wordmark } from './brand.js';
import { initials } from '../features/profile/profile.js';
import { applyPhotos } from '../lib/photo.js';
import { mountAppsLauncher } from './apps.js';
import { MODULES, tabsOf, moduleOf, activeTab, pageOf } from './nav.js';
import { stateBlock } from './ui.js';

const CONN = {
  online: ['Conectado', 'border-ok/50 text-ok'],
  connecting: ['Conectando…', 'border-line text-muted'],
  reconnecting: ['Reconectando…', 'border-warn/50 text-warn'],
};
const NAV_KEY = 'pf-nav-collapsed';

const readCollapsed = () => {
  try {
    return localStorage.getItem(NAV_KEY) === '1';
  } catch {
    return false;
  }
};
const saveCollapsed = (v) => {
  try {
    localStorage.setItem(NAV_KEY, v ? '1' : '0');
  } catch {
    /* almacenamiento no disponible */
  }
};

/*
  Arquitectura (al estilo de un centro de operaciones):
  - Barra lateral izquierda colapsable con los 5 módulos (escritorio) / barra inferior (móvil).
  - Barra superior: título del módulo, buscador global (unidades y lotes), estado y perfil.
  - Pestañas del módulo y área de contenido.
  - Panel de unidad: capa lateral (escritorio) o inferior (móvil) que se abre desde cualquier pantalla.
*/
export function renderShell(app, { onLogout }) {
  const moduleBtns = (cls) =>
    MODULES.map(
      (m) => `<button type="button" data-module="${m.id}" class="${cls}" aria-current="false" title="${m.label}">
        ${icon(m.icon, 'h-5 w-5 shrink-0')}<span class="nav-label">${m.label}</span></button>`,
    ).join('');

  app.innerHTML = `
  <div id="root" data-nav="${readCollapsed() ? 'collapsed' : 'open'}" class="group/app flex h-[100dvh] w-full overflow-hidden bg-ink text-fg">
    <a href="#content" class="sr-only z-[60] rounded-lg bg-panel px-3 py-2 focus:not-sr-only focus:absolute focus:left-2 focus:top-2">Saltar al contenido</a>

    <!-- Barra lateral (escritorio) -->
    <nav id="sidebar" aria-label="Módulos"
      class="hidden w-64 shrink-0 flex-col border-r border-line bg-panel transition-[width] duration-200 lg:flex group-data-[nav=collapsed]/app:w-[76px]">
      <div class="flex h-16 shrink-0 items-center gap-3 border-b border-line px-5" title="BuildWise Labs · Rastreo y Medición">
        ${logoMark('h-9 w-9 shrink-0')}
        <span class="nav-label">${wordmark('text-base')}</span>
      </div>
      <div class="grid gap-1 p-3">${moduleBtns('nav-item')}</div>
      <div class="mt-auto grid gap-1 border-t border-line p-3">
        <button type="button" data-act="nav-collapse" class="nav-item" aria-expanded="true" title="Contraer menú">
          <span class="transition-transform group-data-[nav=collapsed]/app:rotate-180">${icon('panelLeft', 'h-5 w-5 shrink-0')}</span><span class="nav-label">Contraer menú</span>
        </button>
        <button type="button" data-act="logout" class="nav-item" title="Cerrar sesión">${icon('logout', 'h-5 w-5 shrink-0')}<span class="nav-label">Cerrar sesión</span></button>
      </div>
    </nav>

    <div class="flex min-w-0 flex-1 flex-col">
      <!-- Barra superior -->
      <header class="flex h-16 shrink-0 items-center gap-3 border-b border-line bg-panel px-3 sm:px-4">
        <span class="lg:hidden">${logoMark('h-8 w-8')}</span>
        <h1 id="page-title" class="hidden shrink-0 font-display text-xl font-bold tracking-tight sm:block"></h1>
        <div id="searchbox" class="relative ml-auto min-w-0 flex-1 sm:max-w-md lg:ml-4"></div>
        <div class="flex items-center gap-2">
          <span id="mode" class="hidden xl:inline-flex"></span>
          <span id="conn" class="hidden md:inline-flex" aria-live="polite"></span>
          <div id="apps-launcher" class="hidden sm:block"></div>
          <button type="button" data-view="profile" data-avatar class="grid h-10 w-10 place-items-center rounded-full bg-accent font-semibold text-accent-ink ring-1 ring-black/10 transition hover:ring-accent/40" aria-label="Mi perfil" title="Mi perfil"></button>
        </div>
      </header>

      <!-- Pestañas del módulo -->
      <div id="subnav" class="no-scrollbar hidden shrink-0 gap-1 overflow-x-auto border-b border-line bg-panel px-3 sm:px-4" role="tablist" aria-label="Vistas del módulo"></div>

      <!-- Contenido -->
      <main id="content" tabindex="-1" class="relative flex min-h-0 flex-1 flex-col pb-[calc(64px+env(safe-area-inset-bottom))] focus:outline-none lg:pb-0">

        <!-- Inicio -->
        <section data-section="fleet" aria-label="Resumen de la flota" class="min-h-0 flex-1 overflow-y-auto">
          <div class="mx-auto grid w-full max-w-[1600px] gap-4 p-3 sm:p-4 lg:p-6">
            <div id="fleet-kpis" class="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5"></div>
            <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
              <div class="card overflow-hidden">
                <div class="flex flex-wrap items-center gap-2 border-b border-line p-3">
                  <div id="fleet-filters" class="flex flex-wrap items-center gap-2"></div>
                </div>
                <div id="chips" role="toolbar" aria-label="Filtros de estado" class="no-scrollbar flex gap-2 overflow-x-auto border-b border-line p-3"></div>
                <div class="relative h-[52vh] min-h-[340px]">
                  <div id="map" class="layer-map absolute inset-0 z-0" aria-label="Mapa de la flota"></div>
                  <div id="map-tools" class="jd pointer-events-none absolute inset-0 z-10">
                    <div id="map-panel" hidden class="jd-panel pointer-events-auto absolute right-14 top-3"></div>
                    <div id="measure-out" hidden class="jd-measure pointer-events-auto absolute bottom-3 left-3"></div>
                    <div class="pointer-events-auto absolute right-3 top-3 grid gap-2">
                      <div class="jd-group">
                        <button type="button" id="ctl-layers" class="jd-btn" aria-label="Capas del mapa" title="Capas" aria-expanded="false">${icon('layers')}</button>
                        <button type="button" id="ctl-settings" class="jd-btn" aria-label="Configuración del mapa" title="Configuración" aria-expanded="false">${icon('sliders')}</button>
                        <button type="button" id="ctl-measure" class="jd-btn" aria-label="Medir distancia y área" title="Medir" aria-pressed="false">${icon('ruler')}</button>
                      </div>
                      <div class="jd-group">
                        <button type="button" id="ctl-zin" class="jd-btn" aria-label="Acercar" title="Acercar">${icon('plus')}</button>
                        <button type="button" id="ctl-zout" class="jd-btn" aria-label="Alejar" title="Alejar">${icon('minus')}</button>
                      </div>
                      <div class="jd-group">
                        <button type="button" id="ctl-fit" class="jd-btn" aria-label="Ver toda la flota" title="Ver toda la flota">${icon('target')}</button>
                        <button type="button" id="ctl-full" class="jd-btn" aria-label="Pantalla completa" title="Pantalla completa">${icon('expand')}</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div id="home-alerts" class="card flex max-h-[640px] min-h-[320px] flex-col overflow-hidden"></div>
            </div>
            <div class="card overflow-hidden" id="fleet-table"></div>
          </div>
        </section>

        <section data-section="alerts" class="mx-auto min-h-0 w-full max-w-3xl flex-1 flex-col"></section>
        <section data-section="lotes" class="mx-auto min-h-0 w-full max-w-3xl flex-1 flex-col"></section>
        <section data-section="lote" class="mx-auto min-h-0 w-full max-w-3xl flex-1 flex-col"></section>
        <section data-section="reports" class="mx-auto min-h-0 w-full max-w-3xl flex-1 flex-col"></section>
        <section data-section="tractor" class="mx-auto min-h-0 w-full max-w-3xl flex-1 flex-col"></section>
        <section data-section="profile" class="mx-auto min-h-0 w-full max-w-3xl flex-1 flex-col"></section>
        <section data-section="soon" class="min-h-0 flex-1 overflow-y-auto">
          ${stateBlock('empty', { title: 'Módulo en construcción', text: 'Esta sección se habilita en el siguiente avance del rediseño.' })}
        </section>

        <!-- Simulador y Vista 3D: ocupan el área de contenido -->
        <section id="sim-view" hidden aria-label="Simulador de instalación" class="absolute inset-0 z-[5] overflow-y-auto bg-ink"></section>
        <section id="stats-view" hidden aria-label="Combustible y velocidad" class="absolute inset-0 z-[5] bg-ink"></section>
        <section id="scene-view" hidden aria-label="Tractor en 3D" class="absolute inset-0 z-[5] bg-ink"></section>
      </main>
    </div>

    <!-- Barra inferior (móvil y tableta) -->
    <nav id="bottombar" aria-label="Módulos"
      class="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-panel pb-[env(safe-area-inset-bottom)] lg:hidden">
      ${MODULES.map(
        (m) => `<button type="button" data-module="${m.id}" class="tab-item" aria-current="false">
          ${icon(m.icon, 'h-5 w-5')}<span>${m.label}</span></button>`,
      ).join('')}
    </nav>

    <!-- Panel de unidad: se abre desde cualquier pantalla -->
    <div id="unit-layer" hidden class="fixed inset-0 z-50">
      <div data-act="unit-close" class="absolute inset-0 bg-black/40"></div>
      <aside id="unit-drawer" role="dialog" aria-modal="true" aria-label="Detalle de la unidad" tabindex="-1"
        class="absolute flex flex-col overflow-hidden bg-panel shadow-panel focus:outline-none
               inset-y-0 right-0 w-full max-w-[460px] lg:border-l lg:border-line
               max-lg:inset-x-0 max-lg:bottom-0 max-lg:top-auto max-lg:h-[88dvh] max-lg:max-w-none max-lg:rounded-t-3xl">
        <section data-section="device" class="flex min-h-0 flex-1 flex-col pt-2"></section>
      </aside>
    </div>
  </div>`;

  const root = app.querySelector('#root');
  mountAppsLauncher(app.querySelector('#apps-launcher'));
  const content = app.querySelector('#content');
  const subnav = app.querySelector('#subnav');
  const title = app.querySelector('#page-title');
  const unitLayer = app.querySelector('#unit-layer');
  const unitDrawer = app.querySelector('#unit-drawer');
  const collapseBtn = app.querySelector('[data-act="nav-collapse"]');

  const paintAvatar = () =>
    app.querySelectorAll('[data-avatar]').forEach((a) => {
      a.textContent = initials(state.user?.name);
      if (state.user?.id != null) a.dataset.photoUser = state.user.id;
      a.title = state.user?.name ? `Mi perfil · ${state.user.name}` : 'Mi perfil';
      applyPhotos(null, a.parentNode);
    });
  paintAvatar();
  window.addEventListener('user-updated', paintAvatar);

  app.addEventListener('click', (e) => {
    const mod = e.target.closest('[data-module]');
    if (mod) return setView(MODULES.find((m) => m.id === mod.dataset.module).home);
    const nav = e.target.closest('[data-view]');
    if (nav) return setView(nav.dataset.view);
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'logout') onLogout();
    if (act === 'unit-close') select(null);
    if (act === 'nav-collapse') {
      const next = root.dataset.nav !== 'collapsed';
      root.dataset.nav = next ? 'collapsed' : 'open';
      saveCollapsed(next);
      collapseBtn.setAttribute('aria-expanded', String(!next));
      collapseBtn.title = next ? 'Expandir menú' : 'Contraer menú';
      collapseBtn.querySelector('.nav-label').textContent = next ? 'Expandir menú' : 'Contraer menú';
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.view === 'device') select(null);
  });

  const modeEl = app.querySelector('#mode');
  const connEl = app.querySelector('#conn');
  const sections = [...content.querySelectorAll(':scope > [data-section]')];
  let lastPage = '';
  let lastTabs = '';
  let drawerOpen = false;

  subscribe(() => {
    const page = pageOf(state.view, state.backView);
    const mod = moduleOf(state.view, state.backView);

    sections.forEach((s) => {
      const on = s.dataset.section === page;
      s.hidden = !on;
      s.classList.toggle('hidden', !on);
      s.classList.toggle('flex', on && s.dataset.section !== 'fleet' && s.dataset.section !== 'soon');
    });
    if (page !== lastPage) {
      lastPage = page;
      sections.forEach((s) => (s.scrollTop = 0));
    }

    app.querySelectorAll('[data-module]').forEach((b) => b.setAttribute('aria-current', String(b.dataset.module === mod.id)));
    title.textContent = mod.label;
    document.title = `${mod.label} · Panel de flota`;

    const tabs = tabsOf(mod.id);
    const cur = activeTab(state.view, state.backView);
    const tabsHtml =
      tabs.length > 1
        ? tabs.map((t) => `<button type="button" role="tab" data-view="${t.view}" class="tab" aria-selected="${t.view === cur}" aria-current="${t.view === cur ? 'page' : 'false'}">${t.label}</button>`).join('')
        : '';
    if (tabsHtml !== lastTabs) {
      lastTabs = tabsHtml;
      subnav.innerHTML = tabsHtml;
      subnav.classList.toggle('hidden', !tabsHtml);
      subnav.classList.toggle('flex', Boolean(tabsHtml));
    }

    const open = state.view === 'device';
    unitLayer.hidden = !open;
    if (open && !drawerOpen) unitDrawer.focus();
    drawerOpen = open;

    const mode =
      state.mode === 'mock'
        ? '<span class="chip border-warn/50 bg-panel text-warn" title="El backend aún no está conectado">Datos simulados</span>'
        : '<span class="chip border-ok/50 bg-panel text-ok">En vivo · Traccar</span>';
    const [label, cls] = CONN[state.conn] || CONN.connecting;
    const conn = `<span class="chip ${cls} bg-panel"><span class="h-1.5 w-1.5 rounded-full bg-current"></span>${label}</span>`;
    if (modeEl.innerHTML !== mode) modeEl.innerHTML = mode;
    if (connEl.innerHTML !== conn) connEl.innerHTML = conn;
  });
  notify();
}
