---
title: Requisitos previos
description: Lo que necesitas antes de instalar el Chatbot PYME.
---

# Requisitos previos

## Cuentas y llaves

| Qué | Obligatorio | Dónde se consigue |
|---|---|---|
| API key de Anthropic | Sí | [console.anthropic.com](https://console.anthropic.com), en **API Keys** |
| Hoja de Google Sheets | No | Tu cuenta de Google |
| Cuenta de servicio de Google | Solo si usas Sheets | [Google Cloud Console](https://console.cloud.google.com), en **IAM → Cuentas de servicio**, con la API de Google Sheets activada |

## Software

- **Docker** con Docker Compose: [Docker Desktop](https://www.docker.com/products/docker-desktop/) en Windows o macOS, o Docker Engine en Linux. Ver [Sistemas operativos](../compatibilidad/sistemas-operativos.md).
- **Git**, para descargar y actualizar el proyecto.
- **Node.js 20 o superior**, solo si quieres correr la app sin Docker.

## Servidor

Para uso en producción, un servidor Linux con Docker. Las necesidades dependen de si vas a correr modelos locales con Ollama:

| Uso | Memoria | Notas |
|---|---|---|
| Solo Claude (lo normal) | 4 GB | Las respuestas las genera Anthropic; el servidor solo atiende el chat. |
| Con modelos locales en Ollama | 8 GB o más | Ver [RAM mínima recomendada](../compatibilidad/ram.md). |

## Red

- Salida a internet por HTTPS (puerto 443), para hablar con Claude y con Google.
- Un dominio con certificado HTTPS si vas a publicarlo. Ver [Requisitos de red](../compatibilidad/red.md).

## Navegador de los usuarios

Chrome o Edge para usar la voz. Para texto y archivos funciona cualquier navegador moderno. Ver [Navegadores](../compatibilidad/sistemas-operativos.md#navegadores).
