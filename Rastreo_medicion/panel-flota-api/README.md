# API del panel de flota (Las Cabras)

Backend en Node.js + Express que guarda en **MySQL** lo propio del panel:

| Qué | Tablas |
|---|---|
| Cuentas, perfiles y roles | `users` (contraseñas con scrypt, nunca en claro) |
| Sesiones por cookie | `sessions` |
| Recuperar contraseña | `password_resets` |
| Bitácora de accesos | `login_log` |
| Ajustes de tractores y lotes | `device_settings`, `fence_settings` |
| Correos que entran con Google o Apple (ligados a `users`) | `oauth_accounts` |
| Foto de perfil (una por cuenta) | `user_photos` |
| Historial de combustible y velocidad | `position_samples` |

Traccar sigue siendo la fuente de posiciones en vivo; esta API guarda su historial y todo lo demás.
Las tablas se crean solas al arrancar.

## Probar en tu computadora

```bash
cd Rastreo_medicion/panel-flota-api
cp .env.example .env      # llena DB_USER, DB_PASSWORD, DB_NAME (una base MySQL 8 tuya)
npm install
npm run check:db          # prueba la conexión y cada consulta; no deja datos
npm start                 # http://localhost:3000/api/panel/health
npm test                  # pruebas del resumen de combustible y su ruta (sin necesitar MySQL)
```

## Publicar en Hostinger

1. **Base de datos:** hPanel → Bases de datos → Administración de MySQL → crea base, usuario y contraseña.
   Anota los tres y el host (normalmente `localhost`).
2. **Aplicación Node.js:** hPanel → Sitios web → (tu dominio) → Node.js → crea la aplicación.
   - Versión de Node: 18 o superior. Archivo de entrada: `server.js` (no cambies a otro).
   - Sube el contenido de esta carpeta (sin `node_modules` ni `.env`) y pulsa "Ejecutar NPM Install".
3. **Variables de entorno** (en la misma pantalla o en un `.env` que no se comparta):
   `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `ALLOWED_ORIGINS`, `INGEST_KEY`, `NODE_ENV=production`.
   Para la base también se aceptan estos nombres equivalentes (sin importar mayúsculas):
   `name_database` (= `DB_NAME`), `user_database` (= `DB_USER`), `password_database` (= `DB_PASSWORD`),
   `host_database` (= `DB_HOST`) y `port_database` (= `DB_PORT`). Si defines las dos formas, gana `DB_*`.
4. **Dirección de la API:** usa un subdominio del mismo dominio que el panel, por ejemplo
   `api-panelpack.buildwiselabs.net` junto a `panelpack.buildwiselabs.net`. Así la cookie de sesión
   funciona sin configuración extra (`SameSite=Lax`).
5. Compila el panel con `VITE_PANEL_API_URL=https://api-panelpack.buildwiselabs.net` (ver el README del panel).

La **primera cuenta que se registra queda como administradora**; las siguientes son usuarios.
Regístrate tú primero.

## Enviar el historial desde Traccar

Con `INGEST_KEY` definida, cualquier proceso puede enviar posiciones:

```bash
curl -X POST "$API/api/panel/samples" -H "X-Ingest-Key: $INGEST_KEY" -H "Content-Type: application/json" \
  -d '{"samples":[{"deviceId":12,"fixTime":"2026-11-04T15:00:00Z","latitude":23.0,"longitude":-105.9,"speed":3,"fuel":200,"ignition":true}]}'
```

O deja corriendo `npm run sync:traccar`, que copia `/api/positions` de Traccar cada minuto
(variables `TRACCAR_URL`, `TRACCAR_EMAIL`, `TRACCAR_PASSWORD`, `PANEL_API_URL`, `INGEST_KEY`).

## Rutas (`/api/panel`)

| Método y ruta | Quién |
|---|---|
| `GET /health` | público |
| `POST /register`, `POST /login`, `DELETE /session`, `GET /session` | público / sesión |
| `PUT /users/:id` (perfil y contraseña) | el dueño o un administrador |
| `GET /users`, `PATCH /users/:id/role`, `GET /login-log`, `GET /oauth-accounts` | administrador |
| `POST /password/reset`, `POST /password/confirm` | público |
| `GET /auth/providers`, `GET /auth/google`, `GET /auth/apple` (+ `/callback`) | público |
| `GET /users/:id/photo` | sesión |
| `PUT /users/:id/photo`, `DELETE /users/:id/photo` (JPG, PNG o WebP, máx. 400 KB) | el dueño o un administrador |
| `GET /devices`, `PUT /devices/:id`, `GET /fences`, `PUT /fences/:id` | sesión |
| `POST /samples` | clave de envío o sesión |
| `GET /route`, `GET /fuel-events` | sesión |
| `GET /fuel-summary?from&to&deviceId=…` (resumen por tractor y día: consumo, cargas, descargas, velocidad y horas; máx. 31 días) | sesión |

## Acceso con Google y Apple

La API hace el flujo OAuth y crea la cuenta en MySQL (sin contraseña; solo entra por el proveedor). Solo acepta correos verificados.
Cada acceso queda en `oauth_accounts` con el id estable del proveedor (`provider_uid`): si la persona cambia su correo de Google, sigue entrando a la misma cuenta. Si ya había una cuenta del panel con ese correo, se liga a ella (su contraseña sigue sirviendo).
Cada proveedor se activa solo cuando sus variables están completas (ver `.env.example`):

- **Google:** crea un *ID de cliente OAuth* (aplicación web) en Google Cloud y agrega como URI de redireccionamiento
  `https://api-panelpack.buildwiselabs.net/api/panel/auth/google/callback`. Define `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`.
- **Apple:** requiere cuenta Apple Developer. Crea un *Services ID* con *Sign in with Apple*, dominio `api-panelpack.buildwiselabs.net`
  y Return URL `https://api-panelpack.buildwiselabs.net/api/panel/auth/apple/callback`; crea una clave `.p8`.
  Define `APPLE_CLIENT_ID` (Services ID), `APPLE_TEAM_ID`, `APPLE_KEY_ID` y `APPLE_PRIVATE_KEY`.
- Define también `PUBLIC_API_URL` y `PANEL_URL`.

## Pendientes conocidos

- **Correo de recuperación:** aún no se envía; el token se escribe en la bitácora del servidor
  (`[recuperar] correo: token …`) para que un administrador lo entregue. Falta configurar SMTP.
- **Límite de intentos** de acceso en memoria: se reinicia al reiniciar la aplicación.
- Las consultas SQL se verifican con `npm run check:db` contra una base real; las pruebas automáticas
  usan una capa de datos en memoria.
