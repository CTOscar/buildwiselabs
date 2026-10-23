// Cuando la documentacion se abre dentro de la pagina Labs del sitio (en un iframe),
// marca <html data-embebido> para que custom.css oculte la barra y el pie de Docusaurus:
// el sitio ya muestra los suyos. Abierta sola, se ve completa.
//
// Va como atributo data- y no como clase: Docusaurus reescribe la clase de <html> en cada
// pagina y la borraria.
if (typeof window !== 'undefined') {
  let embebido = false;
  try {
    embebido = window.self !== window.top;
  } catch {
    embebido = true; // si el navegador no deja comparar, es porque esta dentro de otro sitio
  }
  if (embebido) document.documentElement.setAttribute('data-embebido', '');
}
