# Tareas pendientes · Panel de Flota

**Última actualización:** 8 de noviembre de 2026

## 1. Recuperar el código fuente del panel y mejorar su velocidad

**Estado: DESCARTADO (8 nov 2026).** Se decidió que el bundle `versiones/2026-11-07_recuperado/` es el proyecto oficial y que `panel-flota` (fuente) queda archivado en `versiones/antiguas/panel-flota/`. Lo de abajo es contexto histórico; las mejoras de velocidad se aplicarían sobre el bundle (el service worker se puede agregar junto a él, sin tocar el JS minificado: ver `SERVICE-WORKER-PLAN.md`).

### Situación

- `versiones/2026-11-07_recuperado/panelpack/` es un **bundle compilado y minificado**, sin `src/`, `package.json` ni sourcemaps. No se puede reconstruir el fuente de forma automática.
- La carpeta `panel-flota/` (fuente viejo, nunca commiteada) se **borró** del árbol de trabajo. Sigue en el historial de git: el commit `1b4339ff` tiene 33 archivos de `Rastreo_medicion/panel-flota/src`.
  Se recupera con `git checkout 1b4339ff -- Rastreo_medicion/panel-flota` (desde `E:\PYME`).
- El fuente viejo **no tiene** `api/panel`, el login con Google o Apple, `getRoute`, la vista de combustible, `home.js` ni `statuspage.js`. Esas piezas solo existen minificadas en el bundle recuperado.

### Opciones para tener fuente (elegir una)

| Opción | Qué da | Límite |
|---|---|---|
| A. Restaurar el fuente viejo | Proyecto Vite que corre y se prueba | Versión anterior, le faltan las funciones de arriba |
| B. Reconstruir el fuente desde el bundle | Fuente al día | Lento y con riesgo de errores |
| C. Restaurar A y portar desde el bundle lo que falta (recomendada) | Avance por etapas | No queda todo al día de golpe |

Alternativa: seguir sobre el bundle (service worker y hashes junto a él, sin tocar el JS minificado).

### Mejoras de velocidad ya diseñadas (se perdieron junto con `panel-flota/`)

Se hicieron y probaron (build y 71 pruebas en verde), pero no se commitearon. Hay que rehacerlas sobre el fuente que se elija:

1. **Carga diferida** de Reportes (d3), Simulador y Vista 3D con `import()` dinámico, iniciándolas la primera vez que se abre la vista. Resultado: bundle principal de 278 KB (86 KB comprimido), con chunks aparte para `reports` (60 KB), `simulator` (20 KB) y `view3d` (5 KB). `three` (497 KB) ya era diferido.
2. **Service worker** (`public/sw.js`, registrado solo en producción):
   - Nunca toca `/api/*` ni lo que no sea GET.
   - `index.html` va red primero, con la última copia como respaldo sin conexión.
   - `/assets/*` va caché primero.
   - Logos, fuentes de Google y mosaicos de mapa van guardados y se refrescan en segundo plano (mosaicos con tope de 300).
   - Las cachés viejas se borran al activar. Hay que subir `VERSION` cuando cambie la lógica.
   - Debe servirse desde la raíz del dominio (`/sw.js`). El plan completo está en `SERVICE-WORKER-PLAN.md`.
3. **Skeletons** en las tarjetas KPI y la tabla de unidades, visibles desde que se pinta el shell.

### Después (puntos 4 a 7 de la recomendación)

- **Mapa (Leaflet):** `preferCanvas: true`, mover marcadores con `setLatLng` en vez de recrearlos, `leaflet.markercluster` si crece la flota, debounce de eventos de zoom y movimiento.
- **Red:** cachear respuestas con TTL corto, pedir solo posiciones que cambiaron, evitar peticiones duplicadas y valorar el WebSocket de Traccar (`/api/socket`) en vez de polling.
- **Imágenes y fuentes:** WebP, `loading="lazy"`, `font-display: swap`. `login-campo.webp` (953 KB) se descarga en el login.
- **Render:** actualizar solo los nodos que cambian en vez de reescribir listas con `innerHTML`.
- **Bug conocido del bundle:** `mapx.js` ejecuta `setInterval(place, 800)`, que gasta batería en celular.

### Otros pendientes relacionados

- ~~Actualizar `CLAUDE.md`~~ (hecho el 8 nov 2026: el bundle es el proyecto oficial).
- Mezcla de cambios sin commitear en el repo (`E:\PYME`): decidir qué subir de `Rastreo_medicion/` (`CLAUDE.md`, docs, tests de `panel-flota-api/`, cambios del build recuperado). Los `.bak-*` son respaldos locales y no deberían subirse.
- Aviso de "Actualizar" cuando haya versión nueva del service worker (el plan lo proponía; no se hizo).
