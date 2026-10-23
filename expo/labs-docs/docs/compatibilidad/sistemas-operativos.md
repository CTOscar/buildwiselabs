---
title: Sistemas operativos
sidebar_label: Sistemas operativos (Windows, Linux, macOS)
description: En qué sistemas corre el servidor y en qué navegadores se usa el chat.
---

# Sistemas operativos

## Servidor

El chatbot corre en Docker, así que funciona en cualquier sistema donde corra Docker.

| Sistema | Cómo | Uso recomendado |
|---|---|---|
| **Linux** | Docker Engine con Compose | **Producción.** Ubuntu 22.04 o 24.04 LTS, o Debian 12. |
| **Windows** | Docker Desktop con WSL 2 | Desarrollo y pruebas. Windows 10 22H2 o Windows 11, de 64 bits. |
| **macOS** | Docker Desktop | Desarrollo y pruebas. Docker da soporte a la versión actual de macOS y a las dos anteriores. |

Los requisitos exactos cambian con cada versión de Docker; los vigentes están en la documentación de [Docker Desktop para Windows](https://docs.docker.com/desktop/setup/install/windows-install/), [para Mac](https://docs.docker.com/desktop/setup/install/mac-install/) y de [Docker Engine para Linux](https://docs.docker.com/engine/install/).

## Navegadores

Lo que usan las personas del equipo para abrir el chat:

| Navegador | Texto y archivos | Voz |
|---|---|---|
| **Chrome** (Windows, macOS, Linux, Android) | Sí | Sí |
| **Edge** | Sí | Sí |
| **Safari** (macOS, iPhone) | Sí | Parcial |
| **Firefox** | Sí | No: no tiene reconocimiento de voz |

En iPhone todos los navegadores usan el motor de Safari, así que la voz funciona igual de parcial en cualquiera. Ver [Plugins de voz](../tools/voz.md#compatibilidad).
