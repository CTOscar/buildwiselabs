// Cliente simulado con la MISMA interfaz que el de Traccar.
// Sirve mientras el backend no existe. Todos los datos son de ejemplo.

const FLEET = 85;
// Marcas/modelos de ejemplo para el modo simulado.
const MARCAS = [
  { marca: 'john-deere', modelo: '5075E' },
  { marca: 'new-holland', modelo: 'TT4.75' },
  { marca: 'john-deere', modelo: '6110J' },
  { marca: 'new-holland', modelo: 'T6.110' },
  { marca: 'john-deere', modelo: '5090E' },
];
const LEVEL_A = 55;
const TICK_MS = 2000;
// Cada tick de 2 s equivale a 1 min de trabajo, para ver avanzar las horas.
const ENGINE_MS_PER_TICK = 60_000;

let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const pick = (a) => a[Math.floor(rnd() * a.length)];

// Zona de ejemplo: sur de Sinaloa (alrededor de 22.998, -105.878).
const RANCHOS = [
  { name: 'El Álamo', lat: 23.012, lon: -105.902 },
  { name: 'Las Palmas', lat: 22.982, lon: -105.858 },
  { name: 'San Isidro', lat: 23.034, lon: -105.852 },
];

function buildGeofences() {
  const list = [];
  let id = 1;
  RANCHOS.forEach((r) => {
    for (let k = 0; k < 3; k++) {
      const lat = r.lat + (k - 1) * 0.011;
      const lon = r.lon + (k % 2 ? 0.008 : -0.008);
      const d = 0.0045;
      const pts = [
        [lat - d, lon - d * 1.3],
        [lat - d, lon + d * 1.3],
        [lat + d, lon + d * 1.3],
        [lat + d, lon - d * 1.3],
        [lat - d, lon - d * 1.3],
      ];
      // Traccar guarda las áreas en WKT con orden "lat lon".
      list.push({
        id: id++,
        name: `${r.name} · Lote ${k + 1}`,
        area: `POLYGON((${pts.map((p) => `${p[0].toFixed(5)} ${p[1].toFixed(5)}`).join(', ')}))`,
        center: [lat, lon],
        half: d,
      });
    }
  });
  return list;
}

