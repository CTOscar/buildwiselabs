---
sidebar_position: 3
title: Configuración
description: Variables de entorno, modelo, instrucciones del asistente y palabras clave.
---

# Configuración

## Variables de entorno

| Variable | Obligatoria | Para qué sirve |
|---|---|---|
| `ANTHROPIC_API_KEY` | Sí | Llave de la API de Claude. Sin ella el asistente no responde. |
| `ANTHROPIC_WORKSPACE_ID` | No | Workspace de Anthropic al que se cargan las llamadas, si usas varios. |
| `GOOGLE_SHEET_ID` | No | Identificador de la hoja de cálculo donde se guardan los reportes. Es la parte de la URL entre `/d/` y `/edit`. |
| `GOOGLE_SERVICE_ACCOUNT` | Con Sheets | El JSON completo de la cuenta de servicio de Google, en una sola línea. |
| `PORT` | No | Puerto de la app. Por defecto, `3000`. |

Para que el registro en Google Sheets funcione, comparte la hoja con el correo de la cuenta de servicio (`client_email`) con permiso de **editor**.

## Modelo

El modelo de Claude se define en `app/server.js`, en la constante `CLAUDE_MODEL`. Es el mismo para el chat, para la extracción de datos y para la prueba que se hace al arrancar.

```js title="app/server.js"
const CLAUDE_MODEL = 'claude-...';
```

Después de cambiarlo, reconstruye el contenedor con `docker compose up -d --build`.

## Instrucciones del asistente

Lo que el asistente es y cómo debe comportarse está en la función `getSystemPrompt()` de `app/server.js`. Ahí se le dice que es un asistente de reportes de campo para una empresa agrícola, que la información puede llegar por texto o por voz, y que tiene la fecha del día. Para adaptarlo a otra operación, ese es el texto que se edita.

## Palabras clave de registro

El asistente solo intenta guardar datos cuando el mensaje contiene alguna palabra relacionada con la operación. Así evita una llamada extra al modelo en cada conversación casual. La lista está en la constante `KEYWORDS_SHEETS`:

> registro, anotar, guardar, diésel, gasolina, combustible, litros, tractor, maquinaria, implemento, huerta, poda, riego, cosecha, fumigación, fertilizante, insumo, rendimiento, jornal, personas, árboles, avance, incidencia, responsable, ubicación

Si tu operación usa otras palabras, como otros cultivos, equipos o actividades, agrégalas a esa expresión regular.

## Pestañas de Google Sheets

Al arrancar, la app revisa la hoja y crea las pestañas que falten, cada una con sus encabezados:

| Categoría | Pestaña | Campos principales |
|---|---|---|
| Maquinaria | `Maquinaria` | Fecha, equipo, implemento, tipo de combustible, actividad, huerta, responsable, litros, precio por litro, costo total, avance en hectáreas |
| Rendimiento | `Rendimiento Diario Jornal` | Fecha, actividad, huerta, responsable, número de personas, cantidad realizada, meta, % de cumplimiento, incidencia |
| Insumos | `Insumos` | Fecha, recurso, cantidad, unidad, motivo de uso, huerta, costo por unidad, costo total |
| Resumen | `Resumen Semanal` | Semana, actividad, huerta, responsable, total de personas, total de cantidad |

Las columnas exactas están en `TABS` y `HEADERS`, en `app/sheets.js`.
