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
  Esto **no está** en `../../antiguas/panel-flota/src` ni en `../../antiguas/panel-flota/dist`.
- Su `index-Bka7l8xf.js` pesa 460,537 bytes. El desplegado en `panelpack.buildwiselabs.net` (5 nov, 00:49)
  pesa 428,159: esta copia es posterior a ese despliegue.

**Estado:** sin desplegar en producción (verificado por tamaño de archivos el 8 nov 2026).

**Dependencias del servidor**
- API del panel: `../../../panel-flota-api` (`/api/panel`, MySQL).
- Noticias: backend de `buildwiselabs.net` (`/api/news`, categoría `agro`).
- Posiciones en vivo: Traccar (`/api/session`, `/api/devices`, `/api/positions`, `/api/socket`).

## Publicar en Hostinger

El bundle de trabajo usa `same-origin` (`/api/panel`, con el proxy local). En Hostinger la API vive en
`api-panelpack.buildwiselabs.net`, así que se arma una copia con la dirección cambiada:

```bash
cd versiones/nuevas/2026-11-07_recuperado
node patch/make-deploy.cjs          # API de producción, datos simulados
node patch/make-deploy.cjs --live   # además, Traccar real (VITE_USE_MOCK=false)
```

Genera `deploy-hostinger/` (sin `*.bak*`; no se versiona) y no toca `panelpack/`. Sube **el contenido** de esa carpeta
a `public_html` de `panelpack.buildwiselabs.net`. Antes, en la API: `ALLOWED_ORIGINS` con
`https://panelpack.buildwiselabs.net`, `PANEL_URL` igual, y en Google Cloud el URI
`https://api-panelpack.buildwiselabs.net/api/panel/auth/google/callback`.
