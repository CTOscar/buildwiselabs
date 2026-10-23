---
sidebar_position: 1
title: Despliegue
description: Publicar el chatbot en un servidor, con dominio y HTTPS.
---

# Despliegue

## En un servidor propio

Cualquier servidor Linux con Docker sirve.

1. Copia la carpeta del chatbot al servidor y crea el `.env` (ver [Instalación](../instalacion.md)).
2. Levanta los servicios:

   ```bash
   docker compose up -d --build
   ```

3. Pon un **proxy inverso con HTTPS** delante, con Nginx, Caddy o Cloudflare, para publicar:
   - OpenWebUI (puerto `3001`) en el dominio del chat.
   - La app (puerto `3000`) si vas a usar el chat web propio o la API de reportes desde fuera.

:::warning HTTPS no es opcional
Sin HTTPS el micrófono no funciona en el navegador y las llaves viajan sin cifrar. Publica siempre con certificado.
:::

### Actualizar

```bash
git pull
docker compose up -d --build
```

## En Railway

1. Sube el proyecto a GitHub.
2. En [railway.app](https://railway.app), crea un proyecto nuevo a partir del repositorio.
3. En **Variables**, agrega `ANTHROPIC_API_KEY` y, si usas Google Sheets, `GOOGLE_SHEET_ID` y `GOOGLE_SERVICE_ACCOUNT`.
4. Railway detecta el `Dockerfile` de `app/` y despliega solo.
5. En **Settings → Networking**, genera un dominio público y apúntalo desde el panel de tu proveedor de dominio.

Railway incluye HTTPS, así que el micrófono funciona desde el primer momento.

## Respaldos

Lo que hay que respaldar:

| Qué | Dónde | Contiene |
|---|---|---|
| Reportes de Excel | `app/outputs/` | Los archivos diarios y los resultados de los análisis |
| OpenWebUI | Volumen `open-webui` | Usuarios, conversaciones y ajustes |
| Ollama | Volumen `ollama_data` | Modelos locales descargados |
| Configuración | `.env` | Llaves. Guárdalo aparte, en un gestor de contraseñas, nunca en el repositorio |

Si usas Google Sheets, los reportes también quedan ahí, con el historial de versiones de Google.

## Comandos útiles

```bash
docker compose ps                 # estado de los servicios
docker compose logs -f app        # registros de la app en vivo
docker compose restart app        # reiniciar solo la app
docker compose down               # detener todo
```
