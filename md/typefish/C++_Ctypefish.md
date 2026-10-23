# Typefish 🐟

> Núcleo modular en C/C++ para análisis de tipos y herramientas de lenguaje.

[![Licencia](https://img.shields.io/badge/licencia-MIT-blue.svg)](LICENSE)
[![C](https://img.shields.io/badge/C-C17-informational)]()
[![C++](https://img.shields.io/badge/C%2B%2B-17%2F20-informational)]()
[![Estado](https://img.shields.io/badge/estado-en%20desarrollo-yellow)]()

---

## 📖 Tabla de contenidos

- [Descripción](#-descripción)
- [Características](#-características)
- [Arquitectura](#-arquitectura)
  - [Diagrama de capas](#diagrama-de-capas)
  - [Principios](#principios)
  - [C puro vs C++ moderno](#c-puro-vs-c-moderno)
  - [Decisión de Typefish](#decisión-de-typefish)
- [Requisitos](#-requisitos)
- [Compilación](#-compilación)
- [Uso rápido](#-uso-rápido)
- [Estructura del proyecto](#-estructura-del-proyecto)
- [Módulos](#-módulos)
- [Decisiones de diseño](#-decisiones-de-diseño)
- [Desarrollo](#-desarrollo)
- [Testing](#-testing)
- [Roadmap](#-roadmap)
- [Contribuir](#-contribuir)
- [Licencia](#-licencia)

---

## 🎯 Descripción

**Typefish** es un núcleo modular para construir herramientas de análisis de
tipos, parsers, type checkers y otras herramientas de lenguaje. Está diseñado
para ser:

- **Modular**: cada componente es independiente y testeable.
- **Portable**: compila en Linux, macOS y Windows.
- **Extensible**: nuevos módulos se registran sin tocar el núcleo.
- **Determinista**: sin dependencias externas innecesarias.

---

## ✨ Características

- ✅ Núcleo con gestión de memoria explícita (arenas + pools)
- ✅ Sistema de errores unificado con códigos de retorno
- ✅ Logging configurable por niveles
- ✅ Registro y descubrimiento de módulos
- ✅ API pública estable (`extern "C"`)
- ✅ Tests con sanitizers (ASan/UBSan)
- 🚧 [Característica en desarrollo]
- ⬜ [Característica planeada]

---

## 🏗️ Arquitectura

### Diagrama de capas
