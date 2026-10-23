---
title: Guía de prompts
description: Cómo hablarle al asistente y cómo ajustar sus instrucciones.
---

# Guía de prompts

## Para el equipo: cómo escribirle

El asistente entiende lenguaje natural, pero algunos hábitos hacen que registre mejor.

| En vez de… | Mejor… | Por qué |
|---|---|---|
| "Ya quedó lo del tractor" | "Cargamos 40 litros de diésel al JD 5076E" | Trae la cantidad, el combustible y el equipo. |
| "Podamos hoy" | "Poda en la huerta El Nogal con 8 personas, 260 árboles" | Trae el lugar, las personas y el avance. |
| "Le echamos fertilizante" | "Aplicamos 20 kg de fertilizante en el bloque 2" | Trae la cantidad y la unidad. |
| Un mensaje con todo el día | Un mensaje por actividad | Cada registro queda en su fila y su categoría. |

Para preguntar, sé igual de concreto: "¿Qué unidad gastó más la semana pasada?" funciona mejor que "¿cómo vamos?".

## Para quien administra: las instrucciones del asistente

El comportamiento del asistente lo define la función `getSystemPrompt()` en `app/server.js`. Hoy le dice:

- **Quién es:** un asistente de reportes de campo para una empresa agrícola.
- **Qué hace:** interpreta solicitudes, que pueden llegar por texto o por voz, y las convierte en acciones sobre el libro de Excel.
- **Qué día es:** la fecha se calcula en cada mensaje, para que "hoy" y "ayer" se interpreten bien.

### Cómo ajustarlas

1. **Di el rol y el contexto primero.** Qué empresa es, qué hace el equipo y quién le escribe.
2. **Lista lo que debe hacer, en orden de importancia.**
3. **Da ejemplos** de mensajes reales y de la respuesta que esperas. Es lo que más mejora el resultado.
4. **Di qué no debe hacer.** Por ejemplo: "si falta la cantidad, pregúntala; no la inventes".
5. **Prueba con mensajes reales** del equipo, no con frases de ejemplo.

Después de cambiarlas, reconstruye la app: `docker compose up -d --build app`.

:::tip
Cambia una cosa a la vez. Si cambias tres instrucciones y algo empeora, no sabrás cuál fue.
:::
