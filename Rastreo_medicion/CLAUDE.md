# Rastreo_medicion

Panel de flota agrícola (Las Cabras, Sinaloa) de BuildWise Labs. Piloto con 3 tractores
(2 John Deere + 1 New Holland) rastreados con Teltonika + Traccar. Idioma del proyecto: español (México).

## Estructura

| Carpeta | Qué es |
|---|---|
| `panel-flota-api/` | Backend Express + MySQL (`/api/panel`): usuarios, sesiones, ajustes, historial |
| `versiones/2026-11-07_recuperado/` | **Proyecto oficial.** Build compilado y parcheado a mano (con `home.js`, `mapx.js`, `statuspage.js`). No hay código fuente modular: se trabaja sobre el bundle y sus parches (`patch/`). Sin desplegar en producción |
| `versiones/antiguas/panel-flota/` | Fuente Vite del panel, **archivado** (versión anterior al bundle, con intentos de portar API, login social, combustible, portada y Status). Solo consulta; ver `versiones/antiguas/LEEME.md` |
| `docs/` | Documentación técnica (ver abajo) |

## Comandos

- Panel oficial (bundle): no se compila. Se edita `versiones/2026-11-07_recuperado/panelpack/` (y sus scripts `patch/*.cjs`) y se publica esa carpeta.
- Fuente archivado (`versiones/antiguas/panel-flota/`): `npm install`, `npm run dev`, `npm run build`, `npm test`. Ya no es la base de trabajo.
- API (`panel-flota-api/`): `npm start`, `npm run dev`, `npm test` (sin MySQL), `npm run check:db`,
  `npm run sync:traccar`. Requiere `.env` (copiar de `.env.example`).

## Arquitectura clave

- En el fuente archivado, `src/api/index.js` elige entre `mock.js` y `traccar.js` (misma interfaz). El bundle oficial
  trae lo mismo ya compilado (`VITE_USE_MOCK`, `VITE_PANEL_API_URL`).
- Traccar es la fuente de posiciones en vivo; `panel-flota-api` guarda historial y todo lo propio del panel.
- Producción: `panelpack.buildwiselabs.net` (Hostinger); API en `api-panelpack.buildwiselabs.net`.
- La primera cuenta registrada en la API queda como administradora.

## Reglas de trabajo

- Nunca commitear `.env`, `node_modules/` ni `dist/`.
- Lo borrado de `versiones/actual` se recupera con `git checkout a169f2af -- Rastreo_medicion/versiones/actual`.
- Confirmar endpoints/atributos de Traccar contra la versión instalada y el manual del rastreador.

## Documentación (se carga bajo demanda; leer con Read cuando aplique)

- `docs/MIGRACION-MOCK-A-GPS.md`: plan por fases de mock a GPS real, flota del piloto
- `docs/J1939.md`: lectura CAN de tractores
- `docs/Revision_sensores_y_costos.md`: sensores, niveles A/B, costos
- `docs/Prompt_Frontend_Traccar.md`: especificación del frontend contra Traccar
- `docs/SERVICE-WORKER-PLAN.md`: plan de service worker
- `docs/Enlaces_utiles.md`: enlaces de referencia
- `panel-flota-api/README.md`: rutas, despliegue en Hostinger, OAuth, pendientes
- `versiones/LEEME.md` y `versiones/2026-11-07_recuperado/LEEME.md`: estado de las versiones

@panel-flota-api/README.md
