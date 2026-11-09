import { state } from '../fleet/store.js';
import { escapeHtml } from '../../lib/format.js';

// La escena 3D se carga bajo demanda (dynamic import) para no pesar en la carga inicial.
export function initScene3dModal() {
  const dlg = document.createElement('dialog');
  dlg.className =
    'w-[min(1120px,96vw)] max-h-[94vh] overflow-hidden rounded-lg border border-line bg-panel p-0 text-fg backdrop:bg-black/70';
  dlg.setAttribute('aria-labelledby', 'sd-title');
  dlg.innerHTML = `
    <div class="flex items-center gap-3 border-b border-line px-4 py-3">
      <div>
        <div class="eyebrow" id="sd-sub">Instalación</div>
        <h2 id="sd-title" class="font-display text-2xl font-bold leading-none">Tractor en 3D</h2>
      </div>
      <button type="button" id="sd-close" class="btn ml-auto">Cerrar</button>
    </div>
    <div class="grid md:grid-cols-[minmax(0,1fr)_300px]">
      <div id="sd-stage" class="relative h-[55vh] overflow-hidden bg-ink md:h-[70vh]">
        <div id="sd-msg" class="absolute inset-0 grid place-items-center p-6 text-center text-sm text-muted">Cargando escena 3D…</div>
      </div>
      <div class="grid content-start gap-3 border-t border-line p-4 md:border-l md:border-t-0">
        <div class="flex flex-wrap gap-2">
          <button type="button" id="sd-eng" class="btn" aria-pressed="false">Encender motor</button>
          <button type="button" id="sd-x" class="btn" aria-pressed="true">Rayos X</button>
          <button type="button" id="sd-home" class="btn">Vista general</button>
        </div>
        <ol id="sd-list" class="grid gap-0.5"></ol>
        <div id="sd-card" class="grid gap-1.5 border-t border-line pt-3" aria-live="polite"></div>
      </div>
    </div>`;
  document.body.appendChild(dlg);

  const $ = (s) => dlg.querySelector(s);
  let scene = null;
  let comps = [];

  function card(id) {
    const c = comps.find((x) => x.id === id);
    $('#sd-list')
      .querySelectorAll('button')
      .forEach((b) => b.setAttribute('aria-current', String(b.dataset.id === id)));
    $('#sd-card').innerHTML = c
      ? `<span class="font-mono text-[11px] uppercase tracking-widest text-accent">${escapeHtml(c.tag)}</span>
         <h3 class="font-display text-2xl font-bold leading-tight">${escapeHtml(c.n)}</h3>
         <p class="text-sm text-fg/80">${escapeHtml(c.d)}</p>
         <p class="font-mono text-xs text-muted">${escapeHtml(c.c)}</p>`
      : '<p class="text-sm text-muted">Toca un número en la escena o en la lista para ver cada pieza.</p>';
  }

  window.addEventListener('open-scene3d', async (e) => {
    const dev = state.devices.get(e.detail?.id);
    const nivel = dev?.attributes?.nivel || 'A';
    $('#sd-title').textContent = dev ? `${dev.name} en 3D` : 'Tractor en 3D';
    $('#sd-sub').textContent = `Instalación · nivel ${nivel}`;
    $('#sd-msg').classList.remove('hidden');
    $('#sd-msg').textContent = 'Cargando escena 3D…';
    $('#sd-eng').setAttribute('aria-pressed', 'false');
    $('#sd-eng').textContent = 'Encender motor';
    $('#sd-x').setAttribute('aria-pressed', 'true');
    dlg.showModal();
    try {
      const mod = await import('../../three/tractorScene.js');
      if (!dlg.open) return;
      scene = mod.mountTractorScene($('#sd-stage'), { nivel, onSelect: card });
      comps = scene.components;
      $('#sd-list').innerHTML = comps
        .map(
          (c, i) => `<li><button type="button" data-id="${c.id}" aria-current="false"
            class="grid w-full grid-cols-[24px_1fr] items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-raise aria-[current=true]:bg-raise">
            <span class="grid h-6 w-6 place-items-center rounded-full border border-accent font-mono text-[11px] text-accent">${i + 1}</span>${escapeHtml(c.n)}</button></li>`,
        )
        .join('');
      card(null);
      $('#sd-msg').classList.add('hidden');
    } catch (err) {
      $('#sd-msg').classList.remove('hidden');
      $('#sd-msg').textContent = 'No se pudo iniciar la vista 3D en este navegador. Prueba con otro navegador o activa la aceleración por hardware.';
      console.error(err);
    }
  });

  $('#sd-list').addEventListener('click', (e) => {
    const b = e.target.closest('[data-id]');
    if (b) scene?.select(b.dataset.id);
  });
  $('#sd-eng').addEventListener('click', (e) => {
    const on = e.currentTarget.getAttribute('aria-pressed') !== 'true';
    e.currentTarget.setAttribute('aria-pressed', String(on));
    e.currentTarget.textContent = on ? 'Apagar motor' : 'Encender motor';
    scene?.setEngine(on);
  });
  $('#sd-x').addEventListener('click', (e) => {
    const on = e.currentTarget.getAttribute('aria-pressed') !== 'true';
    e.currentTarget.setAttribute('aria-pressed', String(on));
    scene?.setXray(on);
  });
  $('#sd-home').addEventListener('click', () => {
    scene?.home();
    card(null);
  });
  $('#sd-close').addEventListener('click', () => dlg.close());
  dlg.addEventListener('close', () => {
    scene?.dispose();
    scene = null;
  });
}
