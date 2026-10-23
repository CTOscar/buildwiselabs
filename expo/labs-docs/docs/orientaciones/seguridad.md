---
title: Seguridad y privacidad
description: Qué datos salen del servidor, qué hay que proteger y cómo.
---

# Seguridad y privacidad

## Qué datos salen de tu servidor

| A dónde | Qué se envía | Para qué |
|---|---|---|
| **Anthropic (Claude)** | Los mensajes de la conversación y, al analizar un Excel, el resumen calculado (no el archivo completo) | Generar las respuestas y extraer los datos de los reportes |
| **Google Sheets** | Las filas de cada reporte | Guardar los reportes en tu hoja |

Nada más sale del servidor. Los archivos subidos se procesan ahí mismo y se borran al terminar el análisis.

Aparte, cuando alguien **dicta** un mensaje, su navegador convierte la voz en texto: en Chrome, eso lo hace el servicio de voz de Google. Al chatbot solo le llega el texto.

Anthropic publica cómo trata los datos que recibe por su API en su [centro de privacidad](https://privacy.anthropic.com).

## Lo que hay que proteger

### Las llaves

- `ANTHROPIC_API_KEY` y `GOOGLE_SERVICE_ACCOUNT` van solo en `.env`, que está en `.gitignore`.
- No las compartas por chat, correo ni capturas. Si se filtran, **revócalas** en la consola correspondiente y crea otras.
- Da a la cuenta de servicio acceso solo a la hoja que necesita, no a todo tu Drive.

### Los reportes

:::warning Rutas abiertas
En la versión actual, `/outputs/`, `/reportes` y `/api/reportes/*` **no piden contraseña**, y la API de reportes acepta peticiones desde cualquier sitio (CORS abierto). Cualquiera que conozca la dirección puede descargar los Excel.
:::

Mientras eso se agrega a la app, protégelos desde el proxy inverso:

- Publica solo OpenWebUI y deja la app en una red interna, o
- Pide usuario y contraseña en esas rutas desde Nginx o Caddy, o
- Permite el acceso solo desde las direcciones IP de la oficina.

### OpenWebUI

La **primera cuenta** que se registra queda como administrador. Créala tú antes de compartir el enlace, y después, en el panel de administración de OpenWebUI, desactiva el registro de usuarios nuevos si solo tu equipo debe entrar.

## HTTPS

Publica siempre con HTTPS: protege lo que se escribe en el chat y es obligatorio para usar el micrófono. Ver [Requisitos de red](../compatibilidad/red.md).
