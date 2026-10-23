---
title: GPU recomendadas
sidebar_label: GPU recomendadas (NVIDIA, AMD)
description: Cuándo hace falta una tarjeta gráfica y cuáles sirven.
---

# GPU recomendadas

**Con Claude no hace falta GPU.** Las respuestas se generan en los servidores de Anthropic.

La GPU solo importa si vas a correr modelos locales con **Ollama**: con ella, un modelo responde muchas veces más rápido que solo con el procesador.

| Fabricante | Soporte en Ollama | En Docker |
|---|---|---|
| **NVIDIA** | Tarjetas con *compute capability* 5.0 o superior, con un controlador reciente | Instala el [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html) y da acceso a la GPU al servicio `ollama` |
| **AMD** | Tarjetas Radeon compatibles con ROCm | Usa la imagen `ollama/ollama:rocm` |
| **Apple Silicon** | Sí, con Metal | **No dentro de Docker:** en Mac, Ollama solo usa la GPU instalado directamente, fuera de Docker |

La lista exacta de tarjetas compatibles está en la [documentación de Ollama sobre GPU](https://github.com/ollama/ollama/blob/main/docs/gpu.md).

## Dar acceso a la GPU NVIDIA en `docker-compose.yml`

```yaml title="docker-compose.yml"
services:
  ollama:
    image: ollama/ollama:latest
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
```

Para comprobarlo: `docker compose exec ollama nvidia-smi` debe mostrar la tarjeta.

## Memoria de la tarjeta (VRAM)

El modelo tiene que caber en la memoria de la GPU para aprovecharla por completo. Como referencia, los modelos de 7 a 8 mil millones de parámetros caben en tarjetas de 8 GB.
