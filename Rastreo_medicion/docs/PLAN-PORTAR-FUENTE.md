# Plan: portar al fuente lo que solo existe en el bundle

**Fecha:** 8 de noviembre de 2026
**Estado:** pasos 1, 2 y 3 hechos; paso 4 en curso por la opción B (portada hecha, ver abajo); paso 5 pendiente.

## Punto de partida

- `Rastreo_medicion/panel-flota/` es el fuente de `versiones/actual` del commit `a169f2af` (71 pruebas). CORRECCIÓN: el commit `22908269` había restaurado por error una versión más vieja (`1b4339ff`); el `e44f9476` lo corrigió.
- `versiones/2026-11-07_recuperado/panelpack/` es el **bundle minificado** (sin sourcemaps). De ahí hay que leer lo que falta. Producción sigue con el bundle.
- Al fuente le faltan: `api/panel`, login con Google/Apple, `getRoute`, vista de combustible y velocidad, `home.js` y `statuspage.js`.
- Una copia de trabajo anterior del fuente (71 pruebas) se borró por error de contexto y no se pudo recuperar entera. Esta restaurada tiene 61 pruebas. Probablemente la diferencia es pequeña, pero no está confirmada.
- Backend de referencia: `panel-flota-api/` (rutas en su `README.md`).

## Reglas para todos los pasos

- Probar cada pieza contra el panel desplegado o el bundle antes de darla por buena.
- Un commit por paso, con prueba nueva si aplica. No desplegar hasta que el fuente iguale al bundle en lo que se usa.
- `VITE_USE_MOCK=false` usa Traccar real; `VITE_PANEL_API_URL` apunta a la API del panel.
- No commitear `.env`, `node_modules/` ni `dist/`.

---

## Paso 1 · API del panel y sesión (HECHO)

**Objetivo:** que el fuente hable con `panel-flota-api` (`/api/panel`) para sesión, registro, login, perfil y foto.

- Leer en el bundle (`index-Bka7l8xf.js`) el cliente de `/api/panel`: `register`, `login`, `session` (GET/DELETE), `users/:id` (PUT perfil y contraseña), `users/:id/photo`, `password/reset` y `password/confirm`.
- Crear un módulo en `src/api/` (por ejemplo `panel.js`) y conectarlo a `src/api/index.js`, sin romper la interfaz común de `mock.js` y `traccar.js`.
- Ajustar `login.js` y `profile.js` para usarlo. Cookie de sesión con `credentials: 'include'`.
- Pruebas: cliente con `fetch` simulado (éxito, 401, errores de validación).
- **Listo cuando:** se puede registrar, entrar, editar perfil, subir foto y salir contra la API real o `npm start` de `panel-flota-api`.

## Paso 2 · Login con Google y Apple (HECHO)

**Depende del paso 1.**

- Leer en el bundle cómo se llama a `GET /auth/providers` y cómo se inician `GET /auth/google` y `GET /auth/apple`.
- Mostrar solo los botones de los proveedores activos que devuelve la API.
- Manejar el regreso del callback y los errores (correo no verificado, cuenta ligada).
- **Listo cuando:** con las variables de Google/Apple definidas en la API, el login con proveedor entra a la misma cuenta aunque cambie el correo.

## Paso 3 · Combustible y `getRoute` (HECHO)

- Leer en el bundle `getRoute` (`GET /route`) y `GET /fuel-events`, y la vista "Combustible y velocidad".
- Agregar al cliente y a `mock.js` (misma interfaz) y crear la vista con d3 reutilizando `barChart.js` donde sirva.
- **Listo cuando:** se ve el historial de combustible y velocidad de un tractor, con datos del mock y de la API.

## Paso 4 · `home.js`, `mapx.js` y `statuspage.js` (ANALIZADO, sin portar)

**Hallazgo:** no están minificados. Son scripts a mano, legibles, que se cargan con `<script defer>` en `index.html` junto a `jquery.min.js` y se enganchan al panel por **`window.__pf`** (lo expone el bundle). El fuente aún no lo expone.

| Script | Tamaño | Qué hace | Se engancha con |
|---|---|---|---|
| `home.js` | 91 KB | Página "Inicio" (réplica de debian.org): clima (Open-Meteo), noticias (`rss2json`), carrusel, migas, Earth, validación de contraseña (`window.__pwOk`/`__pwReq`) | `__pf.w.positions`, `__pf.subscribe`, `window.__pfHome`, `window.__pfStatus` |
| `mapx.js` | 42 KB | Herramientas extra del mapa: rastro por velocidad, calor, etiquetas, radar, reproducción de ruta, paradas, NDVI, agrupación, seguimiento, pantalla completa | `window.L`, `__pf.select`, `__pf.w`, `__pf.subscribe`, contenedor `#map` |
| `statuspage.js` | 24 KB | Página "Status" (estilo statuspage de Hostinger), estado en `localStorage` (`pf-status-v1`) | `__pf.At` (estado de unidad), `__pf.w`, `window.__pfStatus` |

`__pf` expone: `w` (estado), `subscribe`, `select`, `At` (estado de unidad: en marcha / apagado / sin señal).

