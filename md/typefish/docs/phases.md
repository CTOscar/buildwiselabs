# Fases del Proyecto — Typefish

> Documento de planificación del ciclo de vida del software (SDLC) aplicado
> específicamente a **Typefish**, un núcleo modular en C/C++ para análisis de
> tipos y herramientas de lenguaje.

**Versión:** 0.1.0
**Última actualización:** [fecha]
**Autor:** [tu nombre / organización]
**Estado:** en planificación

---

## 📖 Tabla de contenidos

- [Visión general](#-visión-general)
- [Fase 1 — Planificación](#-fase-1--planificación)
- [Fase 2 — Análisis](#-fase-2--análisis)
- [Fase 3 — Diseño](#-fase-3--diseño)
- [Fase 4 — Desarrollo](#-fase-4--desarrollo)
- [Fase 5 — Pruebas](#-fase-5--pruebas)
- [Fase 6 — Implementación / Despliegue](#-fase-6--implementación--despliegue)
- [Fase 7 — Mantenimiento](#-fase-7--mantenimiento)
- [Cronograma resumido](#-cronograma-resumido)
- [Criterios de éxito global](#-criterios-de-éxito-global)

---

## 🎯 Visión general

Typefish se desarrollará siguiendo un modelo **iterativo-incremental** con
entregables al final de cada fase. Aunque las fases se presentan secuencialmente,
habrá solapamiento entre **Pruebas** y **Desarrollo**, y las fases de
**Mantenimiento** y **Despliegue** se retroalimentarán.

| Fase | Duración estimada | Entregable principal |
|---|---|---|
| 1. Planificación | 1–2 semanas | Project charter + roadmap |
| 2. Análisis | 2–3 semanas | SRS (Software Requirements Specification) |
| 3. Diseño | 3–4 semanas | SAD (Software Architecture Document) |
| 4. Desarrollo | 8–12 semanas | Núcleo + primeros módulos funcionales |
| 5. Pruebas | 3–4 semanas (paralelas) | Suite de tests + reporte de calidad |
| 6. Implementación / Despliegue | 1–2 semanas | Release v1.0.0 publicado |
| 7. Mantenimiento | continuo | Releases 1.x, issues resueltos |

**Duración total estimada hasta v1.0:** ~4–6 meses.

---

## 📋 Fase 1 — Planificación

### Objetivo

Definir **qué** se va a construir, **para quién**, **con qué recursos** y
**si es viable** antes de escribir una sola línea de código.

### Actividades

1. **Definición de objetivos**
   - Redactar la visión en una frase: *"Typefish es un núcleo modular en
     C/C++ para construir herramientas de análisis de tipos extensibles."*
   - Identificar 3–5 objetivos medibles (SMART).
   - Ejemplo:
     - O1: Núcleo con API pública estable antes del mes 2.
     - O2: Lexer + parser funcionales antes del mes 3.
     - O3: Type checker básico antes del mes 5.
     - O4: Cobertura de tests ≥80 % en `src/core/`.

2. **Definición del alcance**
   - **Dentro del alcance (in scope):**
     - Núcleo de memoria (arenas + pools).
     - Sistema de errores unificado.
     - Logging configurable.
     - Registro de módulos.
     - Lexer, parser, type checker básicos.
     - API pública `extern "C"`.
   - **Fuera del alcance (out of scope) para v1.0:**
     - Bindings a Python/Rust/JS (post-v1.0).
     - Editor / IDE integrado.
     - Backend de código (codegen).
     - Soporte Windows ARM64 (post-v1.0).

3. **Recursos necesarios**
   - **Humanos:**
     - 1 arquitecto / tech lead (C/C++ senior).
     - 1–2 desarrolladores C/C++.
     - 1 QA / tester (parcial, desde fase 4).
   - **Técnicos:**
     - Repositorio Git (GitHub / GitLab).
     - CI (GitHub Actions / GitLab CI).
     - Compiladores: GCC 9+, Clang 12+, MSVC 2019+.
     - Herramientas: CMake, clang-format, clang-tidy, sanitizers.

4. **Análisis de viabilidad**
   - **Técnica:** ¿existen precedentes? Sí (LLVM, tree-sitter, Roslyn).
     El modelo híbrido C/C++ está probado industrialmente.
   - **Económica:** herramientas open-source (compiladores, CMake, CI free tier)
     → coste ≈ 0.
   - **Operativa:** el equipo domina C/C++; el modelo híbrido exige disciplina
     de ABI pero es conocido.
   - **Temporal:** 4–6 meses para v1.0 es razonable con 2–3 personas.
   - **Riesgos principales:**
     - Complejidad del type checker → mitigar con diseño incremental.
     - ABI de plugins → mitigar con `extern "C"` desde día 1.
     - Burnout del equipo → hitos cortos y releases incrementales.

### Entregables

- [ ] `docs/charter.md` — Project charter.
- [ ] `docs/scope.md` — Alcance detallado.
- [ ] `docs/feasibility.md` — Análisis de viabilidad.
- [ ] `README.md` con visión y roadmap iniciales.

### Criterios de salida

- [ ] Objetivos SMART aprobados.
- [ ] Alcance in/out aprobado.
- [ ] Viabilidad técnica, económica y temporal confirmada.
- [ ] Repositorio creado con licencia, README y estructura vacía.

---

## 🔍 Fase 2 — Análisis

### Objetivo

Investigar **requisitos detallados** y **necesidades reales de los usuarios**
para producir especificaciones claras, verificables y trazables.

### Actividades

1. **Investigación de usuarios**
   - Identificar stakeholders:
     - Desarrolladores de herramientas de lenguaje (compiladores, linters, IDEs).
     - Investigadores de PL (lenguajes de programación).
     - Equipos que construyen DSLs internos.
   - Métodos: entrevistas, análisis de proyectos similares (LLVM, tree-sitter,
     Roslyn, clang-tidy).
   - Recopilar *user stories* y *pain points*.

2. **Requisitos funcionales (RF)**
   - Ejemplos para Typefish:
     - RF-01: crear y destruir un contexto (`tf_ctx_create` / `tf_ctx_destroy`).
     - RF-02: asignar memoria desde un arena (`tf_arena_alloc`).
     - RF-03: reportar errores con código + contexto (`tf_status_t` + `tf_last_error`).
     - RF-04: registrar módulos por nombre y versión.
     - RF-05: tokenizar un fichero fuente (lexer).
     - RF-06: construir un AST (parser).
     - RF-07: inferir tipos básicos (type checker).

3. **Requisitos no funcionales (RNF)**
   - RNF-01 (portabilidad): Linux, macOS, Windows x64.
   - RNF-02 (rendimiento): tokenizar 1 MB en <100 ms en hardware 2020+.
   - RNF-03 (memoria): fugas = 0 bajo ASan/UBSan.
   - RNF-04 (ABI): API pública estable en toda la serie 1.x.
   - RNF-05 (compatibilidad): compiladores C11 / C++17.
   - RNF-06 (calidad): cobertura ≥80 % en `src/core/`.
   - RNF-07 (documentación): Doxygen sin warnings.

4. **Casos de uso**
   - CU-01: Un desarrollador integra Typefish en su linter.
   - CU-02: Un usuario escribe un plugin cargable que agrega chequeos.
   - CU-03: Un usuario embebe el núcleo en un sistema con memoria limitada.

5. **Especificación (SRS)**
   - Trazar cada RF/RNF a su caso de uso y a su test futuro.
   - Formato: `docs/srs.md` con plantilla IEEE 830 simplificada.

### Entregables

- [ ] `docs/srs.md` — Software Requirements Specification.
- [ ] `docs/user-stories.md` — Historias de usuario.
- [ ] `docs/use-cases.md` — Casos de uso detallados.
- [ ] Matriz de trazabilidad RF → CU → Test.

### Criterios de salida

- [ ] SRS revisado y aprobado.
- [ ] Todos los RF tienen prioridad (MoSCoW: Must/Should/Could/Won't).
- [ ] RNF medibles y con criterio de aceptación.
- [ ] Matriz de trazabilidad completa.

---

## 🏗️ Fase 3 — Diseño

### Objetivo

Convertir los requisitos en una **arquitectura del sistema**, **interfaces** y
**especificaciones técnicas** listas para implementar.

### Actividades

1. **Arquitectura de alto nivel**
   - Documento `docs/sad.md` (Software Architecture Document).
   - Diagrama de capas (ver README, sección Arquitectura).
   - Decisiones arquitectónicas registradas (ADR):
     - ADR-001: modelo híbrido C/C++ (API `extern "C"`).
     - ADR-002: arena allocator sobre `tf_ctx_t`.
     - ADR-003: errores por código de retorno, no excepciones.
     - ADR-004: registro de módulos con nombre + versión.
     - ADR-005: sin estado global (contextos independientes).

2. **Diseño de interfaces públicas**
   - Headers en `include/typefish/`:
     - `typefish.h` — API principal.
     - `status.h` — códigos de error.
     - `memory.h` — arena/pool.
     - `module.h` — registro de módulos.
     - `lexer.h`, `parser.h`, `typecheck.h` (futuros).
   - Regla de oro: **structs opacos** (`typedef struct TfCtx TfCtx;`).
   - Versionado semántico explícito en macros (`TF_API_VERSION`).

3. **Diseño de interfaces internas**
   - Contratos entre núcleo y módulos (vtable-like dispatch).
   - Ownership claro de cada recurso (quién crea, quién destruye).

4. **Especificaciones técnicas por módulo**
   - Para cada módulo: pre/post-condiciones, invariantes, complejidad esperada.
   - Ejemplo para `core/memory`:
     - Pre: `ctx != NULL`.
     - Post: puntero alineado a 16 bytes o NULL si OOM.
     - Invariante: `used <= capacity` siempre.

5. **Diseño de la CLI (opcional v1.0)**
   - `typefish run <archivo>`
   - `typefish check <archivo>`
   - `typefish --version`, `--help`

6. **Definición de estilo y convenciones**
   - `docs/coding-style.md`:
     - prefijo `tf_` / `TF_`, `snake_case`, headers propios.
   - `.clang-format` versionado en repo.
   - `.clang-tidy` con reglas mínimas.

### Entregables

- [ ] `docs/sad.md` — Software Architecture Document.
- [ ] `docs/adr/` — Architecture Decision Records.
- [ ] `include/typefish/*.h` — Headers públicos (aunque sin implementación).
- [ ] `docs/coding-style.md`.
- [ ] `.clang-format`, `.clang-tidy`.

### Criterios de salida

- [ ] Headers públicos revisados por al menos 2 personas.
- [ ] ADRs aceptados y versionados.
- [ ] Especificaciones por módulo escritas.
- [ ] Compila `#include <typefish/typefish.h>` en un `main.c` vacío (headers sanos).

---

## 💻 Fase 4 — Desarrollo

### Objetivo

Escribir el **código real** que cumple las especificaciones de diseño.

### Actividades

1. **Configuración del proyecto**
   - `CMakeLists.txt` raíz + subdirectorios.
   - Targets: `typefish_core`, `typefish_cli`, `typefish_tests`.
   - Flags estrictos: `-Wall -Wextra -Werror -pedantic`.
   - Sanitizers en build de debug.
   - CI que compila en Linux + macOS + Windows.

2. **Orden de implementación (bottom-up)**
   - **Hito 1 — Núcleo mínimo:**
     - `core/memory` (arena + pool).
     - `core/errors` (`tf_status_t`, `tf_last_error`).
     - `core/logging`.
   - **Hito 2 — Registro de módulos:**
     - `core/module` con `tf_module_register` / `tf_module_find`.
   - **Hito 3 — Lexer:**
     - Tokenizador con tests de spans y errores léxicos.
   - **Hito 4 — Parser:**
     - AST + parser recursivo descendente.
   - **Hito 5 — Type checker básico:**
     - `TypeTable`, `Scope`, inferencia mínima.

3. **Buenas prácticas por commit**
   - Commits atómicos con mensaje convencional (`feat:`, `fix:`, `docs:`…).
   - Un test por cada feature nueva (TDD opcional pero recomendado).
   - Ejecutar `ctest` + sanitizers antes de cada push.
   - Pasar `clang-format` y `clang-tidy`.

4. **Documentación en paralelo**
   - Doxygen en cada header público.
   - `examples/` con casos de uso reales por hito.
   - Actualizar `README.md` según avanza cada hito.

### Entregables

- [ ] Código fuente de `core/memory`, `core/errors`, `core/logging`.
- [ ] `core/module` funcional.
- [ ] `lexer` funcional con tests.
- [ ] `parser` funcional con AST.
- [ ] `typecheck` básico.
- [ ] `examples/` por hito.
- [ ] CI verde en 3 plataformas.

### Criterios de salida

- [ ] Todos los targets compilan con `-Werror` en GCC, Clang y MSVC.
- [ ] Sanitizers sin warnings en tests.
- [ ] Hito 3 (lexer) cerrado y usable.
- [ ] Al menos un ejemplo funcional end-to-end.

---

## 🧪 Fase 5 — Pruebas

### Objetivo

**Verificar** que el software funciona correctamente, eliminar errores y
asegurar la calidad antes del despliegue.

> Nota: aunque esta fase aparece después de Desarrollo, en la práctica las
> pruebas **acompañan** cada commit desde el día 1.

### Actividades

1. **Pirámide de pruebas**
   - **Unitarias** (base, ~70 %): cada módulo aislado.
   - **Integración** (~20 %): interacción entre módulos.
   - **End-to-end** (~10 %): CLI + ejemplos reales.

2. **Herramientas**
   - Framework: Unity (C) / Catch2 o doctest (C++).
   - Sanitizers: ASan, UBSan, TSan.
   - Cobertura: `gcov` / `llvm-cov` (objetivo ≥80 % en `src/core/`).
   - Fuzzing (opcional v1.0): libFuzzer sobre el lexer.

3. **Tipos de pruebas**
   - Funcionales (RF cubiertos).
   - No funcionales (RNF: rendimiento, memoria, portabilidad).
   - Regresión (cada bug corregido genera un test).
   - Compatibilidad (matriz de compiladores × SOs).

4. **Gestión de bugs**
   - Todo bug → issue con: pasos para reproducir, comportamiento esperado,
     comportamiento actual, entorno.
   - Etiquetas: `severity:critical|high|medium|low`, `type:bug|regression`.

5. **Criterios de aceptación**
   - 0 bugs críticos abiertos.
   - 0 warnings de sanitizers en suite completa.
   - Cobertura ≥80 % en `src/core/`, ≥60 % en módulos.

### Entregables

- [ ] Suite de tests en `tests/`.
- [ ] Reporte de cobertura (`coverage.html`).
- [ ] Reporte de calidad (`docs/qa-report.md`).
- [ ] Backlog de bugs priorizado.

### Criterios de salida

- [ ] Cobertura objetivo alcanzada.
- [ ] 0 sanitizer warnings.
- [ ] Matriz de pruebas (compilador × SO) verde.
- [ ] QA report aprobado.

---

## 🚀 Fase 6 — Implementación / Despliegue

### Objetivo

**Lanzar** el software en el entorno de producción para uso de los usuarios
finales.

### Actividades

1. **Preparación del release**
   - Congelar features (feature freeze).
   - Actualizar `CHANGELOG.md` (formato Keep a Changelog).
   - Actualizar `README.md`, `docs/`.
   - Bump de versión (`TF_API_VERSION`, `CMakeLists.txt`, tags git).

2. **Empaquetado**
   - Binarios estáticos precompilados por plataforma:
     - `typefish-linux-x64`, `typefish-macos-arm64`, `typefish-windows-x64`.
   - Paquetes:
     - Tarball `.tar.gz` / `.zip` con headers + `.a`/`.lib` + CLI.
     - (Futuro) paquetes de sistema: `.deb`, `.rpm`, Homebrew, vcpkg, Conan.

3. **Publicación**
   - Tag anotado: `git tag -a v1.0.0 -m "Typefish v1.0.0"`.
   - GitHub Release con notas + checksums SHA-256.
   - Publicar documentación (GitHub Pages / Read the Docs).

4. **Comunicación**
   - Anuncio en README, blog/notas del repo, foros pertinentes.
   - Guía de migración si aplica (breaking changes desde betas).

5. **Rollback plan**
   - Tags anteriores siempre disponibles.
   - Documentar cómo revertir a la versión estable previa.

### Entregables

- [ ] `CHANGELOG.md` actualizado.
- [ ] Binarios por plataforma.
- [ ] GitHub Release publicado con checksums.
- [ ] Documentación online.
- [ ] Guía de inicio rápido (`docs/quickstart.md`).

### Criterios de salida

- [ ] Tag `v1.0.0` publicado.
- [ ] Release descargable en las 3 plataformas.
- [ ] Documentación accesible online.
- [ ] Al menos un usuario externo (o tú mismo en un proyecto real) lo integra
      sin fricción.

---

## 🔧 Fase 7 — Mantenimiento

### Objetivo

**Actualizar, corregir y mejorar** el producto de forma continua tras la
entrega.

### Actividades

1. **Gestión de issues**
   - Triage semanal de bugs y feature requests.
   - Priorización por impacto × esfuerzo.
   - Etiquetado consistente (`good first issue`, `help wanted`…).

2. **Ciclo de releases**
   - **Patch (1.0.x):** bug fixes, sin breaking changes.
   - **Minor (1.x.0):** nuevas features compatibles.
   - **Major (x.0.0):** cambios de ABI/API, con guía de migración.
   - Cadencia orientativa: patch mensual, minor trimestral, major anual.

3. **Seguridad**
   - Proceso de reporte de vulnerabilidades (`SECURITY.md`).
   - Revisión de dependencias (aunque sean mínimas).
   - Fuzzing continuo en CI (opcional).

4. **Comunidad**
   - `CONTRIBUTING.md` actualizado.
   - Responder PRs/issues en <7 días.
   - Reconocer contribuciones (`CHANGELOG` + `AUTHORS`).

5. **Evolución técnica**
   - Revisar ADRs periódicamente.
   - Reevaluar decisiones (¿sigue siendo válido el modelo híbrido?).
   - Actualizar a nuevos estándares (C23, C++23) cuando aporten valor real.

6. **Deprecaciones**
   - Marcar APIs obsoletas con `TF_DEPRECATED`.
   - Avisar con ≥1 minor de antelación antes de eliminar.

### Entregables

- [ ] `SECURITY.md`.
- [ ] `CHANGELOG.md` continuamente actualizado.
- [ ] Releases periódicos (patch/minor/major).
- [ ] Backlog de mejoras priorizado.

### Criterios de salida (permanentes)

- [ ] Issues respondidos en <7 días.
- [ ] 0 vulnerabilidades conocidas sin parche.
- [ ] Cadencia de releases respetada.
- [ ] Documentación sincronizada con el código.

---

## 🗓️ Cronograma resumido

| Semana | Fase | Hito |
|---|---|---|
| 1–2 | 1. Planificación | Charter + alcance + viabilidad |
| 3–5 | 2. Análisis | SRS + casos de uso |
| 6–9 | 3. Diseño | SAD + headers públicos + ADRs |
| 10–12 | 4. Desarrollo | Hito 1: núcleo mínimo (memory, errors, logging) |
| 13–15 | 4. Desarrollo | Hito 2–3: módulos + lexer |
| 16–18 | 4. Desarrollo | Hito 4: parser + AST |
| 19–21 | 4. Desarrollo | Hito 5: type checker básico |
| 22–23 | 5. Pruebas | Suite completa + cobertura |
| 24 | 6. Despliegue | Release v1.0.0 |
| 25+ | 7. Mantenimiento | Ciclos 1.x |

> Las semanas son orientativas para un equipo de 2–3 personas.

---

## ✅ Criterios de éxito global

Al finalizar la fase 6 (v1.0.0), Typefish debería cumplir:

- [ ] **Funcional:** un usuario puede tokenizar, parsear y type-checkear un
      fichero simple end-to-end.
- [ ] **Calidad:** 0 bugs críticos abiertos, cobertura ≥80 % en núcleo.
- [ ] **Portabilidad:** CI verde en Linux, macOS y Windows.
- [ ] **ABI:** API pública `extern "C"` estable y documentada.
- [ ] **Documentación:** README + SRS + SAD + Doxygen accesibles.
- [ ] **Extensibilidad:** al menos un módulo de ejemplo cargable como plugin.
- [ ] **Adopción:** un proyecto externo (o propio) lo integra sin fricción.

---

## 📚 Referencias

- IEEE 830 — Recommended Practice for Software Requirements Specifications.
- ISO/IEC/IEEE 12207 — Systems and software engineering — Software life cycle processes.
- Keep a Changelog — https://keepachangelog.com/
- Semantic Versioning — https://semver.org/
- Architecture Decision Records — https://adr.github.io/