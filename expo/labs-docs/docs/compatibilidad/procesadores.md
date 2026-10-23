---
title: Procesadores
sidebar_label: Procesadores (x86-64, ARM64)
description: Arquitecturas de procesador en las que corre el chatbot.
---

# Procesadores

Las tres imágenes del chatbot se publican para las dos arquitecturas de 64 bits más comunes, y Docker descarga sola la que corresponde.

| Arquitectura | Ejemplos | App | OpenWebUI | Ollama |
|---|---|---|---|---|
| **x86-64** (`amd64`) | Intel Core, Xeon, AMD Ryzen, EPYC; la mayoría de los VPS | Sí | Sí | Sí |
| **ARM64** (`aarch64`) | Apple M1 a M4, AWS Graviton, Ampere, Raspberry Pi 4 y 5 | Sí | Sí | Sí |
| 32 bits | Equipos antiguos | No | No | No |

Para saber cuál tienes en Linux: `uname -m` (`x86_64` o `aarch64`).

## Recomendación

- **Solo Claude:** 2 núcleos alcanzan, porque las respuestas se generan en Anthropic.
- **Con modelos locales en Ollama:** entre más núcleos, mejor; y con una [GPU](./gpu.md), mucho mejor. Un Raspberry Pi puede correr la app, pero no es buena opción para modelos locales.
