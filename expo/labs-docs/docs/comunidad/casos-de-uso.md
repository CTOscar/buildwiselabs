---
title: Casos de uso compartidos
description: Para qué operaciones está pensado el chatbot y cómo se usa en cada una.
---

# Casos de uso compartidos

## Reportes de campo en huertas

Es el caso para el que está armado el chatbot. Los encargados le escriben o le dictan lo que se hizo en la jornada, con sus propias palabras:

> Poda en el bloque 3 con 12 personas, 340 árboles, responsable María López

El asistente identifica si es maquinaria, rendimiento de jornal, insumos o resumen semanal, extrae los datos y los guarda en el Excel del día y en Google Sheets. En la oficina se consultan en el [visor de reportes](https://buildwiselabs.net/servicios/visor-reportes), sin capturar nada a mano.

**Lo que se usa:** [chat por voz](../chatbot/uso/chat.md#voz), [reportes de campo](../chatbot/uso/reportes-de-campo.md) y la [API de reportes](../chatbot/referencia/api.md#reportes). Hay un video del uso en campo en [Tutoriales en video](../educacion/tutoriales.md).

## Control de combustible

Se sube al chat el archivo de cargas de diésel o gasolina y se obtiene el gasto total, los promedios por día y por semana y el desglose por unidad, más un Excel listo para entregar. El asistente explica los números y da una recomendación.

**Lo que se usa:** [análisis de Excel](../chatbot/uso/analisis-excel.md).

## Atención desde una interfaz completa

Para equipos que quieren historial de conversaciones y una cuenta por persona, el mismo asistente se usa desde [OpenWebUI](../chatbot/uso/openwebui.md), en la computadora o en el celular.

## Comparte el tuyo

¿Usas el chatbot de otra forma? Cuéntanos en [Contacto directo](../soporte/contacto.md) o en el [Canal de Discord](./discord.md) y lo sumamos aquí.
