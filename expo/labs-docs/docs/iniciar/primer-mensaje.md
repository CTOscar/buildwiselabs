---
title: Primer mensaje de prueba
description: Comprobar que el chatbot responde y registra reportes.
---

# Primer mensaje de prueba

Con el chatbot arriba, abre http://localhost:3000 (o tu dominio).

## 1. Que responda

Escribe:

> Hola, ¿qué puedes hacer?

La respuesta debe ir apareciendo mientras se escribe. Si se queda cargando o sale un error, revisa los registros con `docker compose logs -f app`.

## 2. Que registre un reporte

Escribe un mensaje con datos de la operación:

> Registra 20 litros de diésel al tractor JD 5076E para el desbarado en la huerta El Nogal, responsable Juan Pérez

Comprueba tres cosas:

1. **Registros de la app:** aparecen las líneas `[Excel] guardando categoria="maquinaria"` y `[Excel] OK`.
2. **Archivo del día:** en `app/outputs/` hay un `reporte_campo_AAAA-MM-DD.xlsx` con la fila en la hoja de maquinaria.
3. **Google Sheets** (si lo configuraste): la fila aparece en la pestaña **Maquinaria** y el chat muestra la confirmación de lo que se guardó.

## 3. Que analice un archivo

Haz clic en 📎 y sube un Excel de cargas de combustible con columnas como Fecha, Unidad, Litros y Precio. Debe aparecer el resumen con el gasto total, los promedios y un enlace para descargar el resultado. Ver [Análisis de Excel](../chatbot/uso/analisis-excel.md).

## 4. Que funcione la voz

Haz clic en 🎤 y di una frase. El texto debe aparecer en la caja y enviarse solo al terminar. En `localhost` funciona sin HTTPS; publicado, necesita HTTPS.

Si los cuatro pasos salen bien, el chatbot está listo.
