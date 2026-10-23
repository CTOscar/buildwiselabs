---
title: Requisitos de red
description: Puertos, dominios y conexiones que necesita el chatbot.
---

# Requisitos de red

## Salida a internet (desde el servidor)

Todo por HTTPS, puerto **443**:

| Destino | Para qué | Cuándo |
|---|---|---|
| `api.anthropic.com` | Generar las respuestas | Siempre |
| `sheets.googleapis.com` y `oauth2.googleapis.com` | Escribir en Google Sheets | Si usas Sheets |
| `registry-1.docker.io` y `ghcr.io` | Descargar las imágenes de los contenedores | Al instalar y actualizar |
| `registry.npmjs.org` | Instalar las dependencias de la app | Al construir la app |

Si el servidor está detrás de un firewall con lista de permitidos, abre esos dominios.

## Entrada (hacia el servidor)

| Puerto | Servicio | ¿Público? |
|---|---|---|
| **443** | Proxy inverso con HTTPS (Nginx, Caddy, Cloudflare) | Sí |
| 3000 | App (chat web, API, reportes) | Solo a través del proxy |
| 3001 | OpenWebUI | Solo a través del proxy |
| 11434 | Ollama | **No** |

:::warning Los puertos de Docker quedan abiertos
`docker-compose.yml` publica 3000, 3001 y 11434 en todas las interfaces del servidor. Ollama no tiene contraseña y la app tiene rutas de reportes abiertas (ver [Seguridad](../orientaciones/seguridad.md#los-reportes)). Cierra esos puertos en el firewall o publícalos solo para el propio servidor:

```yaml
ports:
  - "127.0.0.1:3000:3000"
```
:::

## Conexión de los usuarios

El chat necesita poco ancho de banda: texto y, al subir archivos, hasta 10 MB. Una conexión móvil normal es suficiente.

El dictado lo resuelve el navegador de cada persona, no el servidor del chatbot: en Chrome, el audio se envía al servicio de reconocimiento de voz de Google.
