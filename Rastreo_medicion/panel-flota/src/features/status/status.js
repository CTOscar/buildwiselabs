// Conecta la página Status con el marco de la portada: pinta en #dh-content y atiende sus botones y formularios.
import { createStatus } from './model.js';
import { statusHtml } from './html.js';

function safeStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

// `view` = #home-view. `getLive()` devuelve { running, idle, nosignal } de la flota o null.
export function createStatusPage(view, { getLive = () => null, storage = safeStorage(), confirmFn = (t) => window.confirm(t) } = {}) {
  const model = createStatus({ storage });
  const content = () => view.querySelector('#dh-content');

  function render() {
    const c = content();
    if (!c) return;
    const top = view.scrollTop;
    c.innerHTML = statusHtml(model, getLive());
    view.scrollTop = top;
  }
  const commit = () => {
    model.save();
    render();
  };
  const inStatus = () => Boolean(content()?.querySelector('.hs'));

  view.addEventListener('click', (e) => {
    const b = e.target.closest('[data-hs]');
    if (!b || !inStatus()) return;
    const id = Number(b.dataset.id);
    const a = model.actions;
    switch (b.dataset.hs) {
      case 'admin': a.admin(); break;
      case 'show': {
        const f = view.querySelector(`.hs-form[data-f="${b.dataset.t}"]`);
        const wasOpen = f && !f.hidden;
        view.querySelectorAll('.hs-admin .hs-form').forEach((x) => (x.hidden = true));
        if (f) f.hidden = Boolean(wasOpen);
        return;
      }
      case 'reset':
        if (!confirmFn('¿Restablecer el estado a los datos de demostración?')) return;
        a.reset();
        break;
      case 'mstart': a.startMaint(id); break;
      case 'mdone': a.doneMaint(id); break;
      case 'mdel': a.cancelMaint(id); break;
      default: return;
    }
    commit();
  });

  view.addEventListener('change', (e) => {
    const s = e.target.closest('select[data-comp]');
    if (!s || !inStatus()) return;
    model.actions.setComp(s.dataset.comp, s.value);
    commit();
  });

  view.addEventListener('submit', (e) => {
    const f = e.target.closest('.hs-form');
    if (!f) return;
    e.preventDefault();
    const d = {};
    new FormData(f).forEach((v, k) => (d[k] = String(v).trim()));
    const a = model.actions;
    if (f.dataset.f === 'inc') a.incident(d);
    else if (f.dataset.f === 'upd') a.update(Number(f.dataset.id), d.phase, d.msg);
    else if (f.dataset.f === 'mt') a.maintenance(d);
    commit();
  });

  return { render, model };
}
