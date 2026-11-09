# Versiones antiguas

Solo para consulta. **No es la base de trabajo**: el proyecto oficial es `../2026-11-07_recuperado/` (bundle compilado y parcheado).

## `panel-flota/` (archivado el 8 nov 2026)

Fuente Vite + JS vanilla del panel (Tailwind, Leaflet, d3, three, Chart.js), con pruebas Jest (126 al archivarse).
Es la copia de `versiones/actual` del commit `a169f2af`, más lo que se le portó desde el bundle antes de descartar el plan:

| Se portó | Dónde |
|---|---|
| API del panel (`/api/panel`): sesión, cuentas, foto de perfil, ajustes, ruta | `src/api/panel.js`, `src/api/index.js`, `src/lib/photo.js` |
| Login con Google y Apple | `src/features/login/social.js` |
| Combustible y velocidad (4 pestañas, Chart.js) | `src/features/stats/` |
| Portada "Inicio" estilo Debian (clima, noticias, Earth) | `src/features/home/`, `src/styles/home.css` |
| Página Status | `src/features/status/`, `src/styles/status.css` |

No se portaron: menú Tools, búsqueda global, costeo semanal de diésel ni `mapx.js` (herramientas extra del mapa).
El plan y los hallazgos están en `../../docs/PLAN-PORTAR-FUENTE.md` (archivado).

Para usarlo: `cd versiones/antiguas/panel-flota && npm install && npm run dev` (sin `node_modules/` ni `dist/`, que no se versionan).

Historial: los commits `e44f9476` a `b0bc1627` de la rama `reorganizar-rastreo`.
