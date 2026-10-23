---
title: RAM mínima recomendada
description: Cuánta memoria necesita el servidor, con y sin modelos locales.
---

# RAM mínima recomendada

| Uso | RAM | Por qué |
|---|---|---|
| **Solo Claude** (lo normal) | 4 GB | La app y OpenWebUI son ligeras: las respuestas se generan en Anthropic. Docker Desktop pide 4 GB como mínimo. |
| **Claude + Ollama con modelos de 7B** | 8 GB | El modelo se carga completo en memoria. |
| **Modelos de 13B** | 16 GB | |
| **Modelos de 33B** | 32 GB | |

Las cifras de los modelos son las que recomienda [Ollama](https://github.com/ollama/ollama). Con una [GPU](./gpu.md), el modelo usa la memoria de la tarjeta en lugar de la del sistema.

## Revisar el consumo

```bash
docker stats     # memoria y CPU de cada contenedor, en vivo
```

Si `ollama` se acerca al límite de memoria del servidor, usa un modelo más chico o agrega memoria.
