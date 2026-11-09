# Versiones del Panel de Flota

**Proyecto oficial: `2026-11-07_recuperado/`** (despliegue compilado y parcheado, con `home.js`, `mapx.js` y
`statuspage.js`). Su backend es `../panel-flota-api` (API Express + MySQL, `/api/panel`).

**`antiguas/`** guarda versiones anteriores solo para consulta. Hoy tiene `antiguas/panel-flota/`, el fuente Vite
(ver `antiguas/LEEME.md`). No es la base de trabajo.

## Lo que se borró (8 nov 2026)

`versiones/actual/` (código fuente Vite y su `dist/` del 7 nov, sin el dashboard `home.js`) y un
`package-lock.json` huérfano. Siguen en git, en el commit `a169f2af` de la rama `reorganizar-rastreo`:

```
git checkout a169f2af -- Rastreo_medicion/versiones/actual
```

(`node_modules/` y `dist/` no estaban en git: `npm install` y `npm run build` los regeneran.)

## Otras copias fuera de esta carpeta

- Producción: `panelpack.buildwiselabs.net` (Hostinger), 5 nov 00:49. Más antigua que el recuperado.
- `E:\PYME\public_html.zip` (build del 7 nov) y `public_html.zip.bak` (5 nov).
