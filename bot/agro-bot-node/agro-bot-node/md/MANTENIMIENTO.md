# Mantenimiento del bot — La Pedregoza

Guía de operación. Qué revisar, dónde mirar cuando algo falla, y las trampas que ya nos
costaron horas una vez.

Última actualización: 7 de octubre de 2026.

---

## Los dos mundos

Lo más importante de todo, porque confundirlos es lo que más tiempo nos ha costado:

| | Local (tu computadora) | Producción (Hostinger) |
|---|---|---|
| Dirección | `localhost:3001` | `comanpackagrobot.com` |
| Base de datos | MySQL en Docker, `127.0.0.1:3307` | MySQL de Hostinger, `localhost:3306` |
| Configuración | `.env` del proyecto | `hbuilds/config/.env` en el servidor |
| Usuarios | los que crees ahí | los de producción, independientes |
| Reinicio | `npm start` | importar el zip en Despliegues |

**No se comparten usuarios, ni fotos, ni bitácora.** Lo que creas en uno no aparece en el
otro. Y los dos `.env` **nunca** se copian uno sobre el otro: la única línea que cambia es
`DATABASE_URL`, pero es justo la que rompe todo si se mezcla.

El archivo `.env.hostinger` del proyecto es la plantilla del de allá, ya con la dirección
correcta. `agregar-a-env.txt` explica qué variable va en cuál.

---

## Revisión semanal

Entra a `/monitoreo` como administrador. Cuatro cosas, en dos minutos:

**Errores del servidor.** Si hay algo en "últimas 24 h", ábrelo y lee la traza. Las
contraseñas y llaves salen tapadas, así que se puede leer sin riesgo.

**Flujo del servidor.** Mira la columna "Con error" de la tabla de rutas. Una ruta con
errores que antes no los tenía es la señal más temprana de que algo se rompió.

**¿Responde el modelo?** El botón manda una petición mínima real a la IA. Si falla, suele ser
cuota agotada o una llave vencida.

**Bitácora del campo** (`/bitacora`). Que haya capturas de los días que debería haberlas. Un
día vacío en plena temporada significa que alguien no pudo guardar y no avisó.

---

## Cuando algo falla en producción

El reflejo correcto: **no adivinar, preguntarle al servidor**. Esta petición devuelve el
motivo exacto de cualquier problema con la base de datos:

```powershell
'{"usuario":"oscar","password":"estaEsIncorrecta"}' | Set-Content -Encoding ascii prueba.json
curl.exe -s -i -X POST https://comanpackagrobot.com/login -H "Content-Type: application/json" --data-binary "@prueba.json"
```

- **401** "Usuario o contraseña incorrectos" → la base responde bien. El problema es otro.
- **500** → el mensaje trae el motivo completo: no alcanza el servidor, credenciales
  rechazadas, tablas que faltan, o el cliente generado para el motor equivocado.

Y para ver el estado de cualquiera de las dos bases:

```powershell
node scripts/diagnosticar_base.js
```

Sin más, revisa la local. Para producción, pon antes `DATABASE_URL` como variable de la
terminal (le gana al `.env`). Te dice a qué base se conectó, qué tablas hay, qué migraciones
cree Prisma que aplicó, si eso se contradice, y qué usuarios existen.

---

## Las trampas conocidas

**Node lee el entorno una sola vez, al arrancar.** Editar el `.env` no cambia nada hasta que
el proceso reinicie. Se detecta al instante: si la respuesta del servidor llega **idéntica
byte por byte** (misma `ETag`), no reinició. Nos pasó tres veces seguidas antes de notarlo.

**La contraseña de la base no puede llevar símbolos.** Dentro de una dirección de conexión,
`?`, `@`, `:`, `/`, `#` y `%` tienen significado propio y parten la cadena. Solo letras y
números.

**El host de la base en producción es `localhost`**, no la dirección `192.168.x.x` que
muestra el panel. Esa es interna de Hostinger.

**En local va `127.0.0.1`, no `localhost`.** Node resuelve `localhost` por IPv6 y el reenvío
de puertos de Docker Desktop en Windows no contesta por ahí. Síntoma: `P1001`.

**Si `prisma/migrations` no existe**, `migrate deploy` dice "No pending migrations" sin
aplicar nada. No miente: no encuentra ninguna. Se regenera con `migrate diff`.

