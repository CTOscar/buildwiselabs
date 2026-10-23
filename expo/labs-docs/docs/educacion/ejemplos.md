---
title: Ejemplos prácticos
description: Mensajes listos para probar, por categoría, y ejemplos de la API.
---

# Ejemplos prácticos

## Mensajes por categoría

### Maquinaria

> Cargamos 50 litros de diésel al JD 5076E a 24.50 por litro para el desbarado en la huerta El Nogal, responsable Juan Pérez

Se registra el equipo, el combustible, los litros, el precio por litro, la actividad, la huerta y el responsable. Con litros y precio, también se calcula el costo total.

### Rendimiento de jornal

> Poda en el bloque 3 con 12 personas, 340 árboles, responsable María López

> Riego en la huerta Las Palmas, faltaron 2 personas por lluvia

El segundo marca la **incidencia** y, cuando puede, el motivo.

### Insumos

> Aplicamos 20 kg de fertilizante en la huerta Las Palmas

### Resumen semanal

> Resumen semanal de la huerta El Nogal, semana del 6 al 12 de octubre, avance de 4 ha

## Preguntas

> ¿Qué unidad gastó más la semana pasada?

> Explícame el resultado del análisis y dime qué conviene revisar

:::note
Una pregunta que menciona la operación ("¿cuánto **diésel** cargamos?") también deja una fila en el Excel del día. Ver [Limitaciones conocidas](../orientaciones/limitaciones.md).
:::

## Desde la API

Pedir una respuesta con el formato de OpenAI:

```bash
curl http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{ "stream": true, "messages": [{ "role": "user", "content": "Riego en El Nogal con 6 personas" }] }'
```

Listar los reportes del servidor:

```bash
curl http://localhost:3000/api/reportes/lista
```

Analizar un archivo de combustible:

```bash
curl -F "file=@cargas-septiembre.xlsx" http://localhost:3000/upload
```

Más en la [referencia de la API](../chatbot/referencia/api.md).
