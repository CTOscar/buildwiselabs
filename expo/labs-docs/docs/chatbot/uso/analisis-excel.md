---
sidebar_position: 3
title: Análisis de Excel
description: Sube un reporte de combustible y obtén totales, promedios y un Excel de resultado.
---

# Análisis de Excel

El asistente analiza reportes de carga de combustible: calcula gastos, promedios y desgloses, y los explica.

## Cómo usarlo

1. En el chat, haz clic en 📎 y elige tu archivo `.xlsx`, `.xls` o `.csv`.
2. La app detecta las columnas y calcula:
   - Gasto total y litros totales.
   - Promedio diario y semanal.
   - Desglose por día, por semana y por vehículo o unidad.
3. Se genera un Excel con el resultado, listo para descargar.
4. El asistente explica los números y da una recomendación.

## Columnas que reconoce

No hace falta que las columnas se llamen de una forma exacta: la app las reconoce por su nombre.

| Dato | Nombres que acepta |
|---|---|
| Fecha | fecha, date, día |
| Vehículo | vehículo, unidad, auto, carro, placa, coche, camión |
| Litros | litros, lts, cantidad, volumen |
| Precio por litro | precio, costo por litro, p/l |
| Total | total, importe, monto, gasto |
| Kilómetros | km, kilómetros, distancia, odómetro |

Si el archivo no trae una columna de total, se calcula con litros por precio.

## Requisitos del archivo

- Los encabezados van en la **primera fila**.
- Formatos: `.xlsx`, `.xls` o `.csv`.
- Tamaño máximo: **10 MB**.
