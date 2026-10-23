# Labs · documentación de BuildWise Labs

Sitio de documentación hecho con [Docusaurus](https://docusaurus.io). Se publica en
la página Labs del sitio (`buildwiselabs.net/labs`), que la carga a pantalla completa.

## Editar

- Las páginas son archivos Markdown en `docs/` (`docs/tools/`, `docs/chatbot/`...).
- El menú lateral está en `sidebars.js`: para que una página nueva aparezca, agrégala ahí.
- Colores y tipografía: `src/css/custom.css`. Barra y pie: `docusaurus.config.js`.

## Ver en local

```bash
cd labs-docs
npm install
npm start          # http://localhost:3000/labs-docs/  (se recarga al guardar)
```

Desde la raíz del proyecto también funciona `npm run labs`.

## Publicar

Después de editar, corre `npm run labs:build` desde la raíz: compila esta carpeta y deja el
resultado en `public/labs-docs`, que es lo que muestra la app (en local y publicado). Sube esa carpeta junto con tus cambios.

> `package.json` fija `webpack` a 5.99.9 con `overrides`: las versiones nuevas de webpack
> rompen la barra de progreso que usa Docusaurus 3.9 al compilar.
