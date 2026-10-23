---
sidebar_position: 5
title: Webhooks
description: Recibir y mandar avisos entre sistemas.
---

# Webhooks

Un webhook es una URL que un sistema llama cuando pasa algo. Es la forma más simple de conectar herramientas que no se conocen entre sí: una alerta de TradingView que dispara un flujo, un flujo que avisa en Slack, un error que llega a Discord.

## Recibir un webhook

### En n8n

El nodo **Webhook** da una URL de prueba y una de producción. Lo que llegue en el cuerpo queda disponible para los nodos siguientes en `$json`.

### En una app Node.js (Express)

```js
import express from 'express';

const app = express();
app.use(express.json());

app.post('/webhooks/alertas', (req, res) => {
  // Un secreto compartido evita que cualquiera que conozca la URL dispare la acción
  if (req.get('x-webhook-secret') !== process.env.WEBHOOK_SECRET) {
    return res.sendStatus(401);
  }

  const alerta = req.body;
  console.log('Alerta recibida:', alerta);

  // Responde rápido; el trabajo pesado va después o en una cola
  res.sendStatus(204);
});

app.listen(3000);
```

:::warning Valida siempre
Una URL de webhook es pública por naturaleza. Exige un secreto, en un encabezado o en la URL, valida el contenido antes de usarlo y nunca ejecutes órdenes que lleguen en el cuerpo sin revisarlas.
:::

## Fuentes que usamos

### TradingView

Las alertas de TradingView pueden llamar una URL de webhook cuando se cumple una condición en la gráfica. El texto del mensaje de la alerta llega en el cuerpo del `POST`; si lo escribes como JSON, llega como JSON:

```json
{ "simbolo": "{{ticker}}", "precio": "{{close}}", "secreto": "tu-secreto" }
```

Como TradingView no permite encabezados personalizados, el secreto va dentro del mensaje y se valida en el receptor. Documentación: [alertas con webhook](https://www.tradingview.com/support/solutions/43000529348-about-webhooks/).

## Mandar avisos

### Slack

Crea un *Incoming Webhook* en la configuración de tu app de Slack y manda un `POST` con el texto:

```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"text": "✅ Reporte semanal generado"}' \
  "$SLACK_WEBHOOK_URL"
```

### Discord

En el canal: **Editar canal → Integraciones → Webhooks**. El mensaje va en `content`:

```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"content": "⚠️ El flujo de facturas falló"}' \
  "$DISCORD_WEBHOOK_URL"
```

Las URLs de webhook de Slack y Discord son credenciales: quien las tenga puede escribir en el canal. Guárdalas en variables de entorno.
