---
sidebar_position: 2
title: Instalación
description: Cómo levantar el Chatbot PYME con Docker.
---

# Instalación

La forma recomendada es con Docker: un solo comando levanta la app, OpenWebUI y Ollama.

## Requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/), o Docker Engine con Compose en un servidor.
- Una API key de Anthropic, que se crea en [console.anthropic.com](https://console.anthropic.com).
- **Opcional:** una cuenta de servicio de Google con permiso de edición sobre la hoja de cálculo, si quieres que los reportes también se guarden en Google Sheets.

## 1. Crear el archivo `.env`

En la carpeta del chatbot, junto a `docker-compose.yml`, crea un archivo `.env`:

```bash
cp .env.example .env
```

y llénalo con tus datos:

```env title=".env"
ANTHROPIC_API_KEY=sk-ant-...

# Opcional: registro en Google Sheets
GOOGLE_SHEET_ID=id-de-tu-hoja
GOOGLE_SERVICE_ACCOUNT={"type":"service_account","project_id":"...","private_key":"...","client_email":"...@tu-proyecto.iam.gserviceaccount.com"}
```

:::danger No subas el `.env`
Contiene llaves privadas. Ya está en `.gitignore`. No lo compartas por chat ni lo copies dentro de la imagen de Docker; si alguna vez se filtra, cambia las llaves.
:::

## 2. Pasar las variables al contenedor

Docker Compose lee el `.env`, pero cada variable tiene que estar declarada en el servicio `app` para llegar al contenedor. Revisa que tu `docker-compose.yml` tenga estas líneas:

```yaml title="docker-compose.yml"
services:
  app:
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - GOOGLE_SHEET_ID=${GOOGLE_SHEET_ID}
      - GOOGLE_SERVICE_ACCOUNT=${GOOGLE_SERVICE_ACCOUNT}
      - PORT=3000
```

Si falta `ANTHROPIC_API_KEY`, la app arranca pero no puede responder. En los registros lo verás como `ANTHROPIC_API_KEY: NO ✗`.

## 3. Levantar todo

```bash
docker compose up -d --build
```

| Servicio | Dirección | Para qué |
|---|---|---|
| Chat web | http://localhost:3000 | Chat propio con texto, voz y archivos |
| OpenWebUI | http://localhost:3001 | Interfaz de chat completa |
| Ollama | http://localhost:11434 | Modelos locales (opcional) |

## 4. Comprobar que funciona

```bash
docker compose logs -f app
```

Al arrancar, la app escribe tres líneas que confirman que todo está en orden:

```text
Chatbot → http://localhost:3000  |  Modelo: claude-...
ANTHROPIC_API_KEY: SÍ ✓
Claude test: OK ✓
```

Si configuraste Google Sheets, también aparece `✓ Google Sheets inicializado`. Si no lo configuraste, verás `⚠ Google Sheets no configurado — registro desactivado` y el chatbot funciona igual: los reportes se guardan solo en Excel.

## Sin Docker

Para desarrollo también puedes correr la app directamente con Node.js 20 o superior:

```bash
cd app
npm install
ANTHROPIC_API_KEY=sk-ant-... node server.js
```

La app no carga el `.env` por sí sola, así que en este modo las variables se pasan en la misma línea de comando o se exportan antes en la terminal.
