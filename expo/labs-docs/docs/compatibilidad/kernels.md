---
title: Kernels
sidebar_label: Kernels (Linux y WSL 2)
description: Qué kernel necesita Docker en cada sistema y cómo revisarlo.
---

# Kernels

Los contenedores comparten el kernel del sistema donde corren, así que Docker siempre necesita un **kernel de Linux de 64 bits**. De dónde sale ese kernel depende del sistema.

| Sistema | De dónde sale el kernel | Qué hacer |
|---|---|---|
| **Linux** | El del propio servidor | Usar una distribución con soporte vigente y mantenerla actualizada. |
| **Windows** | El kernel de Linux de Microsoft para WSL 2 | Mantener WSL actualizado. |
| **macOS** | Docker Desktop arranca una máquina virtual ligera con Linux | Nada: viene incluido y se actualiza con Docker Desktop. |

## Linux

Revisa la versión del kernel y la arquitectura:

```bash
uname -r     # versión del kernel
uname -m     # x86_64 o aarch64 (ARM64)
```

Las actualizaciones del kernel llegan con las de la distribución:

```bash
sudo apt update && sudo apt upgrade     # Ubuntu y Debian
sudo reboot                             # el kernel nuevo se usa después de reiniciar
```

Si vas a usar una GPU NVIDIA con Ollama, el controlador tiene que corresponder al kernel instalado: después de actualizar el kernel, revisa que `nvidia-smi` siga funcionando. Ver [GPU recomendadas](./gpu.md).

## Windows (WSL 2)

Docker Desktop corre sobre WSL 2, que usa un kernel de Linux mantenido por Microsoft. Para revisarlo y actualizarlo, en PowerShell:

```powershell
wsl --version     # muestra la versión de WSL y del kernel
wsl --update      # instala la versión más reciente
```

## Más información

- [Documentación del kernel de Linux](https://docs.kernel.org/)
- [WSL en Microsoft Learn](https://learn.microsoft.com/windows/wsl/)
