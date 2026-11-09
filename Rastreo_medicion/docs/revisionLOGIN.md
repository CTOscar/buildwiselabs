# Revisión del login · panel-flota-api (8 nov 2026)

Alcance: `E:\PYME\Rastreo_medicion\panel-flota-api`. Se revisaron `src/app.mjs`, `security.mjs`, `oauth.mjs`, `repo.mysql.mjs` y `schema.mjs`. Algunas reglas se probaron con `npm run dev:memory`, que usa una base en memoria. No se modificó nada.

## Cómo funciona

- **Contraseñas:** scrypt (N=16384, r=8, p=1) con sal de 16 bytes. Se comparan en tiempo constante.
- **Sesión:** cookie `pf_sid` con un token aleatorio de 32 bytes. En MySQL solo se guarda su `sha256`. La cookie es HttpOnly y SameSite=Lax, y lleva Secure en producción. Dura 12 h, o 30 días con "recordarme".
- **Cerrar sesión:** borra la sesión. Cambiar la contraseña o recuperarla cierra las demás sesiones.
- **Login:** cuesta lo mismo exista o no el correo, y queda registrado en `login_log`. Tiene un límite de 8 intentos por IP+correo cada 15 min, guardado en memoria.
- **Roles:** se validan en el servidor. `/users`, `/users/:id/role`, `/login-log` y `/oauth-accounts` son solo para admin; probado, un usuario normal recibe 403.
- **Base y CORS:** el SQL está parametrizado. CORS acepta solo los orígenes de una lista y bloquea las escrituras desde otros orígenes.
- **Recuperar:** responde igual exista o no la cuenta. El token es de un solo uso y dura 1 h.
- **Google/Apple:** usan `state` en una cookie y validan emisor, destinatario, caducidad y que el correo esté verificado.

## Hallazgos

| # | Nivel | Hallazgo | Arreglo sugerido |
|---|---|---|---|
| 1 | Alto | El registro es abierto, también por Google/Apple, y no hay separación por organización. Cualquier cuenta nueva con rol `user` puede leer el historial de cualquier tractor (`/route`, `/fuel-events`), cambiar el nombre y los atributos de tractores y lotes (`PUT /devices`, `/fences`; probado: se renombró un tractor) y meter historial falso (`POST /samples` acepta sesión). Eso falsea el costeo de diésel. | Cerrar el registro público o dejar las cuentas nuevas pendientes hasta que las apruebe un admin. Dejar `PUT /devices`, `/fences` y `/samples` solo para admin o la clave de envío. Si habrá varios clientes: organización por usuario y por tractor. |
| 2 | Alto | La primera cuenta que se registra, o que entra con Google/Apple, queda como admin. Con la base vacía, gana quien llegue primero. | Crear el admin con un script o con `ADMIN_EMAIL`, no por orden de llegada. |
| 3 | Medio | Toma previa de cuentas: el registro no verifica el correo y Google/Apple se liga por correo a la cuenta que ya exista. | Ligar solo si el correo de la cuenta ya está verificado, o pedir la contraseña para ligar. |
| 4 | Medio | El token de recuperación se escribe completo en la bitácora del servidor, y el panel no tiene pantalla para usarlo: el bundle no llama a `/password/confirm`. | SMTP y una pantalla para confirmar. Mientras tanto, no escribir el token completo. |
| 5 | Medio | `PUT /users/:id` cambia la contraseña y el correo sin pedir la contraseña actual. Además, guarda nombre y correo antes de validar la contraseña nueva. | Pedir `currentPassword` y validar todo antes de guardar. |
| 6 | Medio | El límite de intentos vive en memoria: se reinicia al reiniciar la API y no frena a quien prueba muchos correos desde una IP. Cada intento corre scrypt (hasta 64 MB), así que se puede saturar el servidor. `trust proxy 1` solo es correcto si hay exactamente un proxy delante. | Límite global por IP además del de IP+correo; guardarlo en MySQL; revisar el proxy de Hostinger. |
| 7 | Bajo | La política de contraseñas no coincide: el servidor pide 8 caracteres, un número y una mayúscula; el panel pide además minúscula y símbolo. La API aceptó `ABCDEFG1`. | Usar la misma regla en los dos lados. |
| 8 | Bajo | El registro revela si un correo ya existe ("El correo ya existe"). | Respuesta genérica. |
| 9 | Bajo | No hay PKCE ni nonce en OAuth (es aceptable con cliente confidencial). `/health` muestra el código de error de la base a cualquiera. | Opcional. |

## Notas

- El panel recuperado está compilado con `VITE_PANEL_API_URL:"same-origin"`, así que llama a `/api/panel` en su mismo dominio. El README de la API propone un subdominio (`api-panelpack…`). Si se usa el subdominio, hay que recompilar el panel o parchear esa variable, y agregar el origen a `ALLOWED_ORIGINS`.
- `npm test` apunta a `test/api.test.mjs`, que no existe.
- `test/fake-repo.mjs` no imita a MySQL: usa ids de texto y firmas distintas. Por eso `dev:memory` no se comporta igual que producción.

