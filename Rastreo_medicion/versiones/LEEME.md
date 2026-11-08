# Versiones del Panel de Flota

| Carpeta | Qué es | Fecha | Notas |
|---|---|---|---|
| `actual/` | Código fuente (Vite). `dist/` es la build más reciente | build del 7 nov, 20:21 | Coincide con `public_html.zip` de la raíz de `E:\PYME`. No tiene el dashboard `home.js` |
| `2026-11-07_recuperado/` | Despliegue compilado y parcheado, recuperado | 7 nov | Tiene `home.js` y `statuspage.js`. Sin fuente |

## Otras copias que existen fuera de esta carpeta

- **Producción:** `panelpack.buildwiselabs.net` (Hostinger), subido el 5 nov a las 00:49. Build más antigua.
- **`flotarack.net`:** copia vieja del 4 nov, probablemente descartable.
- **`E:\PYME\public_html.zip.bak`:** build del 5 nov (`index-Bka7l8xf.js`).
- **`E:\PYME\public_html.zip`:** build del 7 nov, igual que `actual/dist`.

## Pendiente

Las dos líneas están separadas: `actual/` tiene el fuente más nuevo, y `2026-11-07_recuperado/` tiene el dashboard.
Falta decidir cómo juntarlas. No se ha tocado nada en el servidor.
