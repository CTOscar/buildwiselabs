---
sidebar_position: 1
title: API
description: Endpoints HTTP y eventos de Socket.IO de la app.
---

# API

La app expone tres grupos de puntos de acceso: una **API compatible con OpenAI**, que es la que usa OpenWebUI; los **reportes**; y el **chat en tiempo real** por Socket.IO, que es el que usa el chat web.

Todas las rutas son relativas a la dirección de la app, por ejemplo `http://localhost:3000`.

## API compatible con OpenAI

Cualquier cliente que hable con OpenAI puede usar al asistente apuntando su `base_url` a `http://<app>/v1`.

### `GET /v1/models`

Devuelve el modelo disponible.

```json
{ "object": "list", "data": [{ "id": "claude-...", "object": "model", "owned_by": "anthropic" }] }
```

### `POST /v1/chat/completions`

Recibe la conversación con el formato de OpenAI. El asistente responde con sus propias instrucciones, que reemplazan cualquier mensaje `system` que mandes.

```bash
curl http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "stream": true,
    "messages": [
      { "role": "user", "content": "¿Cuánto diésel cargamos esta semana?" }
    ]
  }'
```

Con `"stream": true` la respuesta llega como *server-sent events*, fragmento por fragmento, y termina con `data: [DONE]`. Sin `stream`, llega completa en un solo JSON con la forma de `chat.completion`.

Si el último mensaje del usuario trae datos de la operación, también se [registra el reporte](../uso/reportes-de-campo.md).

## Reportes

Estas rutas responden con encabezados CORS, así que se pueden consultar desde otro sitio, como el visor de reportes de BuildWise Labs.

### `GET /api/reportes/lista`

Lista los archivos de Excel generados, del más reciente al más antiguo.

```json
{
  "ok": true,
  "archivos": [
    { "nombre": "reporte_campo_2026-08-28.xlsx", "fecha": "2026-08-28T18:04:11.000Z", "url": "/outputs/reporte_campo_2026-08-28.xlsx" }
  ]
}
```

### `GET /api/reportes/sheets?nombre=<archivo>`

Devuelve el contenido de cada hoja de un archivo.

```json
{ "ok": true, "hojas": { "Maquinaria": { "columnas": ["Fecha", "Equipo"], "filas": [["2026-08-28", "JD 5076E"]] } } }
```

### `GET /outputs/<archivo>`

Descarga directa del archivo de Excel.

### `GET /reportes`

Página HTML con la lista de reportes y sus enlaces de descarga.

### `POST /upload`

Sube un archivo de combustible para analizarlo. Va como `multipart/form-data`, en el campo `file`.

```bash
curl -F "file=@cargas-septiembre.xlsx" http://localhost:3000/upload
```

```json
{ "success": true, "data": { "summary": {}, "dailySummary": [], "weeklySummary": [], "vehicleSummary": [] }, "downloadFile": "resultado_1793000000000.xlsx" }
```

El Excel de resultado se descarga en `/outputs/<downloadFile>`. Acepta `.xlsx`, `.xls` y `.csv` de hasta 10 MB.

## Chat en tiempo real (Socket.IO)

El chat web abre una conexión de Socket.IO con la app. Cada conexión tiene su propio historial de conversación.

**Del cliente a la app**

| Evento | Datos | Qué hace |
|---|---|---|
| `message` | `{ text }` | Manda un mensaje del usuario. |
| `analyze` | `{ data, filename }` | Pide al asistente que explique el resultado de un `/upload`. |

**De la app al cliente**

| Evento | Datos | Cuándo llega |
|---|---|---|
| `token` | `{ text }` | Cada fragmento de la respuesta, mientras se escribe. |
| `done` | `{ fullText }` | Cuando la respuesta terminó. |
| `saved` | `{ confirmacion }` | Cuando se guardó un reporte en Google Sheets. |
| `error` | `{ message }` | Si algo falló al responder. |

```js
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');
socket.on('token', ({ text }) => process.stdout.write(text));
socket.on('saved', ({ confirmacion }) => console.log('\nGuardado:', confirmacion));
socket.emit('message', { text: 'Riego en la huerta El Nogal con 6 personas' });
```
