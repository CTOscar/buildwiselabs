# Panel de flota · Rastreo y Medición

Frontend del panel de flota con arquitectura de mapa web: mapa a pantalla completa, buscador flotante con sugerencias, chips de filtro, riel de navegación (Flota, Alertas, Lotes, Reportes, Simulador, Vista 3D), lanzador de servicios BuildWise junto al perfil, panel lateral que se colapsa (hoja inferior deslizable en celular), tarjeta de detalle por tractor con acciones (Centrar, Ver en 3D, Seguir, IMEI), capas Mapa/Satélite y controles de zoom. Tema claro y oscuro según el sistema. Datos en tiempo real y escena 3D de la instalación cargada bajo demanda.

**Solo frontend.** Mientras el backend no exista, arranca con **datos simulados** que imitan las respuestas de Traccar.

## Requisitos

- Node.js 18 o superior

> **Windows con Control de aplicaciones (Smart App Control / WDAC):** el proyecto usa las versiones WebAssembly de Rollup y esbuild (`overrides` en `package.json`), así que no carga binarios nativos que esa política bloquea. Si cambias versiones de Vite, conserva esos `overrides`.

## Arranque

```bash
npm install
cp .env.example .env      # en Windows: copy .env.example .env
npm run dev               # http://localhost:5173
```

Compilar para producción:

```bash
npm run build             # genera dist/
npm run preview           # sirve dist/ para revisarlo
```

## Pruebas (Jest)

```bash
npm test                # corre todas las pruebas
npm run test:watch      # vuelve a correrlas al guardar cambios
npm run test:coverage   # reporte de cobertura (abre coverage/index.html)
```

- Configuración en `jest.config.js`: entorno **jsdom**, módulos ES nativos (sin Babel) y los `.css` sustituidos por un módulo vacío.
- Las pruebas viven en `tests/`, con la misma estructura que `src/`:

```
tests/
  setup.js                      se carga antes de cada archivo de pruebas
  __mocks__/style.js            sustituto de los .css
  unit/lib/format.test.js       horas, fechas en Mazatlán, km/h, textos de eventos
  unit/fleet/store.test.js      estados del tractor, horas del día, eventos, filtros, navegación
  unit/api/mock.test.js         flota simulada, inicio de sesión, registro, tiempo real
  unit/components/...           tarjetas de enlace, servicios, íconos, iniciales
  unit/config/links.test.js     enlaces válidos y configuración por defecto
```

- Para agregar una prueba: crea `tests/unit/<carpeta>/<nombre>.test.js` e importa `describe`, `test`, `expect` (y `jest` si usas temporizadores falsos) desde `@jest/globals`.
- Quedan fuera de la cobertura la escena 3D (WebGL) y `main.js`; esas partes se revisan en el navegador.
- El aviso `ExperimentalWarning: VM Modules` es normal: Jest usa esa opción de Node para los módulos ES.

## Servidores MCP (Claude Code)

`.mcp.json` en la raíz registra estos servidores para Claude Code (se aprueban la primera vez que abres el proyecto). La plantilla está en `.mcp/mcp.example.json`; para activarla cópiala a la raíz: `copy .mcp\mcp.example.json .mcp.json`.

| Servidor | Para qué | Requiere |
|---|---|---|
| `stitch` | Leer pantallas de Google Stitch (HTML, capturas) para pasarlas a componentes | `npx @_davideast/stitch-mcp init` una vez, o la variable `STITCH_API_KEY` |
| `figma` | Leer diseños de Figma (frames, variables, componentes) para generar código | Iniciar sesión en Figma la primera vez |
| `figma-desktop` | Lo mismo, pero desde la app de escritorio usando lo que tengas seleccionado | App de Figma abierta con el servidor MCP de escritorio activado (Dev Mode) |
| `playwright` | Abrir el panel en el navegador, hacer clic y tomar capturas | Nada |
| `chrome-devtools` | Consola, red y rendimiento del panel en Chrome | Chrome instalado |
| `context7` | Documentación al día de Vite, Tailwind, Three.js, D3, Leaflet, Jest | Opcional `CONTEXT7_API_KEY` |
| `github` | Issues, pull requests y código del repositorio | `GITHUB_PERSONAL_ACCESS_TOKEN` |
| `databases` | PostgreSQL y MySQL en un solo servidor (DBHub), solo lectura | `PG_DSN` y `MYSQL_DSN`; conexiones en `.mcp/dbhub.toml` |
| `cloudflare-workers` | Workers y sus recursos (KV, R2, D1, Hyperdrive) | Inicio de sesión de Cloudflare la primera vez |
| `cloudflare-observability` | Registros y métricas de los Workers | Inicio de sesión de Cloudflare la primera vez |

- Las claves **no** van en el repositorio: se leen de variables de entorno del sistema. Lista y ejemplo con `setx` en `.mcp/variables.example.txt`.
- Los comandos usan `cmd /c npx` porque Claude Code en Windows lo necesita para servidores con `npx`. En macOS/Linux quita `"cmd", "/c"` de los `args`.
- Las versiones están fijadas para que todo el equipo use las mismas.
- Para ver el estado: `/mcp` dentro de Claude Code, o `claude mcp list` en la terminal.

## Acceso y perfil

- **Entrar** (`#/entrar`): correo, contraseña con botón para mostrarla, "Recordarme", enlace de recuperación y botón **Continuar con Google**.
- **Crear cuenta** (`#/registro`): nombre, teléfono, correo, área o puesto, contraseña con medidor de seguridad y confirmación.
- **Recuperar contraseña** (`#/recuperar`): envía el enlace al correo (siempre responde igual, para no revelar qué correos existen).
- **Mi perfil**: desde el avatar (arriba a la derecha) o el menú. Edita nombre, correo, teléfono, puesto y contraseña, y cierra sesión.

