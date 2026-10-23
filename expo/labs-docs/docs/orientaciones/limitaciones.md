---
title: Limitaciones conocidas
description: Lo que el chatbot no hace, o no hace todavía.
---

# Limitaciones conocidas

## De uso

| Limitación | Detalle |
|---|---|
| **Memoria del chat web** | La conversación vive solo mientras la pestaña está abierta. Al recargar, empieza de cero. Para historial, usa [OpenWebUI](../chatbot/uso/openwebui.md). |
| **Registro por palabras clave** | Un mensaje sin palabras de la operación no se registra, aunque traiga datos. Ver [palabras clave](../chatbot/configuracion.md#palabras-clave-de-registro). |
| **Preguntas que se registran** | Una pregunta que menciona la operación ("¿cuánto diésel cargamos?") también agrega una fila al Excel del día, porque el registro se activa por las palabras, no por la intención. En Google Sheets no pasa, porque ahí Claude decide si hay datos que guardar. |
| **Extracción en el Excel del día** | El Excel se llena con reglas, no con IA: si el mensaje usa una forma poco común, algún campo puede quedar vacío. Google Sheets usa a Claude y suele ser más completo. |
| **Archivos** | Hasta 10 MB, en `.xlsx`, `.xls` o `.csv`, con encabezados en la primera fila. |
| **Voz** | Solo Chrome y Edge, con HTTPS. La lectura en voz alta se corta a los primeros 500 caracteres de la respuesta. |
| **Idioma** | El dictado y la voz están configurados en español de México (`es-MX`). |
| **Requiere internet** | Sin conexión a Anthropic, el asistente no responde. |
| **La IA se puede equivocar** | Revisa los datos críticos, como cantidades y costos, antes de usarlos para pagos o decisiones. |

## Técnicas

Problemas identificados en el código actual, con su arreglo:

| Problema | Efecto | Arreglo |
|---|---|---|
| `/v1/chat/completions` sin `stream` usa una variable `MODEL` que no existe | Esa ruta responde con error. OpenWebUI usa `stream: true`, así que en el uso normal no se nota | Cambiar `MODEL` por `CLAUDE_MODEL` en `app/server.js` |
| El *streaming* de `/v1` se simula | La respuesta completa se genera primero y después se envía letra por letra, así que tarda lo mismo en empezar a aparecer | Usar `anthropic.messages.stream`, como ya lo hace el chat web |
| `docker-compose.yml` pasa `GROQ_API_KEY` en lugar de `ANTHROPIC_API_KEY` | El asistente no responde con Docker | Ver [Instalación](../chatbot/instalacion.md#2-pasar-las-variables-al-contenedor) |
| Rutas de reportes sin contraseña | Cualquiera con la dirección puede descargar los Excel | Ver [Seguridad y privacidad](./seguridad.md#los-reportes) |
