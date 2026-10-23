// Pantalla de carga con el logo -- la misma que se ve al abrir el login.
//
// Las paginas de adentro (bot, actividad, bitacora, monitoreo, usuarios) ya NO la traen en
// su HTML, a proposito: navegar entre ellas tiene que ser inmediato. Pero los dos saltos
// que si tardan de verdad -- entrar despues de iniciar sesion y salir al cerrarla -- se
// cubren inyectandola desde aqui, para que la espera tenga la marca en vez de una pantalla
// en blanco.
//
// No hace falta quitarla despues: en los dos casos lo que sigue es navegar a otra pagina y
// el navegador la descarta sola.
export function mostrarSplash() {
  // En el login el splash ya existe en el HTML. Si todavia esta (quizas a medio
  // desvanecer), se reusa subiendole la opacidad en vez de encimar otro.
  const existente = document.getElementById('splashCarga');
  if (existente) {
    existente.style.opacity = '1';
    return;
  }
  const splash = document.createElement('div');
  splash.id = 'splashCarga';
  splash.className = 'fixed inset-0 z-50 bg-stone-50 flex flex-col items-center justify-center gap-5';
  splash.innerHTML =
    '<img src="/img/mango-logo.png" alt="La Pedregoza" class="w-40 max-w-[55%] logo-pulse">' +
    '<div class="w-40 h-2 rounded-full skeleton-bar"></div>';
  document.body.appendChild(splash);
}
