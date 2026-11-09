// Se ejecuta antes de cada archivo de pruebas.
// jsdom no trae requestAnimationFrame en todas las versiones: lo emulamos con setTimeout.
if (!globalThis.requestAnimationFrame) {
  globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
}