**Decisión pendiente (elegir):**
- **A (rápida):** copiar los 3 scripts a `panel-flota/public/`, exponer `window.__pf = { w: state, subscribe, select, At: statusOf }` en `main.js` y añadir las etiquetas `<script defer>` a `index.html`. Funciona igual que hoy, pero sigue siendo código "pegado" (jQuery, `window.*`).
- **B (limpia):** reescribir cada uno como módulo ES (`features/home`, `features/map/extra.js`, `features/status`) importando `store.js`. Más trabajo; mejor mantenimiento. `mapx.js` es el que más gana.
- Recomendación: **A ahora** (para igualar al bundle) y **B después**, módulo por módulo.

**Ojo al integrar `home.js`:** el menú del bundle (`go(g)` con `window.__pfHome.show("inicio")`, subpestañas `jd-sub`, "Ver todo…") lo inyectan los parches `patch/*.cjs`; el fuente tiene otra navegación (`nav.js` con módulos). Hay que decidir cómo se abre "Inicio" y "Status" en esa navegación.

**Hallazgo posterior (la opción A no sirve tal cual):** `home.js` no arranca solo. Espera `#root`, `.jd-top` y `window.__pf` (revisa 150 veces cada 200 ms y se rinde) y se cuelga del menú del bundle (`#rail`, `.jd-toolsmenu`, `#menu-btn`, `#searchbox`, `[data-theme-btn]`). Ese menú (`jd-*`) lo arman el bundle minificado y los parches de `patch/` (`gen-nav.cjs`, `home.css`, `extra3..9.css`, `deere.css`). El fuente tiene otra navegación (`nav.js`), así que copiar los scripts los dejaría **inertes, sin error visible**.

Caminos reales:
- **B directa (recomendada):** módulo `features/home` en el fuente, con la maquetación Debian (`dh-*`, 39 clases, sacadas de `patch/home.css`) y la lógica de datos de `home.js` (clima, noticias, KPIs, listas, Earth), abriendo páginas con `setView` en vez de `.jd-*`.
- **A′ (portar el shell del bundle):** llevar el menú `jd-*` (rail, barra superior, menú de herramientas) al fuente y después copiar los scripts. Es casi portar toda la UI del bundle.

**Avance de la opción B (módulo `features/home`):**
- **Hecho:** portada "Inicio" como módulo (`src/features/home/`: `home.js`, `weather.js`, `news.js`, `fleet.js`, `earth.js`, `helpers.js`) con la maquetación Debian (`src/styles/home.css`, 505 reglas extraídas del CSS del bundle y acotadas a `#home-view`). Es la pestaña "Portada" del módulo Inicio (`view: 'home'`). Incluye cabecera con búsqueda, navbar, migas con reloj, portada con logo, KPIs, carrusel (equipo, pronóstico, precipitación, alertas, trabajo), clima, Earth, noticias, alertas, lotes y pie. 15 pruebas nuevas.
- **Status hecho:** página Status como módulo (`src/features/status/`: `model.js`, `html.js`, `status.js`, `src/styles/status.css`), dentro del mismo marco Debian (migas "Inicio / Status"), pestaña Status del módulo Inicio y enlace en la navbar. Modo administrador, incidentes, mantenimientos y disponibilidad de 90 días; datos de demostración en `localStorage` (`pf-status-v1`). 11 pruebas nuevas.
- **Falta:** menú **Tools**, **búsqueda global** (`gsRun`: tractores, IMEI, lotes, combustible, alertas…), **campana** y ventana de **perfil** (el fuente tiene su propio perfil), páginas propias de Lotes/Alertas/Reportes con estilo Debian (el fuente usa sus vistas), **costeo de diésel** semanal, `mapx.js` (herramientas extra del mapa) y que la app **arranque en la portada** (hoy arranca en Resumen).
- Las URLs `/brand/login-campo.webp` (953 KB, fondo de la portada) y el logo HD se copiaron a `public/brand/`.

**Pendientes del bundle al portar:**
- `mapx.js:478` ejecuta `setInterval(place, 800)`, que gasta batería en celular: corregirlo.
- `home.js` usa `api.rss2json.com`: cambiar a `/api/news` propio (categoría `agro`; en producción aún da 400).

## Paso 5 · Rehacer las mejoras de velocidad

Ya probadas antes (build y pruebas en verde); se rehacen sobre este fuente:

1. **Carga diferida** de Reportes (d3), Simulador y Vista 3D con `import()` dinámico (función `lazyView()` en `main.js`).
2. **Service worker** `public/sw.js`, registrado solo en producción: nunca toca `/api/*` ni lo que no sea GET; `index.html` red primero; `/assets/*` caché primero; logos, fuentes y mosaicos (tope 300) guardados y refrescados. Plan completo en `SERVICE-WORKER-PLAN.md`.
3. **Skeletons** en las tarjetas KPI y la tabla de unidades desde que se pinta el shell.

Después: mejoras de Leaflet y red (ver `TAREAS-PENDIENTES.md`).

## Al terminar

- Actualizar `CLAUDE.md` y `versiones/LEEME.md`.
- Comparar el build del fuente contra el bundle recuperado y decidir el reemplazo en producción (`panelpack.buildwiselabs.net`).
