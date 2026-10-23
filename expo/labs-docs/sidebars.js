// @ts-check
// Menu lateral de Labs. Sigue los mismos grupos que tenia el menu de documentacion de
// los servicios: Documentacion, Iniciar proyecto, Tools, Soporte, Comunidad,
// Orientaciones, Educacion y Compatibilidad.
//
// Cada entrada es un archivo de docs/ (sin la extension). Para agregar una pagina: crea
// el .md en la carpeta que toque y sumalo aqui. Despues: npm run labs:build
const doc = (id, label) => ({ type: 'doc', id, label });

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  docs: [
    'intro',
    { type: 'link', label: 'trykiriinbox.com', href: 'https://trykiriinbox.com' },
    {
      type: 'category',
      label: 'Documentación',
      collapsed: false,
      items: [doc('chatbot/intro', 'Descripción general'), 'documentacion/arquitectura', 'documentacion/glosario'],
    },
    {
      type: 'category',
      label: 'Iniciar proyecto',
      items: [
        'iniciar/requisitos',
        doc('chatbot/instalacion', 'Instalación paso a paso'),
        'iniciar/levantar-bot',
        doc('chatbot/configuracion', 'Configuración inicial'),
        'iniciar/primer-mensaje',
      ],
    },
    {
      type: 'category',
      label: 'Tools',
      items: ['tools/apis', 'tools/n8n', 'tools/voz', 'tools/excel', 'tools/webhooks'],
    },
    {
      type: 'category',
      label: 'Soporte',
      items: [
        'soporte/preguntas-frecuentes',
        doc('chatbot/operacion/solucion-de-problemas', 'Solución de problemas'),
        'soporte/reportar-problema',
        'soporte/tiempo-respuesta',
        'soporte/contacto',
      ],
    },
    {
      type: 'category',
      label: 'Comunidad',
      items: ['comunidad/foro', 'comunidad/discord', 'comunidad/casos-de-uso', 'comunidad/contribuir'],
    },
    {
      type: 'category',
      label: 'Orientaciones',
      items: ['orientaciones/buenas-practicas', 'orientaciones/seguridad', 'orientaciones/limitaciones', 'orientaciones/hoja-de-ruta'],
    },
    {
      type: 'category',
      label: 'Educación',
      items: ['educacion/tutoriales', 'educacion/guia-de-prompts', 'educacion/ejemplos', 'educacion/certificacion'],
    },
    {
      type: 'category',
      label: 'Compatibilidad',
      items: [
        'compatibilidad/sistemas-operativos',
        'compatibilidad/kernels',
        'compatibilidad/procesadores',
        'compatibilidad/gpu',
        'compatibilidad/ram',
        'compatibilidad/red',
      ],
    },
    {
      type: 'category',
      label: 'Uso y operación',
      items: [
        'chatbot/uso/chat',
        'chatbot/uso/reportes-de-campo',
        'chatbot/uso/analisis-excel',
        'chatbot/uso/openwebui',
        doc('chatbot/referencia/api', 'Referencia de la API'),
        doc('chatbot/operacion/despliegue', 'Despliegue'),
      ],
    },
  ],
};

export default sidebars;
