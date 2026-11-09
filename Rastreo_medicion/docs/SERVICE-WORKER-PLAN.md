# Service worker y seguridad · Panel de Flota

**Fecha:** 8 de noviembre de 2026
**Base de trabajo:** el **bundle compilado** `versiones/nuevas/2026-11-07_recuperado/panelpack/`
**Estado:** plan y código **propuestos, aún no aplicados**. No se ha creado ningún archivo en `panelpack/`.

> El fuente completo del panel está perdido (ver sección 1). Por eso todo se hace *junto* al bundle, sin editar el JS minificado.

---

## 1. Por qué se trabaja sobre el bundle

| Dónde se buscó | Resultado |
|---|---|
| Git (`a169f2af`, `panel-flota/src`) | Versión **vieja**: sin `api/panel`, `auth/providers`, `getRoute` ni la vista "Combustible y velocidad" |
| 21,068 objetos huérfanos de git | Sin coincidencias útiles (solo librerías ajenas) |
| `public_html.zip` (7 nov) | Build de esa misma versión vieja |
| `Downloads\panel-flota-web.zip` (4 nov) | Otro build compilado, sin fuente |
| Resto del disco | Sin otra copia de `panel-flota` |

Esas funciones solo existen minificadas dentro del recuperado (más `home.js`, `mapx.js` y `statuspage.js`, que nunca tuvieron fuente modular).
El fuente viejo quedó restaurado en `Rastreo_medicion/panel-flota/` (solo en el índice de git, sin commit) por si sirve de base más adelante.

**Decisión (opción 2):** el recuperado es el artefacto oficial. Se agrega service worker, hashes de contenido y seguridad encima. Más adelante se pueden ir extrayendo módulos del minificado, pantalla por pantalla.

---

## 2. Paso 1 · Auditoría de red (hecho)

| Tipo | Quién | Tratamiento |
|---|---|---|
| App (`index.html`, JS, CSS, `brand/`) | Tu dominio, 1.5 MB de `assets` | Guardar de antemano |
| API del panel (`/api/panel/*`: sesión, perfil, foto) | `api-panelpack.buildwiselabs.net` | **Nunca guardar** |
| Noticias | `buildwiselabs.net/api/news`, `api.rss2json.com`, `news.google.com` | Red primero, respaldo = último guardado |
| Clima y radar | `api.open-meteo.com`, `api.rainviewer.com` | Igual, vigencia corta |
| Mosaicos de mapa | OpenStreetMap, ArcGIS, NASA GIBS | Guardar los vistos, con tope |
| Imágenes pesadas | `login-campo.webp` (953 KB), `fmc130.png` y `fmc150.png` (~190 KB c/u) | Guardar al pedirlas, no de antemano |

### Hallazgos de la auditoría

- `mapx.js:478` ejecuta `setInterval(place, 800)`: recalcula la posición cada 0.8 s, siempre. Gasta batería en un celular. **Pendiente de corregir** (no es del service worker).
- `api.rss2json.com` es un tercero gratuito que reenvía las noticias de Google. Si cae o limita, se rompe la sección Agro. Es más fiable usar `/api/news` propio, que en tu `backend/src/news.js` local ya tiene la categoría `agro` (en producción todavía **no**: `?cat=agro` da HTTP 400).
- `login-campo.webp` (953 KB) se descarga en el login, antes de que el usuario entre.

---

## 3. Paso 2 · Estrategia (decidida: versión A)

**Versión A:** funciona sin conexión **solo la app**. Los datos de tractores no se guardan, así no queda información privada en el teléfono. Se puede pasar a la versión B (guardar la última lista de flota, y borrarla al cerrar sesión) si hace falta en el campo.

1. **App:** `index.html` va "red primero" (para recibir actualizaciones); los archivos con nombre de hash van "caché primero".
2. **`/api/*`:** siempre a la red. Sin conexión devuelve un 503 limpio. **Nada privado se guarda**, incluida la foto de perfil.
3. **Datos de terceros** (clima, noticias): red primero con 4 s de espera; si falla, lo último guardado marcado como desactualizado (`X-SW-Stale`).
4. **Mosaicos:** guardar los vistos, máximo ~300.
5. **Actualizaciones:** versión explícita en `sw.js`, limpieza de cachés viejas al activar, y **aviso al usuario** ("Actualizar") en lugar de recargar solo.

---

## 4. Paso 3 · Código propuesto (PENDIENTE DE APROBACIÓN)

Tres cambios. Ninguno está escrito todavía en `panelpack/`.

### 4.1 `panelpack/sw.js` (nuevo)

