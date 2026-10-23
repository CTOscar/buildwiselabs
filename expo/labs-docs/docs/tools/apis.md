---
sidebar_position: 1
title: APIs disponibles
description: Las APIs propias y de terceros que usamos en los proyectos.
---

# APIs disponibles

## APIs propias

| API | Qué ofrece | Documentación |
|---|---|---|
| **Chatbot PYME** | Chat compatible con OpenAI (`/v1/chat/completions`), lista y contenido de reportes de campo, y análisis de archivos de combustible. | [Referencia de la API](../chatbot/referencia/api.md) |

## APIs de terceros que integramos

### Claude (Anthropic)

El modelo de lenguaje detrás de los asistentes y de la extracción de datos.

```bash
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{
    "model": "claude-haiku-4-5-20251001",
    "max_tokens": 512,
    "messages": [{ "role": "user", "content": "Resume este reporte en tres puntos." }]
  }'
```

Documentación: [docs.anthropic.com](https://docs.anthropic.com)

### Google Sheets

Donde quedan los reportes que el equipo consulta. Se usa con una **cuenta de servicio**: se comparte la hoja con su correo, como editor, y la app escribe filas con la librería `googleapis`.

Documentación: [developers.google.com/sheets/api](https://developers.google.com/sheets/api)

### Banco de México (SIE)

Tipo de cambio e indicadores oficiales para el servicio **Bank Central**. Cada consulta necesita un token gratuito, que se manda en el encabezado `Bmx-Token`.

```bash
# Tipo de cambio FIX del día
curl -H "Bmx-Token: $BANXICO_TOKEN" \
  https://www.banxico.org.mx/SieAPIRest/service/v1/series/SF43718/datos/oportuno
```

Documentación: [banxico.org.mx/SieAPIRest](https://www.banxico.org.mx/SieAPIRest/service/v1/)

### CoinGecko

Precios de criptomonedas con conversión a pesos para el servicio **Cripto World**.

```bash
curl "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=mxn"
```

Documentación: [docs.coingecko.com](https://docs.coingecko.com)

:::note Llaves y tokens
Todas las llaves van en variables de entorno (`.env`), nunca en el código ni en el repositorio. Si una se filtra, se revoca y se genera otra.
:::
