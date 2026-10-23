// Vista "3D" del riel: el tractor en 3D a pantalla completa (área del mapa),
// con lista de componentes, nivel A/B, motor y rayos X. Three.js se carga bajo demanda.
import { state, subscribe, setView } from '../fleet/store.js';
import { icon } from '../../components/icons.js';
import { escapeHtml } from '../../lib/format.js';

export function initView3d() {
  const host = document.getElementById('scene-view');
  host.innerHTML = `
    <div class="flex h-full flex-col bg-ink">
      <header class="flex flex-wrap items-center gap-3 border-b border-line bg-panel px-4 py-3 lg:px-6">
        <button type="button" data-act="v3-close" class="grid h-10 w-10 place-items-center rounded-full text-muted hover:bg-raise hover:text-fg" aria-label="Volver al mapa">${icon('arrowLeft')}</button>
        <div class="min-w-0">
          <div class="eyebrow">Modelo 3D · instalación</div>
          <h2 class="font-display text-2xl font-bold leading-none tracking-tight">Tractor en 3D</h2>
        </div>
        <div class="ml-auto flex flex-wrap items-center gap-2">
          <div class="flex rounded-full bg-raise p-0.5" role="group" id="v3-level">
            <button type="button" data-v="A" class="rounded-full px-3 py-1 text-xs font-medium transition">Nivel A · D+ y sonda</button>
            <button type="button" data-v="B" class="rounded-full px-3 py-1 text-xs font-medium transition">Nivel B · CAN</button>
          </div>
          <button type="button" data-act="v3-eng" class="btn" aria-pressed="false">Encender motor</button>
          <button type="button" data-act="v3-x" class="btn" aria-pressed="true">Rayos X</button>
          <button type="button" data-act="v3-home" class="btn">Vista general</button>
        </div>
      </header>
      <div class="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div data-stage class="relative min-h-[55vh] overflow-hidden bg-[#0f1416]">
          <div data-msg class="absolute inset-0 grid place-items-center p-6 text-center text-sm text-[#93a0b8]">Cargando escena 3D…</div>
          <p class="pointer-events-none absolute bottom-3 left-4 text-xs text-[#93a0b8]">Arrastra para girar · rueda para acercar · toca un número</p>
        </div>
        <aside class="grid min-h-0 content-start gap-3 overflow-y-auto border-t border-line bg-panel p-4 lg:border-l lg:border-t-0">
          <h3 class="text-sm font-semibold">Componentes</h3>
          <ol data-list class="grid gap-0.5"></ol>
          <div data-card class="grid gap-1.5 border-t border-line pt-3" aria-live="polite"></div>
        </aside>
      </div>
    </div>`;

  const stage = host.querySelector('[data-stage]');
  const msg = host.querySelector('[data-msg]');
  const list = host.querySelector('[data-list]');
  const card = host.querySelector('[data-card]');
  const engBtn = host.querySelector('[data-act="v3-eng"]');
  const xBtn = host.querySelector('[data-act="v3-x"]');
  let scene = null;
  let comps = [];
  let nivel = 'A';
  let open = false;
  let loading = false;

  const intro = () =>
    (card.innerHTML = `<span class="font-mono text-[11px] uppercase tracking-widest text-accent">Cómo funciona</span>
      <h3 class="font-display text-2xl font-bold leading-tight">Horas, diésel y ubicación sin capturar el horómetro</h3>
      <p class="text-sm text-fg/80">Toca un número en la escena o en la lista para ver cada pieza: dónde va, qué mide y cómo se conecta.</p>`);

  function showCard(id) {
    const c = comps.find((x) => x.id === id);
    list.querySelectorAll('button').forEach((b) => b.setAttribute('aria-current', String(b.dataset.id === id)));
    if (!c) return intro();
    card.innerHTML = `<span class="font-mono text-[11px] uppercase tracking-widest text-accent">${escapeHtml(c.tag)}</span>
      <h3 class="font-display text-2xl font-bold leading-tight">${escapeHtml(c.n)}</h3>
      <p class="text-sm text-fg/80">${escapeHtml(c.d)}</p>
      <p class="font-mono text-xs text-muted">${escapeHtml(c.c)}</p>`;
  }

  const paintLevel = () =>
    host.querySelectorAll('#v3-level [data-v]').forEach((b) => {
      const on = b.dataset.v === nivel;
      b.setAttribute('aria-pressed', String(on));
      b.className = `rounded-full px-3 py-1 text-xs font-medium transition ${on ? 'bg-panel text-fg shadow-float' : 'text-muted hover:text-fg'}`;
    });

  async function mount() {
    if (loading) return;
    loading = true;
    scene?.dispose();
    scene = null;
    msg.classList.remove('hidden');
    msg.textContent = 'Cargando escena 3D…';
    try {
      const mod = await import('../../three/tractorScene.js');
      if (!open) return;
      scene = mod.mountTractorScene(stage, { nivel, onSelect: showCard });
      comps = scene.components;
      list.innerHTML = comps
        .map(
          (c, i) => `<li><button type="button" data-id="${c.id}" aria-current="false"
            class="grid w-full grid-cols-[26px_1fr] items-center gap-2.5 rounded-xl px-2 py-2 text-left text-sm transition hover:bg-raise aria-[current=true]:bg-raise">
            <span class="grid h-6 w-6 place-items-center rounded-full border-2 border-accent font-mono text-[11px] font-semibold text-accent">${i + 1}</span>${escapeHtml(c.n)}</button></li>`,
        )
        .join('');
      const on = engBtn.getAttribute('aria-pressed') === 'true';
      scene.setEngine(on);
      scene.setXray(xBtn.getAttribute('aria-pressed') === 'true');
      intro();
      msg.classList.add('hidden');
    } catch (err) {
      console.error(err);
      msg.classList.remove('hidden');
      msg.textContent = 'No se pudo iniciar la vista 3D en este navegador. Prueba con otro navegador o activa la aceleración por hardware.';
    } finally {
      loading = false;
    }
  }

  host.addEventListener('click', (e) => {
    const lv = e.target.closest('#v3-level [data-v]');
    if (lv) {
      if (lv.dataset.v !== nivel) {
        nivel = lv.dataset.v;
        paintLevel();
        mount();
      }
      return;
    }
    const item = e.target.closest('[data-list] [data-id]');
    if (item) return scene?.select(item.dataset.id);
    switch (e.target.closest('[data-act]')?.dataset.act) {
      case 'v3-close':
        setView('fleet');
        break;
      case 'v3-eng': {
        const on = engBtn.getAttribute('aria-pressed') !== 'true';
        engBtn.setAttribute('aria-pressed', String(on));
        engBtn.textContent = on ? 'Apagar motor' : 'Encender motor';
        scene?.setEngine(on);
        break;
      }
      case 'v3-x': {
        const on = xBtn.getAttribute('aria-pressed') !== 'true';
        xBtn.setAttribute('aria-pressed', String(on));
        scene?.setXray(on);
        break;
      }
      case 'v3-home':
        scene?.home();
        showCard(null);
        break;
    }
  });

  paintLevel();
  intro();

  // Monta la escena al abrir y la libera al salir (no consume GPU en segundo plano).
  subscribe(() => {
    const show = state.view === '3d';
    host.hidden = !show;
    if (show && !open) {
      open = true;
      mount();
    } else if (!show && open) {
      open = false;
      scene?.dispose();
      scene = null;
    }
  });
}
