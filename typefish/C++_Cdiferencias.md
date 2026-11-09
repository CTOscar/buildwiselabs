
### Principios

1. El núcleo **no conoce** los módulos de alto nivel.
2. Los módulos dependen del núcleo, **nunca al revés**.
3. La API pública expone **structs opacos**.
4. Todo error es un `tf_status_t` explícito.

---

### ⚖️ C puro vs C++ moderno

La elección del lenguaje del núcleo condiciona **toda** la arquitectura. Estas
son las diferencias que realmente impactan en Typefish, organizadas por tema.

#### Tabla comparativa

| Criterio | C puro (C17) | C++ moderno (C++17/20) | Impacto en Typefish |
|---|---|---|---|
| Paradigma | Procedural | Multi-paradigma (OOP, genérico, funcional) | C++ más expresivo para el AST |
| Gestión de memoria | Manual (`malloc`/`free`) | RAII (`unique_ptr`, `shared_ptr`) | C++ reduce fugas |
| Manejo de errores | Códigos de retorno + `errno` | Excepciones, `std::expected`, o códigos | Preferimos códigos explícitos |
| Genericidad | Macros + `void*` | Templates + `concepts` | C++ ahorra miles de líneas |
| Encapsulación | Por convención | Real (`private`) | Empate (structs opacos en C) |
| Contenedores | ❌ reinventar | `std::vector`, `std::unordered_map` | C++ gana en productividad |
| ABI estable | ✅ | ❌ (name mangling) | **C gana** para plugins |
| Tamaño de binario | Menor | Mayor | C gana en footprint |
| Tiempo de compilación | Rápido | Lento con templates | C gana en iteración |
| Polimorfismo | Functores manuales | `virtual`, `std::variant` | C++ más limpio para visitors |
| Interop con otros lenguajes | ✅ vía FFI | Vía `extern "C"` | Ambos sirven con cuidado |
| Sanitizers | ASan/UBSan | ASan/UBSan | Empate |
| Debugging | Predecible | Igual (cuidado con templates en gdb) | Empate |
| Velocidad de ejecución | Muy alta | Misma (mismo backend) | Empate |

#### 1. Modelo mental

| Aspecto | C | C++ moderno |
|---|---|---|
| Paradigma | Procedural | Multi-paradigma (OOP, genérico, funcional) |
| Abstracción | Structs + funciones libres | Clases, templates, `std::variant` |
| Encapsulación | Por convención | Real (`private`) |
| Dueño del recurso | Gestionado a mano | RAII |

#### 2. Gestión de memoria

**C** — fácil olvidar un `free`:

```c
TypeNode* node = malloc(sizeof(TypeNode));
if (!node) return ERR_OOM;
// ... si hay error a mitad de camino:
free(node);   // ¡fácil de olvidar → fuga!
return ERR_FAIL;

