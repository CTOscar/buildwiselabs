// @ts-check
// Labs: la documentacion tecnica de BuildWise Labs, hecha con Docusaurus.
//
// Se muestra dentro de la pagina Labs del sitio (buildwiselabs.net/labs), que la carga a
// pantalla completa. El build compilado vive en public/labs-docs de la app de Expo, asi
// que se ve igual con "expo start" y en produccion. Despues de editar un .md:
//   npm run labs:build      (desde la raiz del proyecto)
import { themes as prismThemes } from 'prism-react-renderer';

const SITIO = 'https://buildwiselabs.net';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'BuildWise Labs',
  tagline: 'Documentación técnica: herramientas, integraciones y productos',
  favicon: 'img/favicon.png',

  url: SITIO,
  baseUrl: '/labs-docs/',
  // Paginas como archivos .html (instalacion.html) y no carpetas: con "cleanUrls" de
  // Vercel se sirven sin la extension, y no chocan con el respaldo de la app de Expo.
  trailingSlash: false,

  onBrokenLinks: 'throw',
  markdown: { mermaid: true, hooks: { onBrokenMarkdownLinks: 'throw' } },
  themes: ['@docusaurus/theme-mermaid'],
  // Detecta si la documentacion esta dentro de la pagina Labs del sitio (en un iframe)
  // para ocultar su propia barra y su pie: el sitio ya pone los suyos.
  clientModules: ['./src/embebido.js'],

  i18n: { defaultLocale: 'es', locales: ['es'] },

  stylesheets: [
    'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=IBM+Plex+Sans:wght@300;400;600;700&display=swap',
  ],

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          routeBasePath: '/', // la documentacion es todo el sitio: sin portada aparte
          sidebarPath: './sidebars.js',
          showLastUpdateTime: false,
        },
        blog: false,
        theme: { customCss: './src/css/custom.css' },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      colorMode: { defaultMode: 'dark', respectPrefersColorScheme: true },
      navbar: {
        title: 'Labs',
        logo: { alt: 'BuildWise Labs', src: 'img/logo.png', href: SITIO, target: '_self' },
        items: [
          { type: 'docSidebar', sidebarId: 'docs', position: 'left', label: 'Documentación' },
          { href: SITIO, label: 'Inicio', position: 'right', target: '_self' },
          { href: `${SITIO}/servicios`, label: 'Servicios', position: 'right', target: '_self' },
          { href: `${SITIO}/contacto`, label: 'Contacto', position: 'right', target: '_self' },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Documentación',
            items: [
              { label: 'Labs', to: '/' },
              { label: 'APIs disponibles', to: '/tools/apis' },
              { label: 'Chatbot PYME', to: '/chatbot' },
            ],
          },
          {
            title: 'BuildWise Labs',
            items: [
              { label: 'Servicios', href: `${SITIO}/servicios` },
              { label: 'Nosotros', href: `${SITIO}/nosotros` },
              { label: 'Contacto', href: `${SITIO}/contacto` },
            ],
          },
        ],
        copyright: `© ${new Date().getFullYear()} BuildWise Labs · Hecho en México`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
        additionalLanguages: ['bash', 'json', 'yaml'],
      },
      mermaid: { theme: { light: 'neutral', dark: 'dark' } },
    }),
};

export default config;
