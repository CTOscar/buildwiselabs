---
sidebar_position: 1
title: Chat por texto y voz
description: Cómo conversar con el asistente desde el chat web.
---

# Chat por texto y voz

El chat web está en el puerto `3000` de la app, o en el dominio donde la publiques.

## Texto

Escribe tu mensaje y presiona **Enter** o el botón de enviar. La respuesta aparece mientras se va escribiendo, sin esperar a que esté completa.

## Voz

Haz clic en el micrófono 🎤, habla y el mensaje se envía solo al terminar. El asistente también puede contestar en voz alta.

:::tip Para que el micrófono funcione
- Usa **Chrome** o **Edge**.
- En producción la página tiene que abrirse con **HTTPS**: los navegadores no dan acceso al micrófono en páginas sin cifrar. En `localhost` sí funciona sin HTTPS.
:::

## Contexto de la conversación

El asistente recuerda lo que se ha dicho mientras la pestaña esté abierta. Si recargas la página, la conversación empieza de cero. Para conservar el historial entre sesiones, usa [OpenWebUI](./openwebui.md).

## Lo que pasa por detrás

El chat web se conecta a la app por Socket.IO. Cada mensaje se manda a Claude junto con el historial de la conversación, y la respuesta vuelve en fragmentos que se van mostrando. Si el mensaje trae datos de la operación, en paralelo se [registra el reporte](./reportes-de-campo.md) sin retrasar la respuesta.