```js
/* Service worker del Panel de Flota — versión A: solo la app funciona sin conexión.
 * Regla de oro: NADA privado se guarda. /api/* (sesión, perfil, foto, flota) va siempre a la red. */
const VERSION = 'v1';                       // súbela en cada cambio del panel
const SHELL = `pf-shell-${VERSION}`;        // app: HTML, JS, CSS, logos
const RUNTIME = `pf-runtime-${VERSION}`;    // imágenes pesadas y datos públicos (clima, noticias)
const TILES = `pf-tiles-${VERSION}`;        // mosaicos de mapa vistos
const ALL = [SHELL, RUNTIME, TILES];
const MAX_TILES = 300;
const NET_TIMEOUT = 4000;

// Lo mínimo para abrir la app sin red. Los chunks pesados (tractorScene, 497 KB) se guardan al usarse.
const PRECACHE = [
  '/', '/index.html',
  '/assets/index-Bka7l8xf.js', '/assets/index-onqEVLWB.css',
  '/assets/jquery.min.js', '/assets/home.js', '/assets/mapx.js', '/assets/statuspage.js',
  '/brand/favicon.png', '/brand/buildwise-mark.webp', '/brand/las-cabras-logo.webp',
];

const TILE_HOSTS = /(^|\.)(tile\.openstreetmap\.org|arcgisonline\.com|earthdata\.nasa\.gov)$/;
const DATA_HOSTS = /^(api\.open-meteo\.com|api\.rainviewer\.com|api\.rss2json\.com|buildwiselabs\.net)$/;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(PRECACHE.map((u) => new Request(u, { cache: 'reload' })))));
  // sin skipWaiting aquí: la versión nueva espera a que el usuario acepte (ver sw-register.js)
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('pf-') && !ALL.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (e) => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;                       // nunca tocamos POST/PUT/DELETE
  const url = new URL(req.url);
  const same = url.origin === self.location.origin;

  // 1) API (propia o api-panelpack): solo red, jamás caché. Sin red → 503 limpio.
  if ((same && url.pathname.startsWith('/api/')) || url.hostname.startsWith('api-panelpack.')) {
    e.respondWith(fetch(req).catch(() => json503()));
    return;
  }
  // 2) Navegación: red primero (para recibir actualizaciones), respaldo = index.html guardado.
  if (req.mode === 'navigate') {
    e.respondWith(withTimeout(fetch(req)).catch(() => caches.match('/index.html')));
    return;
  }
  // 3) Archivos de la app: caché primero.
  if (same && /^\/(assets|brand|brands|links)\//.test(url.pathname)) {
    e.respondWith(cacheFirst(req, /\/assets\/.*\.(js|css)$/.test(url.pathname) ? SHELL : RUNTIME));
    return;
  }
  // 4) Mosaicos de mapa: lo guardado primero, y se refresca en segundo plano.
  if (!same && TILE_HOSTS.test(url.hostname)) {
    e.respondWith(tile(req));
    return;
  }
  // 5) Datos públicos (clima, radar, noticias): red primero; sin red, lo último guardado.
  if (!same && DATA_HOSTS.test(url.hostname)) {
    e.respondWith(networkFirstStale(req));
  }
  // Todo lo demás pasa sin tocar.
});

const json503 = () => new Response('{"error":"Sin conexión"}', { status: 503, headers: { 'Content-Type': 'application/json' } });
const withTimeout = (p) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), NET_TIMEOUT))]);

async function cacheFirst(req, name) {
  const cache = await caches.open(name);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

// Los <img> de Leaflet piden sin CORS (respuesta "opaca" que Chrome cuenta como ~7 MB de cuota).
// Se vuelve a pedir con CORS para guardar una respuesta normal y de peso real; si el servidor no lo permite, no se guarda.
async function tile(req) {
  const cache = await caches.open(TILES);
  const hit = await cache.match(req.url);
  const refresh = fetch(req.url, { mode: 'cors' }).then(async (res) => {
    if (res.ok) { await cache.put(req.url, res.clone()); trim(cache); }
    return res;
  }).catch(() => null);
  if (hit) { refresh; return hit; }
  return (await refresh) || fetch(req).catch(() => new Response('', { status: 504 }));
}
async function trim(cache) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - MAX_TILES; i++) await cache.delete(keys[i]);
}

async function networkFirstStale(req) {
  const cache = await caches.open(RUNTIME);
  try {
    const res = await withTimeout(fetch(req));
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    const hit = await cache.match(req);
    if (!hit) return json503();
    const h = new Headers(hit.headers); h.set('X-SW-Stale', '1');       // para poder avisar "dato guardado"
    return new Response(hit.body, { status: hit.status, headers: h });
  }
}
```

### 4.2 `panelpack/sw-register.js` (nuevo)

