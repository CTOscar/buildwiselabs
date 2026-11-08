# Versión recuperada · 7 de noviembre de 2026

**Qué es:** copia recuperada de un despliegue del Panel de Flota (Las Cabras Sinaloa) ya compilado
y parcheado a mano. No es código fuente: no tiene `src/` ni `package.json`.

| Carpeta | Contenido |
|---|---|
| `panelpack/` | El sitio listo para publicar (`index.html`, `assets/`, `brand/`, `brands/`, `links/`) |
| `patch/` | Scripts `*.cjs` que editan el build, más `home.js` y sus respaldos `.bak` |
| `debian/` | Página de inicio estática |

**Qué la distingue**
- Incluye `home.js` (dashboard con noticias desde `https://buildwiselabs.net/api/news`) y `statuspage.js`.
  Esto **no está** en `../actual/src` ni en `../actual/dist`.
- Su `index-Bka7l8xf.js` pesa 460,537 bytes. El desplegado en `panelpack.buildwiselabs.net` (5 nov, 00:49)
  pesa 428,159: esta copia es posterior a ese despliegue.

**Estado:** sin desplegar en producción (verificado por tamaño de archivos el 8 nov 2026).

**Dependencias del servidor**
- API del panel: `../../panel-flota-api` (`/api/panel`, MySQL).
- Noticias: backend de `buildwiselabs.net` (`/api/news`, categoría `agro`).
- Posiciones en vivo: Traccar (`/api/session`, `/api/devices`, `/api/positions`, `/api/socket`).
