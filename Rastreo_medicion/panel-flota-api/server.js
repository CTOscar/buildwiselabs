// Punto de entrada para Hostinger / Passenger. Es CommonJS a propósito: carga el resto (módulos ES) con import().
import('./src/start.mjs').catch((e) => {
  console.error('La API no pudo iniciar:', e);
  process.exit(1);
});
