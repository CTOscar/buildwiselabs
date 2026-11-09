# Ejecutar `curl` con JSON en PowerShell — Guía de referencia

Guía práctica con todas las formas de enviar un body JSON usando `curl.exe` desde PowerShell (Windows), con sus ventajas, desventajas y cuándo usar cada una.

> **TL;DR:** En PowerShell 5.1, la única sintaxis que funciona de forma fiable con `curl.exe` y comillas dobles dentro del JSON es `-d '{\"clave\":\"valor\"}'` (comillas simples por fuera, `\"` por dentro). En PowerShell 7+ ya puedes usar `-d '{"clave":"valor"}'` directamente.

---

## Índice

- [El problema](#el-problema)
- [Opciones de ejecución](#opciones-de-ejecución)
  - [Opción 1 — Comillas simples + `\"` (recomendada en PS 5.1)](#opción-1--comillas-simples--escape-por-dentro-recomendada-en-ps-51)
  - [Opción 2 — Operador `--%` (stop-parsing)](#opción-2--operador---stop-parsing)
  - [Opción 3 — Archivo con `--data-binary`](#opción-3--archivo-con---data-binary)
  - [Opción 4 — Here-string de PowerShell](#opción-4--here-string-de-powershell)
  - [Opción 5 — `Invoke-RestMethod` (nativo, sin curl)](#opción-5--invoke-restmethod-nativo-sin-curl)
  - [Opción 6 — `curl.exe` desde PowerShell 7+](#opción-6--curlexe-desde-powershell-7)
- [Tabla comparativa](#tabla-comparativa)
- [Verificación contra httpbin](#verificación-contra-httpbin)
- [Errores comunes](#errores-comunes)
- [Recomendación final](#recomendación-final)

---

## El problema

PowerShell **no usa `\` como carácter de escape** — usa el backtick `` ` ``. Al pasar un string a un ejecutable nativo como `curl.exe`, PowerShell aplica sus propias reglas de parsing antes de invocar el proceso, lo que puede:

- Eliminar comillas dobles internas.
- Partir un argumento en varios.
- Producir errores como `curl: (3) unmatched close brace/bracket`.

Ejemplo del fallo clásico:

```powershell
curl.exe -X POST https://httpbin.org/post -H "Content-Type: application/json" -d "{\"a\":1}"
