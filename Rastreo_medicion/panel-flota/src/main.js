import './styles/main.css';
import { createClient } from './api/index.js';
import { state, notify, applyMessage, setEngineToday } from './features/fleet/store.js';
import { renderShell } from './components/shell.js';
import { initSearch } from './features/search/search.js';
import { initLotes } from './features/lotes/lotes.js';
import { initReports } from './features/reports/reports.js';
import { initList } from './features/fleet/list.js';
import { initDetail } from './features/fleet/detail.js';
import { initAlerts } from './features/alerts/alerts.js';
import { initMap } from './features/map/map.js';
import { initScene3dModal } from './features/escena3d/modal.js';
import { showLogin } from './features/login/login.js';
import { initProfile } from './features/profile/profile.js';
import { initSimulator } from './features/simulator/simulator.js';
import { initView3d } from './features/escena3d/view3d.js';
import { initFenceSettings, initDeviceSettings } from './features/settings/settings.js';
import { startOfToday } from './lib/format.js';

const app = document.getElementById('app');
const client = createClient();
state.mode = client.mode;

async function boot() {
  try {
    state.user = await client.getSession();
  } catch (e) {
    if (e.status === 401) return showLogin(app, client, boot);
    return fatal();
  }

  const onLogout = async () => {
    try {
      await client.logout();
    } finally {
      location.hash = '#/entrar';
      location.reload();
    }
  };
  renderShell(app, { onLogout });

  try {
    const [devices, positions, geofences] = await Promise.all([
      client.getDevices(),
      client.getPositions(),
      client.getGeofences(),
    ]);
    state.geofences = geofences || [];
    applyMessage({ devices, positions });

    const ids = devices.map((d) => d.id);
    const from = startOfToday();
    const to = new Date();
    const [summary, events] = await Promise.all([
      client.getSummary(ids, from, to).catch(() => []),
      client.getEvents(ids, from, to).catch(() => []),
    ]);
    setEngineToday(summary);
    applyMessage({ events: (events || []).slice(-200) });
  } catch {
    return fatal();
  }

  initSearch();
  initList();
  initAlerts();
  initLotes();
  initReports();
  initDetail(client);
  initProfile(client, { onLogout });
  initFenceSettings(client);
  initDeviceSettings(client);
  initSimulator();
  initView3d();
  initScene3dModal();
  initMap();

  client.connect(
    (msg) => applyMessage(msg),
    (s) => {
      state.conn = s;
      notify();
    },
  );
  // Refresca "hace X min" y los estados "sin señal" aunque no lleguen mensajes.
  setInterval(notify, 30_000);
  notify();
}

function fatal() {
  app.innerHTML = `
    <main class="grid min-h-screen place-items-center px-4">
      <div class="grid max-w-md gap-3 rounded-lg border border-line bg-panel p-6">
        <h1 class="font-display text-3xl font-bold">No se pudo cargar la flota</h1>
        <p class="text-sm text-muted">El servidor de rastreo no respondió. Revisa tu conexión o que el servidor Traccar esté encendido, y vuelve a intentar.</p>
        <button type="button" id="retry" class="btn btn-primary justify-self-start">Reintentar</button>
      </div>
    </main>`;
  app.querySelector('#retry').addEventListener('click', boot);
}

boot();