export function createMockClient() {
  const now = () => new Date().toISOString();
  const geofences = buildGeofences();
  const devices = [];
  const positions = new Map();
  const engineToday = new Map();
  let posId = 1;
  let evId = 1;

  for (let i = 1; i <= FLEET; i++) {
    const r = rnd();
    const state = r < 0.58 ? 'running' : r < 0.9 ? 'idle' : 'nosignal';
    const fence = pick(geofences);
    const nivel = i <= LEVEL_A ? 'A' : 'B';
    const lastUpdate = state === 'nosignal' ? new Date(Date.now() - (2 + rnd() * 20) * 3600e3).toISOString() : now();
    devices.push({
      id: i,
      name: `TRC-${String(i).padStart(4, '0')}`,
      uniqueId: `86${String(1000000000000 + i * 7919).slice(0, 13)}`,
      status: state === 'nosignal' ? 'offline' : 'online',
      lastUpdate,
      category: 'tractor',
      attributes: { nivel, sondaBLE: nivel === 'A' && i % 4 === 0, ...MARCAS[i % MARCAS.length] },
    });
    const lat = fence.center[0] + (rnd() - 0.5) * fence.half * 1.6;
    const lon = fence.center[1] + (rnd() - 0.5) * fence.half * 2;
    const running = state === 'running';
    positions.set(i, {
      id: posId++,
      deviceId: i,
      latitude: lat,
      longitude: lon,
      course: Math.floor(rnd() * 360),
      speed: running ? 2 + rnd() * 4 : 0,
      fixTime: lastUpdate,
      geofenceIds: [fence.id],
      attributes: {
        ignition: running,
        motion: running,
        hours: Math.round((1500 + rnd() * 6000) * 3600e3),
        power: running ? 14.1 : 12.5,
        ...(nivel === 'A' && i % 4 === 0 ? { fuel: Math.round(60 + rnd() * 180) } : {}),
        ...(nivel === 'B' ? { fuel: Math.round(80 + rnd() * 200), rpm: running ? 1500 + Math.round(rnd() * 600) : 0 } : {}),
      },
    });
    engineToday.set(i, state === 'nosignal' ? 0 : Math.round((0.3 + rnd() * 6.5) * 3600e3));
  }

  const fenceName = (id) => geofences.find((g) => g.id === id)?.name;
  const mkEvent = (deviceId, type, attributes = {}, minutesAgo = 0) => ({
    id: evId++,
    type,
    deviceId,
    eventTime: new Date(Date.now() - minutesAgo * 60e3).toISOString(),
    geofenceId: positions.get(deviceId)?.geofenceIds?.[0] || 0,
    attributes,
  });

  const history = [];
  for (let k = 0; k < 14; k++) {
    const d = 1 + Math.floor(rnd() * FLEET);
    const type = pick(['ignitionOn', 'ignitionOn', 'ignitionOff', 'geofenceEnter', 'deviceFuelDrop', 'alarm']);
    history.push(mkEvent(d, type, type === 'alarm' ? { alarm: 'powerCut' } : {}, 10 + k * 22));
  }

  // Recorrido simulado: un tractor trabaja el lote surco por surco (ida y vuelta).
  const route = { id: null, speed: 1, plan: null };
  const LANES = 12;
  const STEP = 0.0001; // ~11 m por tick a 1x
  function furrowStep(p) {
    const f = geofences.find((g) => g.id === p.geofenceIds?.[0]) || geofences[0];
    const latMin = f.center[0] - f.half * 0.9;
    const latMax = f.center[0] + f.half * 0.9;
    const lonMin = f.center[1] - f.half * 1.3 * 0.92;
    const lonMax = f.center[1] + f.half * 1.3 * 0.92;
    const gap = (latMax - latMin) / (LANES - 1);
    if (!route.plan || route.plan.fence !== f.id) {
      const lane = Math.max(0, Math.min(LANES - 1, Math.round((p.latitude - latMin) / gap)));
      route.plan = { fence: f.id, lane, up: lane < LANES - 1, dir: p.longitude < f.center[1] ? 1 : -1, turning: true };
    }
    const pl = route.plan;
    const lat0 = p.latitude;
    const lon0 = p.longitude;
    let budget = STEP * route.speed;
    while (budget > 1e-9) {
      const targetLat = latMin + pl.lane * gap;
      if (pl.turning) {
        // Cabecera: cambia de surco moviéndose en latitud.
        const d = targetLat - p.latitude;
        const m = Math.min(Math.abs(d), budget);
        p.latitude += Math.sign(d) * m;
        budget -= m;
        if (Math.abs(targetLat - p.latitude) < 1e-9) pl.turning = false;
      } else {
        const edge = pl.dir > 0 ? lonMax : lonMin;
        const d = edge - p.longitude;
        const m = Math.min(Math.abs(d), budget);
        p.longitude += Math.sign(d) * m;
        budget -= m;
        if (Math.abs(edge - p.longitude) < 1e-9) {
          pl.dir *= -1;
          if (pl.up && pl.lane >= LANES - 1) pl.up = false;
          else if (!pl.up && pl.lane <= 0) pl.up = true;
          pl.lane += pl.up ? 1 : -1;
          pl.turning = true;
        }
      }
    }
    // Rumbo en grados (0 = norte), corrigiendo la escala de la longitud.
    const dy = p.latitude - lat0;
    const dx = (p.longitude - lon0) * Math.cos((p.latitude * Math.PI) / 180);
    if (dx || dy) p.course = (Math.round((Math.atan2(dx, dy) * 180) / Math.PI) + 360) % 360;
    p.speed = 3.6 + rnd() * 0.6; // ~7 km/h en nudos (la velocidad 2×/4× es cámara rápida)
  }

  const clone = (o) => JSON.parse(JSON.stringify(o));
  const delay = (v) => new Promise((r) => setTimeout(() => r(clone(v)), 250));

  // Cuentas simuladas guardadas en el navegador (solo modo simulado).
  const USERS_KEY = 'pf-mock-users';
  const SESSION_KEY = 'pf-mock-session';
  const store = {
    get(k, s = localStorage) {
      try {
        return JSON.parse(s.getItem(k));
      } catch {
        return null;
      }
    },
    set(k, v, s = localStorage) {
      try {
        s.setItem(k, JSON.stringify(v));
      } catch {
        /* almacenamiento no disponible */
      }
    },
    del(k) {
      try {
        localStorage.removeItem(k);
        sessionStorage.removeItem(k);
      } catch {
        /* nada */
      }
    },
  };
  const users = () =>
    store.get(USERS_KEY) || [
      { id: 1, name: 'Usuario Demo', email: 'demo@buildwiselabs.mx', password: 'demo1234', phone: '', attributes: { puesto: 'Departamento de Maquinaria' } },
    ];
  const saveUsers = (list) => store.set(USERS_KEY, list);
  const publicUser = (u) => {
    const { password, ...rest } = u;
    void password;
    return rest;
  };
  const fail = (status, message) => new Promise((_, rej) => setTimeout(() => rej(Object.assign(new Error(message), { status })), 300));
  const sessionId = () => store.get(SESSION_KEY) ?? store.get(SESSION_KEY, sessionStorage);

  return {
    mode: 'mock',
    fenceName,
    getSession: () => {
      const u = users().find((x) => x.id === sessionId());
      return u ? delay(publicUser(u)) : fail(401, 'Sin sesión');
    },
    login: (email, password, remember = true) => {
      const u = users().find((x) => x.email.toLowerCase() === String(email).toLowerCase() && x.password === password);
      if (!u) return fail(401, 'Credenciales incorrectas');
      store.set(SESSION_KEY, u.id, remember ? localStorage : sessionStorage);
      return delay(publicUser(u));
    },
    logout: () => {
      store.del(SESSION_KEY);
      return delay(null);
    },
    register: (user) => {
      const list = users();
      if (list.some((x) => x.email.toLowerCase() === user.email.toLowerCase())) return fail(400, 'El correo ya existe');
      const u = { ...user, id: Math.max(0, ...list.map((x) => x.id)) + 1 };
      saveUsers([...list, u]);
      return delay(publicUser(u));
    },
    resetPassword: () => delay(null),
    updateUser: (user) => {
      const list = users();
      const i = list.findIndex((x) => x.id === user.id);
      if (i < 0) return fail(404, 'No encontrado');
      if (list.some((x) => x.id !== user.id && x.email.toLowerCase() === user.email.toLowerCase())) return fail(400, 'El correo ya existe');
      list[i] = { ...list[i], ...user, password: user.password || list[i].password };
      saveUsers(list);
      return delay(publicUser(list[i]));
    },
    openIdUrl: () => null,
    getDevices: () => {
      const saved = store.get('pf-mock-devices') || {};
      devices.forEach((d) => {
        if (saved[d.id]) Object.assign(d, { name: saved[d.id].name, attributes: { ...d.attributes, ...saved[d.id].attributes } });
      });
      return delay(devices);
    },
    updateDevice: (upd) => {
      const d = devices.find((x) => x.id === upd.id);
      if (!d) return fail(404, 'No encontrado');
      if (devices.some((x) => x.id !== upd.id && x.name.toLowerCase() === String(upd.name).toLowerCase())) return fail(400, 'Nombre repetido');
      Object.assign(d, { name: upd.name, attributes: { ...upd.attributes } });
      const saved = store.get('pf-mock-devices') || {};
      saved[d.id] = { name: d.name, attributes: d.attributes };
      store.set('pf-mock-devices', saved);
      return delay(d);
    },
    getPositions: () => delay([...positions.values()]),
    getGeofences: () => {
      const saved = store.get('pf-mock-fences') || {};
      return delay(geofences.map(({ id, name, area }) => ({ id, name, area, attributes: {}, ...(saved[id] || {}) })));
    },
    updateGeofence: (g) => {
      const saved = store.get('pf-mock-fences') || {};
      saved[g.id] = { name: g.name, attributes: g.attributes || {} };
      store.set('pf-mock-fences', saved);
      const base = geofences.find((x) => x.id === g.id);
      if (base) base.name = g.name;
      return delay({ ...g });
    },
    // Solo modo simulado: arranca/detiene el recorrido de un tractor (id null = detener).
    simulateRoute: (id, speed = 1) => {
      if (route.id !== id) route.plan = null;
      route.id = id;
      route.speed = speed;
      return Promise.resolve({ id, speed });
    },
    getSummary: () => delay([...engineToday].map(([deviceId, engineHours]) => ({ deviceId, engineHours }))),
    getEvents: () => delay(history),

    connect(onMessage, onStatus) {
      onStatus('connecting');
      let tick = 0;
      const t0 = setTimeout(() => onStatus('online'), 600);
      const timer = setInterval(() => {
        tick++;
        const out = { positions: [], events: [], devices: [] };
        const online = devices.filter((d) => d.status === 'online' && d.id !== route.id);

        // Tractor en recorrido simulado: reporta cada tick y avanza por surcos.
        const rd = route.id != null && devices.find((d) => d.id === route.id);
        if (rd) {
          const p = positions.get(rd.id);
          const a = p.attributes;
          if (rd.status !== 'online') {
            rd.status = 'online';
            out.devices.push(clone(rd));
            out.events.push(mkEvent(rd.id, 'deviceOnline'));
          }
          if (!a.ignition) {
            a.ignition = true;
            a.power = 14.1;
            out.events.push(mkEvent(rd.id, 'ignitionOn'));
          }
          a.motion = true;
          a.hours += ENGINE_MS_PER_TICK;
          if (typeof a.fuel === 'number') a.fuel = Math.max(0, a.fuel - 0.25);
          if (a.rpm !== undefined) a.rpm = 1700 + Math.round(rnd() * 250);
          furrowStep(p);
          p.id = posId++;
          p.fixTime = now();
          rd.lastUpdate = p.fixTime;
          out.positions.push(clone(p));
        }

        for (let n = 0; n < 14; n++) {
          const d = pick(online);
          const p = positions.get(d.id);
          const a = p.attributes;
          const roll = rnd();

          if (a.ignition && roll < 0.04) {
            a.ignition = false;
            a.motion = false;
            p.speed = 0;
            a.power = 12.5;
            out.events.push(mkEvent(d.id, 'ignitionOff'));
          } else if (!a.ignition && roll < 0.08) {
            a.ignition = true;
            a.power = 14.1;
            out.events.push(mkEvent(d.id, 'ignitionOn'));
          } else if (!a.ignition && typeof a.fuel === 'number' && roll > 0.985) {
            a.fuel = Math.max(0, a.fuel - 35);
            out.events.push(mkEvent(d.id, 'deviceFuelDrop', { fuelDrop: 35 }));
          } else if (roll > 0.996) {
            out.events.push(mkEvent(d.id, 'alarm', { alarm: 'powerCut' }));
          }

          if (a.ignition) {
            a.hours += ENGINE_MS_PER_TICK;
            a.motion = rnd() > 0.2;
            p.speed = a.motion ? 2 + rnd() * 4 : 0;
            p.course = (p.course + (rnd() - 0.5) * 40 + 360) % 360;
            if (a.motion) {
              const rad = (p.course * Math.PI) / 180;
              p.latitude += Math.cos(rad) * 0.00025;
              p.longitude += Math.sin(rad) * 0.00025;
              const f = geofences.find((g) => g.id === p.geofenceIds[0]);
              if (f) {
                p.latitude = Math.min(f.center[0] + f.half, Math.max(f.center[0] - f.half, p.latitude));
                p.longitude = Math.min(f.center[1] + f.half * 1.3, Math.max(f.center[1] - f.half * 1.3, p.longitude));
              }
            }
            if (typeof a.fuel === 'number') a.fuel = Math.max(0, a.fuel - (a.motion ? 0.25 : 0.07));
            if (a.rpm !== undefined) a.rpm = a.motion ? 1500 + Math.round(rnd() * 600) : 850;
          } else if (a.rpm !== undefined) a.rpm = 0;

          p.id = posId++;
          p.fixTime = now();
          d.lastUpdate = p.fixTime;
          out.positions.push(clone(p));
        }

        // Latido: los detenidos reportan cada 30 min en campo; aquí cada ~20 s.
        if (tick % 10 === 0) {
          online.forEach((d) => {
            const p = positions.get(d.id);
            p.fixTime = now();
            d.lastUpdate = p.fixTime;
            out.positions.push(clone(p));
          });
        }

        // De vez en cuando un tractor pierde o recupera señal.
        if (tick % 15 === 0) {
          const d = pick(devices.filter((x) => x.id !== route.id));
          d.status = d.status === 'online' ? 'offline' : 'online';
          if (d.status === 'online') d.lastUpdate = now();
          out.devices.push(clone(d));
          out.events.push(mkEvent(d.id, d.status === 'online' ? 'deviceOnline' : 'deviceOffline'));
        }

        onMessage(out);
      }, TICK_MS);

      return () => {
        clearTimeout(t0);
        clearInterval(timer);
      };
    },
  };
}
