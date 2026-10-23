---
sidebar_position: 4
title: OpenWebUI
description: Usar el asistente desde OpenWebUI, con usuarios e historial.
---

# OpenWebUI

[OpenWebUI](https://docs.openwebui.com) es una interfaz de chat completa: guarda las conversaciones, maneja usuarios y funciona bien en el celular. En el Chatbot PYME viene conectada a la app, así que responde el mismo asistente, con las mismas instrucciones y el mismo registro de reportes.

## Acceso

- En local: http://localhost:3001
- En producción: el dominio que le asignes. El chat del sitio de BuildWise Labs usa esta interfaz.

La **primera cuenta** que se registra en OpenWebUI queda como administrador. Créala tú antes de compartir el enlace.

## Cómo está conectada

OpenWebUI habla con la app como si fuera un proveedor compatible con OpenAI. En el `docker-compose.yml` se configura así:

```yaml title="docker-compose.yml"
openwebui:
  environment:
    - OPENAI_API_KEY=local
    - OPENAI_API_BASE_URL=http://app:3000/v1
```

La app expone `GET /v1/models` y `POST /v1/chat/completions`. Ver la [referencia de la API](../referencia/api.md#api-compatible-con-openai).

## Datos

Las conversaciones y los usuarios de OpenWebUI viven en el volumen `open-webui`. Inclúyelo en tus respaldos (ver [Despliegue](../operacion/despliegue.md#respaldos)).
