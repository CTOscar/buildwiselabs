// Configuracion de PM2 para el bot de La Pedregoza.
//
// PM2 es un administrador de procesos para Node. Resuelve tres cosas que hoy no estan
// cubiertas:
//   1) Si el proceso se cae, lo vuelve a levantar solo. Hoy el bot se queda muerto hasta
//      que alguien lo nota.
//   2) Guarda la salida en archivos (logs/) en vez de perderse al cerrar la terminal.
//      Esto es lo que nos falto toda la tarde del 7 de octubre: para ver por que fallaba
//      produccion habia que lanzarle peticiones con curl y leer la respuesta.
//   3) `pm2 monit` muestra CPU, memoria y reinicios en vivo.
//
// DONDE SIRVE Y DONDE NO
//   - En tu maquina y en un VPS: funciona completo.
//   - En el hosting compartido de Hostinger NO lo uses: ahi la plataforma ya administra
//     el proceso por su cuenta (por eso el ciclo de "importar el zip" lo reinicia). Meter
//     PM2 encima pelearia con ella. Si algun dia te mudas a un VPS, este archivo ya esta
//     listo.
//
// USO EN LOCAL
//   npm install -g pm2
//   npm run build            <- PM2 arranca src/server.js directo, sin pasar por prestart
//   pm2 start ecosystem.config.js
//   pm2 logs la-pedregoza    <- la salida en vivo
//   pm2 monit                <- CPU, memoria, reinicios
//   pm2 restart la-pedregoza
//   pm2 stop la-pedregoza
//
// Para que vuelva solo al reiniciar la computadora: `pm2 save` y luego `pm2 startup`.
module.exports = {
  apps: [
    {
      name: 'la-pedregoza',
      script: 'src/server.js',
      cwd: __dirname,

      // Una sola instancia a proposito. El bot guarda estado en memoria -- contadores de
      // monitoreo, trafico, errores recientes, y las conexiones de Socket.io -- asi que
      // con varias instancias cada una veria solo su pedazo y la pantalla de monitoreo
      // mentiria. Para escalar de verdad habria que mover ese estado a la base primero.
      instances: 1,
      exec_mode: 'fork',

      // Reinicio automatico, pero con freno: si el proceso truena al arrancar, sin este
      // limite PM2 lo reintentaria en bucle para siempre y llenaria el disco de logs.
      autorestart: true,
      max_restarts: 10,
      min_uptime: '20s',
      restart_delay: 4000,

      // Si la memoria se dispara (una fuga, un archivo enorme en memoria), se reinicia
      // antes de que el sistema lo mate de golpe.
      max_memory_restart: '400M',

      // Nada de "watch": en produccion reiniciar por cada cambio de archivo es justo lo
      // que no se quiere. Para desarrollo ya existe `npm run dev`.
      watch: false,

      error_file: 'logs/error.log',
      out_file: 'logs/salida.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',

      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
