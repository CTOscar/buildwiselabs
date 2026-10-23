// Galeria "En accion" de cada servicio, que el detalle muestra como carrusel.
// Cada entrada trae una foto propia ("foto") o una escena de marca de ServiceArt
// ("scene"), mas su descripcion.
// stack: logotipos de las tecnologias de cada escena (claves de techIcons.js).
export const SERVICE_GALLERY = {
  // Chatbot no lleva galeria: ya tiene portada propia y las tres escenas eran el
  // logotipo sobre el fondo espacial, repetido. Sin entradas, la seccion "En accion"
  // no se dibuja (el detalle la condiciona a que la lista traiga algo).
  chatbot: [],
  automatizacion: [
    { foto: require('../../assets/auto-accion-1.jpg'), caption: 'IA en el centro de tus procesos', stack: ['n8n', 'anthropic', 'nodedotjs'] },
    { foto: require('../../assets/auto-accion-2.jpg'), caption: 'Tus sistemas conectados entre sí', stack: ['nodedotjs', 'express', 'postgresql'] },
    { foto: require('../../assets/auto-accion-3.jpg'), caption: 'Avisos donde ya trabajas: correo, celular y chat', stack: ['whatsapp', 'n8n', 'nodedotjs'] },
  ],
  apps: [
    { foto: require('../../assets/apps-accion-2.jpg'), caption: 'Web y móvil con el mismo código', stack: ['react', 'expo', 'tailwindcss', 'nodedotjs'] },
    { foto: require('../../assets/apps-accion-1.jpg'), caption: 'En la nube, disponible siempre', stack: ['nodedotjs', 'docker', 'nginx'] },
    { foto: require('../../assets/apps-accion-3.jpg'), caption: 'Soporte y mejoras después de lanzar', stack: ['github', 'docker', 'grafana'] },
  ],
  // Redes lleva fotos propias en vez de escenas de marca: cuando la entrada trae "foto"
  // el detalle la muestra tal cual, y si no, dibuja la escena de ServiceArt.
  redes: [
    { foto: require('../../assets/redes-accion-1.jpg'), caption: 'Privacidad, seguridad e identidad', stack: ['cloudflare', 'nginx', 'wireguard', 'linux'] },
    { foto: require('../../assets/redes-accion-2.jpg'), caption: 'Sistemas protegidos y vigilados', stack: ['ubuntu', 'docker', 'grafana'] },
    { foto: require('../../assets/redes-accion-3.jpg'), caption: 'Protección de los datos de tu empresa', stack: ['cloudflare', 'wireguard', 'grafana'] },
  ],
  'visor-reportes': [
    { scene: 'visor-reportes', caption: 'Tablero semanal de campo', stack: ['python', 'excel', 'googlesheets'] },
    { scene: 'chatbot', caption: 'Consulta tus datos por chat', stack: ['whatsapp', 'anthropic', 'nodedotjs'] },
    { scene: 'apps', caption: 'Disponible en web y en Windows', stack: ['react', 'python', 'nginx'] },
  ],
  monitoreo: [
    { scene: 'redes', caption: 'Estado del servicio, minuto a minuto', stack: ['grafana', 'nginx', 'docker', 'linux'] },
    { scene: 'automatizacion', caption: 'Alertas automáticas cuando algo falla', stack: ['n8n', 'whatsapp', 'nodedotjs'] },
    { scene: 'visor-reportes', caption: 'Flujo de uso y reporte mensual', stack: ['grafana', 'postgresql', 'googlesheets'] },
  ],
  'bank-central': [
    { scene: 'visor-reportes', caption: 'Tipo de cambio e indicadores al día', stack: ['nodedotjs', 'postgresql', 'googlesheets'] },
    { scene: 'automatizacion', caption: 'Los datos entran solos a tu sistema', stack: ['n8n', 'nodedotjs', 'express'] },
    { scene: 'chatbot', caption: 'Consulta por chat o por tu propio endpoint', stack: ['whatsapp', 'nodedotjs', 'nginx'] },
  ],
  'cripto-world': [
    { scene: 'visor-reportes', caption: 'Precios en vivo y conversión a pesos', stack: ['nodedotjs', 'postgresql', 'grafana'] },
    { scene: 'redes', caption: 'Llaves y accesos resguardados aparte', stack: ['linux', 'docker', 'cloudflare'] },
    { scene: 'automatizacion', caption: 'Alertas de precio y de movimientos', stack: ['n8n', 'whatsapp', 'nodedotjs'] },
  ],
  consultoria: [
    { foto: require('../../assets/consultoria-accion-1.jpg'), caption: 'De la hoja de cálculo a un proceso que corre solo', stack: ['excel', 'googlesheets', 'nodedotjs'] },
    { foto: require('../../assets/consultoria-accion-2.jpg'), caption: 'La herramienta correcta para cada etapa', stack: ['github', 'docker', 'cloudflare'] },
    { foto: require('../../assets/consultoria-accion-3.jpg'), caption: 'Tu equipo capacitado para operar lo nuevo', stack: ['googlesheets', 'n8n', 'github'] },
  ],
};