**`migrate resolve --applied` solo se usa después de confirmar que las tablas existen.**
Marcarlo a ciegas deja a Prisma convencido de que ya aplicó algo que no aplicó, y a partir de
ahí no hay forma de que lo intente otra vez.

**En PowerShell 5.1, `&&` no existe** y las comillas dobles se pierden al pasarlas a un
programa externo. Para SQL con nombres de columna entre comillas, manda el comando por
entrada estándar: `'SELECT ...' | docker exec -i agrobot_db psql ...`.

**`npm run x -- "dos palabras"` pierde las comillas en Windows.** Llama a `node` directo.

---

## Dónde vive cada cosa

| Qué | Dónde |
|---|---|
| Bitácora de capturas | tabla `registros` + `/bitacora` |
| Errores del servidor | `services/errores.js`, carpeta `ERRORES_DIR` + `/monitoreo` |
| Flujo de peticiones | `middleware/trafico.js` + `/monitoreo` (solo en memoria) |
| Fotos de perfil | carpeta `FOTOS_DIR`, una por usuario |
| Modo mantenimiento | `MANTENIMIENTO_ARCHIVO` + interruptor en `/monitoreo` |
| Usuarios y roles | tabla `usuarios` + `/usuarios` |

**En Hostinger, apunta `FOTOS_DIR`, `ERRORES_DIR` y `MANTENIMIENTO_ARCHIVO` a una carpeta
fuera del código.** La carpeta del proyecto se reemplaza en cada despliegue: sin eso, cada
zip que subas borra las fotos del equipo y el historial de errores.

---

## Permisos: dar y quitar administrador

Desde `/usuarios`, cada fila tiene el boton **Hacer administrador** / **Quitar
administrador**. Pide confirmacion y explica que implica, porque no es poca cosa: un
administrador ve la bitacora completa (quien capturo que y a que hora), los errores del
servidor, puede cerrar el bot para todo el equipo y crear o borrar cuentas.

Reserva ese rol para quien de verdad lo necesite. La gente de campo va como `usuario`:
captura normal, pero no ve quien reporta a que hora ni toca cuentas.

Tres reglas que el servidor aplica y no se pueden saltar desde la pantalla:

Nadie se cambia el rol a si mismo. Quitartelo por error te dejaria fuera de esa misma
pantalla sin forma de deshacerlo; que te lo cambie otro administrador.

No se puede quitar el rol al **unico administrador activo**, ni desactivar su cuenta. Dejar
el bot sin ningun administrador es irreversible desde la app: habria que entrar a la base de
datos a mano. Primero nombra a otro.

Nadie desactiva su propia cuenta.

Cada cambio de rol queda escrito en los registros del servidor con quien lo hizo, para cuando
alguien pregunte como fue que fulano acabo con acceso.

---

## Seguridad

Revisión con OWASP ZAP: ver `seguridad/zap/README.md`. Resumen: el escaneo **baseline** es
pasivo y seguro contra producción; el **completo** es activo, envía formularios de verdad —y
en este bot eso significa escribir en las hojas del equipo, mandar correos y gastar cuota de
WhatsApp y de la IA—, así que solo contra local y con hojas de prueba.

Pendiente conocido: faltan las cabeceras de seguridad (`Content-Security-Policy`,
`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`) y a la cookie de sesión le
faltan `SameSite` y `Secure`. Es un rato de trabajo en `src/server.js`.

**Las credenciales nunca se pegan en un chat, ni en un ticket, ni en un correo.** Ya pasó dos
veces con llaves de Google en este proyecto y la primera terminó con Google deshabilitándola.
Si una credencial pasó por un canal de texto, dejó de ser secreta: rótala.

---

## Despliegue

1. `npm run build` en local y probar lo que cambió.
2. Generar el zip sin `node_modules`, `.env` ni `.mcp.json`.
3. Importar en Despliegues de Hostinger — eso reinicia la aplicación.
4. Comprobar con el `curl` del login: un **401** significa que todo está en su sitio.

Hostinger corre `npm install` y `npm run build` por su cuenta, pero **no** las migraciones.
Si una versión trae cambios en el esquema, hay que correr `prisma migrate deploy` a mano
contra la base de producción, con MySQL remoto habilitado y tu IP autorizada.
