---
title: Contribuir al proyecto
description: Cómo proponer cambios al código o a esta documentación.
---

# Contribuir al proyecto

## A la documentación

Esta documentación está hecha con [Docusaurus](https://docusaurus.io). Cada página es un archivo Markdown en `labs-docs/docs/`.

1. Edita o crea el `.md` en la carpeta del tema.
2. Si es una página nueva, agrégala al menú en `labs-docs/sidebars.js`.
3. Revisa cómo se ve: `npm run labs` desde la raíz del sitio abre una vista previa que se recarga al guardar.
4. Compila: `npm run labs:build`. Deja el resultado en `public/labs-docs`, que es lo que muestra el sitio.
5. Sube los cambios, incluida la carpeta `public/labs-docs`.

## Al código

1. Crea una rama a partir de la principal: `git checkout -b mejora/registro-insumos`.
2. Haz tus cambios y pruébalos en local con `docker compose up -d --build`.
3. Abre un *pull request* que explique qué cambia y por qué.

### Reglas

- **Sin llaves en el código.** Todo lo secreto va en `.env`.
- **Un cambio por pull request.** Es más fácil de revisar y de deshacer si algo falla.
- **Si cambias la API o las palabras clave, actualiza esta documentación** en el mismo pull request.
