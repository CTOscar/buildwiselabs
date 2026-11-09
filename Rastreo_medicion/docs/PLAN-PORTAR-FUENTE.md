# Plan: portar al fuente lo que solo existe en el bundle

**Fecha:** 8 de noviembre de 2026
**Estado:** pasos 1 y 2 hechos; pasos 3 a 5 pendientes.

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

## Paso 3 · Combustible y `getRoute`

- Leer en el bundle `getRoute` (`GET /route`) y `GET /fuel-events`, y la vista "Combustible y velocidad".
- Agregar al cliente y a `mock.js` (misma interfaz) y crear la vista con d3 reutilizando `barChart.js` donde sirva.
- **Listo cuando:** se ve el historial de combustible y velocidad de un tractor, con datos del mock y de la API.

## Paso 4 · `home.js` y `statuspage.js`

- Son páginas sueltas del bundle sin fuente modular. Leerlas y decidir si van como módulos del panel o como páginas aparte.
- `home.js`: dashboard con noticias desde `https://buildwiselabs.net/api/news` (categoría `agro`; en producción aún da 400).
- `mapx.js:478` tiene un `setInterval(place, 800)` que gasta batería: corregirlo al portar.

## Paso 5 · Rehacer las mejoras de velocidad

Ya probadas antes (build y pruebas en verde); se rehacen sobre este fuente:

1. **Carga diferida** de Reportes (d3), Simulador y Vista 3D con `import()` dinámico (función `lazyView()` en `main.js`).
2. **Service worker** `public/sw.js`, registrado solo en producción: nunca toca `/api/*` ni lo que no sea GET; `index.html` red primero; `/assets/*` caché primero; logos, fuentes y mosaicos (tope 300) guardados y refrescados. Plan completo en `SERVICE-WORKER-PLAN.md`.
3. **Skeletons** en las tarjetas KPI y la tabla de unidades desde que se pinta el shell.

Después: mejoras de Leaflet y red (ver `TAREAS-PENDIENTES.md`).

## Al terminar

- Actualizar `CLAUDE.md` y `versiones/LEEME.md`.
- Comparar el build del fuente contra el bundle recuperado y decidir el reemplazo en producción (`panelpack.buildwiselabs.net`).
