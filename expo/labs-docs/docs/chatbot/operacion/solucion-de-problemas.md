---
sidebar_position: 2
title: Solución de problemas
description: Los problemas más comunes y cómo resolverlos.
---

# Solución de problemas

## El asistente no responde

Revisa los registros:

```bash
docker compose logs -f app
```

- **`ANTHROPIC_API_KEY: NO ✗`**: la llave no llegó al contenedor. Confirma que está en `.env` **y** declarada en `environment` del servicio `app` (ver [Instalación](../instalacion.md#2-pasar-las-variables-al-contenedor)). Después, `docker compose up -d`.
- **`Claude test FALLÓ`**: la llave existe pero no funciona. Revisa en [console.anthropic.com](https://console.anthropic.com) que esté activa y que la cuenta tenga saldo.

## Los reportes no aparecen en Google Sheets

- **`⚠ Google Sheets no configurado`**: falta `GOOGLE_SHEET_ID`. Los reportes se siguen guardando en Excel.
- **`Error inicializando Sheets`**: casi siempre es permiso. Comparte la hoja con el `client_email` de la cuenta de servicio, como **editor**.
- **El mensaje no se registró**: el asistente solo registra cuando el mensaje trae alguna de las [palabras clave](../configuracion.md#palabras-clave-de-registro). Prueba incluyendo la actividad o el dato, por ejemplo "registra 40 litros de diésel".

## El micrófono no funciona

- Usa Chrome o Edge.
- En producción la página tiene que estar en **HTTPS**.
- Revisa que el navegador tenga permiso de micrófono para el sitio.

## El Excel no se procesa

- Los encabezados tienen que estar en la primera fila.
- Formatos: `.xlsx`, `.xls` o `.csv`, de hasta 10 MB.
- Revisa que las columnas tengan nombres reconocibles (ver [Análisis de Excel](../uso/analisis-excel.md#columnas-que-reconoce)).

## OpenWebUI no ve el modelo

OpenWebUI pide la lista de modelos a `http://app:3000/v1/models`. Si no aparece:

- Confirma que la app está arriba: `docker compose ps`.
- Revisa que `OPENAI_API_BASE_URL` sea `http://app:3000/v1`.
- En OpenWebUI, ve a **Ajustes → Conexiones** y actualiza la lista de modelos.
