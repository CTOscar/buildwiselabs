---
title: Reportar un problema
description: Qué información incluir para resolver un problema rápido.
---

# Reportar un problema

Antes de reportar, revisa [Solución de problemas](../chatbot/operacion/solucion-de-problemas.md): ahí están los casos más comunes.

## Qué incluir

Un buen reporte se resuelve en una sola vuelta. Incluye:

1. **Qué intentabas hacer.** Por ejemplo: "registrar la carga de diésel desde el celular".
2. **Qué pasó y qué esperabas que pasara.**
3. **El mensaje exacto** que escribiste o dictaste, si aplica.
4. **Fecha y hora aproximadas.** Con eso se encuentra el error en los registros.
5. **Dónde:** chat web, OpenWebUI o el visor de reportes, y en qué navegador.
6. **Captura de pantalla** del error, si la hay.
7. **Registros de la app**, si tienes acceso al servidor:

   ```bash
   docker compose logs --since 30m app > registros.txt
   ```

:::danger No mandes llaves
Antes de compartir registros o capturas, revisa que no aparezca tu `ANTHROPIC_API_KEY`, el JSON de la cuenta de servicio ni ningún otro dato del `.env`.
:::

## Dónde reportarlo

En [Contacto directo](./contacto.md).