```js
/* Registra el service worker, avisa de versiones nuevas y de falta de conexión. */
(() => {
  if (!('serviceWorker' in navigator)) return;
  const seguro = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  if (!seguro) return;

  const barra = (texto, boton, alPulsar) => {
    const d = document.createElement('div');
    d.setAttribute('role', 'status');
    d.style.cssText = 'position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:99999;background:#111;color:#fff;padding:10px 14px;border-radius:10px;font:14px system-ui;display:flex;gap:12px;align-items:center;box-shadow:0 4px 20px #0006';
    d.append(texto);
    if (boton) { const b = document.createElement('button'); b.textContent = boton; b.style.cssText = 'background:#49e07f;border:0;border-radius:8px;padding:6px 10px;font-weight:600;cursor:pointer'; b.onclick = alPulsar; d.append(b); }
    document.body.append(d);
    return d;
  };

  window.addEventListener('load', async () => {
    const reg = await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch(() => null);
    if (!reg) return;
    reg.addEventListener('updatefound', () => {
      const nuevo = reg.installing;
      nuevo.addEventListener('statechange', () => {
        if (nuevo.state === 'installed' && navigator.serviceWorker.controller)
          barra('Hay una versión nueva del panel', 'Actualizar', () => nuevo.postMessage('SKIP_WAITING'));
      });
    });
    let recargado = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (!recargado) { recargado = true; location.reload(); } });
    setInterval(() => reg.update().catch(() => {}), 30 * 60 * 1000);   // busca versión nueva cada 30 min
  });

  let off = null;
  const estado = () => { if (!navigator.onLine && !off) off = barra('Sin conexión · mostrando lo guardado'); else if (navigator.onLine && off) { off.remove(); off = null; } };
  addEventListener('online', estado); addEventListener('offline', estado); estado();
})();
```

### 4.3 `panelpack/index.html`: una línea

```html
    <script defer src="/sw-register.js"></script>
```
Se agrega junto a los otros `<script defer>`.

### Puntos a revisar antes de aprobar

- `/api/*` nunca se guarda (incluye `/users/:id/photo`).
- La versión nueva espera la aprobación del usuario (botón "Actualizar").
- `VERSION` se sube **a mano** en cada cambio. Más adelante se puede automatizar con un hash del contenido, lo que además resuelve el problema de nombres de archivo que no cambian al editar el bundle.
- Valores ajustables: tope de 300 mosaicos, 4 s de espera, texto de las barras, lista de `PRECACHE`.
- Por verificar: qué pantalla muestra el panel cuando falla `/api/panel/session` sin red (el bundle llama a una función `ts()` en ese caso).

---

## 5. Pasos que siguen

| # | Paso | Estado |
|---|---|---|
| 1 | Auditoría de red | Hecho |
| 2 | Estrategia (versión A) | Decidida |
| 3 | Código de `sw.js` y registro | **Propuesto, falta aprobar** |
| 4 | Escribir los archivos y probar sin conexión (navegador sin interfaz, red apagada, con capturas) | Pendiente |
| 5 | Seguridad (ver abajo) | Pendiente |
| 6 | Hashes de contenido / versionado automático | Pendiente |

---

## 6. Seguridad · pendientes concretos

| Dónde | Problema | Arreglo propuesto |
|---|---|---|
| `api-panelpack` · `console.log` | El token de recuperación de contraseña se **escribe en el log** en texto plano (README: "falta SMTP") | Configurar SMTP, o dejar de loguear el token. Los dos tokens vistos (7 nov, 22:52) ya vencieron |
| `api-panelpack` · `.env` | No se ha revisado (tiene la contraseña de MySQL y `INGEST_KEY`) | Revisarlo directamente en el servidor, **no pasarlo por el chat** |
| `backend` (`buildwiselabs.net`) | `helmet` con `contentSecurityPolicy: false` | Activar una CSP; hay que listar los hosts de la auditoría (sección 2) |
| `backend` · `JWT_SECRET` | Menos de 32 caracteres (aviso en cada arranque) | Alargarlo (cierra las sesiones activas) |
| `backend` · Ethereum | El proveedor (Nodies) rechaza `eth_getBlockByNumber` con transacciones completas | Pedir el bloque sin cuerpos o cambiar de plan |
| Front | El recuperado traía un parche que se saltaba el login | **Arreglado** (ver `patch/patch.cjs` línea 18 y el respaldo `index-Bka7l8xf.js.bak-sesion-dev`) |
| Front | Cookie de sesión | La API ya pone `Secure` con `NODE_ENV=production`; verificarlo en Hostinger |

---

## 7. Estado del entorno local (al guardar este documento)

- El servidor del panel (8080) y la API en memoria (3000) **fueron detenidos** porque el sistema se quedó con poca memoria. No se reinician sin que lo pidas.
- La API en memoria pierde sus cuentas al detenerse, así que la cuenta de prueba que se registró ya no existe.
- Para probar el service worker se necesita el servidor del panel; hay que avisar antes de levantarlo.