En modo simulado las cuentas se guardan solo en el navegador. Cuenta de prueba: `demo@buildwiselabs.mx` / `demo1234`.

Con Traccar real usa: `POST /api/session` (entrar), `POST /api/users` (registro, requiere activar el registro de usuarios en el servidor), `POST /api/password/reset` (requiere correo SMTP configurado), `PUT /api/users/{id}` (perfil) y `/api/session/openid/auth` (Google, requiere OpenID configurado en `traccar.xml`). El puesto se guarda en `attributes.puesto`.

## Conectar al Traccar real (cuando exista el backend)

1. En `.env`:
   ```
   VITE_USE_MOCK=false
   TRACCAR_PROXY_TARGET=http://IP-O-DOMINIO-DE-TRACCAR:8082
   ```
2. `npm run dev`. El proxy de Vite reenvía `/api` (REST y WebSocket) al servidor, así que no hay problema de CORS en desarrollo.
3. En producción, lo más simple es servir `dist/` desde el mismo dominio que Traccar (o detrás del mismo proxy inverso). Si va en otro dominio, define `VITE_TRACCAR_URL` y configura `web.origin` en `traccar.xml`.

## Qué usa de Traccar

| Dato | Endpoint |
|---|---|
| Sesión | `GET/POST/DELETE /api/session` |
| Tractores | `GET /api/devices` |
| Última posición | `GET /api/positions` (`attributes.ignition`, `hours`, `power`, `fuel`, `rpm`) |
| Lotes | `GET /api/geofences` (WKT `POLYGON`, `CIRCLE`, `LINESTRING`) |
| Horas de motor del día | `GET /api/reports/summary` (`engineHours`) |
| Eventos del día | `GET /api/reports/events?type=allEvents` |
| Tiempo real | WebSocket `/api/socket` |

Hay que confirmar estos endpoints y atributos contra la versión de Traccar instalada.

### Requisitos para el backend

- El nombre de cada dispositivo en Traccar debe ser el código del tractor (`TRC-0012`).
- Atributo de dispositivo `nivel` = `A` o `B`, para mostrar la escena 3D correcta.
- Las horas de motor por ignición: en Teltonika, DIN1 cableado a D+ y el conteo de horas activado en Traccar.

## Estructura

```
src/
  api/          cliente Traccar (REST + WebSocket) y cliente simulado con la misma interfaz
  components/   shell (riel, panel, hoja inferior, controles flotantes) e íconos SVG
  features/
    fleet/      estado global, resumen, lista de flota, tarjeta del tractor
    search/     buscador con sugerencias y chips de filtro
    map/        mapa Leaflet: geocercas, marcadores, capas, zoom, seguir tractor
    alerts/     alertas y eventos del día
    lotes/      geocercas con tractores y horas
    reports/    horas por rancho y tractores con más horas
    login/      entrar, crear cuenta y recuperar contraseña
    profile/    mi perfil
    simulator/  simulador de instalación (diagrama de cableado interactivo)
    escena3d/   vista 3D del riel y modal 3D, cargados bajo demanda
  three/        escena Three.js del tractor
  lib/          formatos (horas, fechas America/Mazatlan, etiquetas de eventos)
  styles/       Tailwind
tests/          pruebas con Jest (ver sección Pruebas)
```

## Marca

Colores y logotipo de BuildWise Labs (tomados de buildwiselabs.net): acento malva `#9D6B99`, fondos casi negro `#0C0E14` y azul marino `#16223D`, degradado magenta→azul del isotipo. Tipografía de la interfaz: **Manrope** (texto y títulos) y **JetBrains Mono** (números, IMEI, horas); el logotipo "BuildWise Labs" conserva IBM Plex Sans, la de la marca. El isotipo está en `public/brand/` y los tokens en `src/styles/main.css`.

## Enlaces

El chip **Enlaces** (primero en la barra de filtros) abre un menú con grupos que se expanden: Rastreadores, Sensores, Instalación y Plataforma. Cada enlace es una tarjeta con la imagen del producto (componente `src/components/linkCard.js`); si la imagen no carga, muestra el ícono del grupo. Se editan en `src/config/links.js` (campos `label`, `note`, `href`, `image`, `price`).

## Servicios BuildWise

El botón de 9 puntos junto al avatar abre el lanzador de servicios: Rastreo y Medición, Correo Rastreo (gestor de correo para Rastreo y Medición, próximamente), Chatbot IA, Modelos de IA (preguntas con el modelo que elijas, próximamente), Seguridad y Redes, Documentación y Contacto. En celular está en el menú. Nombres, íconos y enlaces se editan en `src/components/apps.js`; solo la ruta del chatbot está confirmada.

## Gráficas

Los reportes usan **D3.js** (`d3@7.9.0`): barras horizontales animadas por rancho y por tractor (Top 10 / Top 20 / Todos), línea de promedio, tooltip al pasar el cursor, clic para abrir el tractor en el mapa y vista de tabla. Código en `src/features/reports/barChart.js`.

## Notas

- **Mapa:** se usa Leaflet con mosaicos de OpenStreetMap (mapa) y Esri World Imagery (satélite) para desarrollo. En producción conviene un proveedor de mosaicos con contrato, por las políticas de uso de OSM.
- **Three.js** se instala por npm y se separa en su propio archivo (~128 KB gzip). Solo se descarga al abrir la vista 3D.
- **Navegadores viejos:** si hace falta compatibilidad, agregar `@vitejs/plugin-legacy` (usa Babel internamente).
- **Webpack** no se usa: Vite cubre el empaquetado.
