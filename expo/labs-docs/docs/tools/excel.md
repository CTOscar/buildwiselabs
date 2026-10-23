---
sidebar_position: 4
title: Procesamiento de Excel
description: Leer archivos con columnas desordenadas, calcular resúmenes y generar reportes.
---

# Procesamiento de Excel

Casi todos los clientes llegan con datos en Excel, y casi nunca con el mismo formato. Esta pieza lee esos archivos sin pedir que las columnas tengan un nombre exacto, calcula resúmenes y genera reportes nuevos.

Está en `app/excel.js` del Chatbot PYME, con [SheetJS](https://docs.sheetjs.com) (`xlsx`) para leer y [ExcelJS](https://github.com/exceljs/exceljs) para escribir.

| Función | Qué hace |
|---|---|
| `processExcel(ruta)` | Lee un `.xlsx`, `.xls` o `.csv`, reconoce las columnas y calcula totales, promedios y desgloses. |
| `generateResultExcel(datos, ruta)` | Escribe un Excel con el resultado del análisis, listo para descargar. |
| `appendToFieldReport(categoria, datos, ruta)` | Agrega una fila al reporte de campo del día, en la hoja de su categoría. |

## Reconocer columnas por su nombre

En vez de exigir "Litros" escrito exactamente así, cada dato se busca con una expresión regular sobre los encabezados:

```js
const COLUMNAS = {
  fecha:    /fecha|date|d[íi]a/i,
  vehiculo: /veh[íi]culo|unidad|auto|carro|placa|coche|camion/i,
  litros:   /litros?|lts?|cantidad|volumen/i,
  precio:   /precio|costo.?litro|p\/l/i,
  total:    /total|importe|monto|gasto/i,
  km:       /km|kil[oó]metros?|distancia|odometro/i,
};
```

Así "Lts", "LITROS" o "Cantidad (l)" caen en la misma columna. Si falta el total, se calcula con litros por precio.

## Fechas de Excel

Excel guarda las fechas como números (días desde 1900), y los archivos de texto las traen como cadenas. Antes de agrupar por día o por semana, todas se convierten al mismo formato; las que no se pueden leer quedan como "Sin fecha" en vez de romper el cálculo.

## Reporte de campo diario

Cada día tiene su archivo, `reporte_campo_AAAA-MM-DD.xlsx`. `appendToFieldReport` agrega la fila en la hoja de su categoría (maquinaria, rendimiento, insumos o resumen), con título, encabezados con formato y la primera fila fija para que no se pierdan al bajar.

## Dónde se usa

- [Análisis de Excel del Chatbot PYME](../chatbot/uso/analisis-excel.md)
- [Reportes de campo](../chatbot/uso/reportes-de-campo.md)
