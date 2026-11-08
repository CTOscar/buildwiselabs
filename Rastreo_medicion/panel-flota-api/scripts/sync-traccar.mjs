// Copia las posiciones de Traccar a la base del panel (historial de combustible y velocidad).
// Lee /api/positions de Traccar cada INTERVAL_S segundos y las envía a /api/panel/samples.
// Se ejecuta aparte (en cualquier equipo con acceso a Traccar y a la API):
//   TRACCAR_URL=https://traccar.ejemplo.mx TRACCAR_EMAIL=... TRACCAR_PASSWORD=... \
//   PANEL_API_URL=https://api.panelpack.buildwiselabs.net INGEST_KEY=... npm run sync:traccar
const { TRACCAR_URL, TRACCAR_EMAIL, TRACCAR_PASSWORD, PANEL_API_URL, INGEST_KEY, INTERVAL_S = '60' } = process.env;
for (const [k, v] of Object.entries({ TRACCAR_URL, TRACCAR_EMAIL, TRACCAR_PASSWORD, PANEL_API_URL, INGEST_KEY })) {
  if (!v) {
    console.error(`Falta la variable ${k}`);
    process.exit(1);
  }
}
const base = (u) => u.replace(/\/$/, '');

async function traccarCookie() {
  const res = await fetch(`${base(TRACCAR_URL)}/api/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email: TRACCAR_EMAIL, password: TRACCAR_PASSWORD }),
  });
  if (!res.ok) throw new Error(`Traccar rechazó el acceso (${res.status})`);
  return (res.headers.get('set-cookie') || '').split(';')[0];
}

let cookie = '';
async function tick() {
  if (!cookie) cookie = await traccarCookie();
  const res = await fetch(`${base(TRACCAR_URL)}/api/positions`, { headers: { Cookie: cookie } });
  if (res.status === 401) {
    cookie = '';
    throw new Error('Sesión de Traccar vencida, se reintenta');
  }
  if (!res.ok) throw new Error(`Traccar respondió ${res.status}`);
  const positions = await res.json();
  const samples = positions.map((p) => ({
    deviceId: p.deviceId,
    fixTime: p.fixTime,
    latitude: p.latitude,
    longitude: p.longitude,
    speed: p.speed,
    fuel: p.attributes?.fuel,
    ignition: p.attributes?.ignition,
  }));
  const out = await fetch(`${base(PANEL_API_URL)}/api/panel/samples`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Ingest-Key': INGEST_KEY },
    body: JSON.stringify({ samples }),
  });
  if (!out.ok) throw new Error(`La API del panel respondió ${out.status}`);
  const r = await out.json();
  console.log(`${new Date().toISOString()} · ${r.received} posiciones, ${r.inserted} nuevas`);
}

const loop = async () => {
  try {
    await tick();
  } catch (e) {
    console.error(`${new Date().toISOString()} · ${e.message}`);
  }
  setTimeout(loop, Number(INTERVAL_S) * 1000);
};
loop();
