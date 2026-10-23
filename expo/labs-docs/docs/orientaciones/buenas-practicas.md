---
title: Buenas prácticas
description: Recomendaciones para sacarle el mayor provecho al chatbot.
---

# Buenas prácticas

## Al registrar reportes

- **Un registro por mensaje.** "20 litros de diésel al JD 5076E" y "poda en el bloque 3 con 12 personas" van mejor en dos mensajes que en uno.
- **Di el lugar, el responsable y la cantidad.** Son los datos que más se pierden: "en la huerta El Nogal", "responsable Juan Pérez", "340 árboles".
- **Usa las palabras de siempre.** El registro se activa con palabras de la operación (litros, tractor, poda, riego, huerta…). Si tu equipo usa otras, agrégalas a las [palabras clave](../chatbot/configuracion.md#palabras-clave-de-registro).
- **Revisa la confirmación.** Cuando el registro llega a Google Sheets, el chat muestra lo que se guardó. Si algo salió mal, corrígelo en ese momento.

## Al operar el servidor

- **Respalda `app/outputs/` y los volúmenes** con regularidad. Ver [Despliegue → Respaldos](../chatbot/operacion/despliegue.md#respaldos).
- **Revisa los registros después de cada actualización:** `docker compose logs -f app` y busca `Claude test: OK ✓`.
- **Pon un límite de gasto** en la consola de Anthropic para que un uso inesperado no se convierta en una factura inesperada.
- **Prueba los cambios antes de producción.** Levanta una copia en otra máquina con su propio `.env` y su propia hoja de pruebas.

## Al cambiar las instrucciones del asistente

- Cambia una cosa a la vez y prueba con mensajes reales del equipo.
- Guarda la versión anterior de `getSystemPrompt()` por si hay que regresar.
- Ver [Guía de prompts](../educacion/guia-de-prompts.md).
