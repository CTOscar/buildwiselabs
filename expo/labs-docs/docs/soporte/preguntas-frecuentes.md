---
title: Preguntas frecuentes
description: Respuestas rápidas sobre el Chatbot PYME.
---

# Preguntas frecuentes

### ¿Necesita internet?

Sí. Las respuestas las genera Claude en los servidores de Anthropic, así que el servidor del chatbot necesita salida a internet. Los usuarios, a su vez, necesitan conexión para abrir el chat.

### ¿Cuánto cuesta usar Claude?

La API de Anthropic cobra por uso: por la cantidad de texto que se envía y que se recibe. Puedes ver el consumo y poner límites de gasto en [console.anthropic.com](https://console.anthropic.com).

### ¿Funciona sin Google Sheets?

Sí. Sin Google Sheets los reportes se guardan solo en el Excel del día, en `app/outputs/`.

### ¿Recuerda las conversaciones?

En el chat web, solo mientras la pestaña está abierta. En [OpenWebUI](../chatbot/uso/openwebui.md) las conversaciones quedan guardadas por usuario.

### ¿Por qué un mensaje no se registró?

El registro solo se activa cuando el mensaje trae palabras de la operación, como litros, tractor, poda o huerta. Ver [palabras clave](../chatbot/configuracion.md#palabras-clave-de-registro).

### ¿Qué archivos puedo subir?

`.xlsx`, `.xls` y `.csv` de hasta 10 MB, con los encabezados en la primera fila.

### ¿En qué navegadores funciona la voz?

Chrome y Edge, en computadora y en Android. Ver [Plugins de voz](../tools/voz.md#compatibilidad).

### ¿Puedo usar modelos locales en lugar de Claude?

El `docker-compose.yml` incluye Ollama para eso, pero la versión actual de la app responde con Claude. Cambiarlo requiere ajustar el código de la app.

### ¿Varias personas pueden usarlo a la vez?

Sí. Cada pestaña del chat web tiene su propia conversación, y en OpenWebUI cada usuario tiene su cuenta.
