# Pruebas de seguridad con OWASP ZAP

ZAP (https://www.zaproxy.org/) es un escáner de seguridad web de código abierto. Se usa
aquí para revisar **nuestra propia aplicación**: encontrar cabeceras que faltan, cookies mal
configuradas, formularios sin protección y vulnerabilidades conocidas, antes de que las
encuentre alguien más.

---

## ⚠️ Antes de nada: NO escanees producción con el escaneo activo

Esto no es una advertencia genérica. En **este** bot, un escaneo activo haría daño real:

ZAP activo **envía formularios** una y otra vez con datos de prueba. Los formularios de este
bot escriben en las **hojas de Google del equipo**, mandan **correos de incidencia** y
contestan por **WhatsApp**. Un escaneo activo contra producción puede dejarte cientos de
filas basura en las hojas que usa tu gente, llenar de correos la bandeja de destino y gastar
cuota de la API de WhatsApp. Y como el bot llama a Gemini y a Claude en cada mensaje, también
te quemaría crédito de la IA.

La regla, entonces:

| Escaneo | Contra local | Contra producción |
|---|---|---|
| **Baseline** (pasivo: solo mira, no ataca) | sí | sí, es seguro |
| **Full** (activo: envía ataques y formularios) | sí | **no**, salvo con la app en modo mantenimiento y una base desechable |

Si algún día necesitas el escaneo activo contra producción: activa primero el modo
mantenimiento desde `/monitoreo`, hazlo fuera de horario, y ten claro que las hojas pueden
quedar sucias.

Y lo obvio pero que hay que decir: esto es para `comanpackagrobot.com` y tu entorno local,
que son tuyos. Escanear un sitio ajeno sin permiso escrito es un delito en México (Código
Penal Federal, artículos 211 bis 1 a 211 bis 7) y en casi cualquier parte.

---

## Qué necesitas

Docker, que ya tienes para la base de datos. ZAP se corre como contenedor, sin instalar nada.

La imagen oficial es `ghcr.io/zaproxy/zaproxy:stable`. (La vieja `owasp/zap2docker-stable`
quedó descontinuada; si algún comando que encuentres por ahí la menciona, está desactualizado.
No pude verificar desde aquí que `ghcr.io/zaproxy/zaproxy` siga siendo la vigente — la
búsqueda web está deshabilitada en esta cuenta — así que confírmalo en zaproxy.org la primera
vez.)

---

## 1. Escaneo baseline (el que se corre siempre)

Pasivo: ZAP navega el sitio y analiza lo que el servidor contesta, sin atacarlo. Tarda unos
minutos y es seguro contra producción.

Contra tu bot local (arráncalo antes con `npm start`):

```powershell
cd E:\PYME\bot\agro-bot-node\agro-bot-node
.\seguridad\zap\escanear.ps1 -Objetivo "http://host.docker.internal:3001" -Nombre local
```

Contra producción:

```powershell
.\seguridad\zap\escanear.ps1 -Objetivo "https://comanpackagrobot.com" -Nombre produccion
```

El reporte queda en `seguridad\zap\reportes\<nombre>-<fecha>.html`. Ábrelo en el navegador.

**Ojo con `host.docker.internal`**: desde dentro del contenedor, `localhost` es el propio
contenedor, no tu máquina. Ese nombre es el que Docker Desktop usa para referirse a tu
computadora. Es el mismo tipo de confusión que tuvimos con la base de datos.

---

## 2. Escaneo completo (solo en local)

Activo: ZAP sí ataca — inyección SQL, scripts, recorrido de rutas, formularios. Tarda mucho
más y **deja basura** en lo que toque.

```powershell
.\seguridad\zap\escanear.ps1 -Objetivo "http://host.docker.internal:3001" -Nombre local-completo -Completo
```

Antes de correrlo, dos precauciones que valen la pena:

Apunta tu `.env` local a hojas de Google **de prueba**, no a las del equipo. Si no tienes
copias, duplica las hojas reales y cambia los `SHEET_*_ID` mientras dure el escaneo.

Deja vacías `GMAIL_APP_PASSWORD` y `WHATSAPP_TOKEN` durante la prueba, para que los envíos
fallen en vez de salir de verdad.

---

## 3. Lo que ZAP va a encontrar casi seguro

Para que no te asustes con el primer reporte. Estas son limitaciones conocidas del bot hoy,
no sorpresas:

**Cabeceras de seguridad ausentes.** No se mandan `Content-Security-Policy`,
`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` ni `Permissions-Policy`.
Son reales y se arreglan en un rato, en `src/server.js`.

**Cookie de sesión sin `SameSite` ni `Secure`.** `express-session` ya la marca `httpOnly`,
pero faltan las otras dos. `Secure` solo se puede activar cuando hay HTTPS, así que tiene que
ser condicional para no romper el entorno local.

**`Strict-Transport-Security` ausente.** En local es esperado (no hay HTTPS). En producción
sí debería estar, y ahí sí cuenta.

**Divulgación de marcas de tiempo y de `X-Powered-By: Express`.** Riesgo bajo: le dice a un
atacante con qué está hecho el sitio. Se quita con una línea.

El archivo `reglas.conf` ya marca como ignoradas las que son ruido en un escaneo local, con
el motivo escrito en cada una. Las que son problemas de verdad quedan como aviso a propósito.

---

## 4. Qué NO alcanza a ver ZAP aquí

Casi todo el bot está detrás del login, así que un escaneo sin sesión solo ve `/login`,
`/registro`, `/register` y el webhook de WhatsApp. Eso no es poco —el registro público y el
webhook son justamente las puertas expuestas— pero deja fuera el resto.

Para escanear lo de adentro hay que darle a ZAP una sesión iniciada, lo que implica
configurarle un contexto con autenticación. Es un paso más grande y conviene hacerlo cuando
el escaneo básico ya esté limpio.

---

## 5. Cada cuándo

El baseline contra producción, una vez al mes y después de cada despliegue grande. El completo
en local, antes de tocar cualquier cosa relacionada con el login, los permisos o el registro
de usuarios.

Los reportes se guardan con fecha para poder comparar: lo importante no es el número de
hallazgos, sino que no aparezcan nuevos.
