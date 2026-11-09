/** @type {import('tailwindcss').Config} */
// Colores como variables CSS (RGB) para tener tema claro y oscuro con las mismas clases.
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.js'],
  theme: {
    extend: {
      colors: {
        ink: v('ink'), // fondo de la app / mapa
        panel: v('panel'), // superficies (paneles, tarjetas flotantes)
        raise: v('raise'), // hover y superficies secundarias
        line: v('line'),
        fg: v('fg'),
        muted: v('muted'),
        accent: v('accent'),
        'accent-ink': v('accent-ink'),
        ok: v('ok'),
        warn: v('warn'),
        crit: v('crit'),
        info: v('info'),
        'brand-magenta': v('brand-magenta'),
        'brand-blue': v('brand-blue'),
        navy: v('navy'),
      },
      fontFamily: {
        // UI: Manrope (texto y títulos) + JetBrains Mono (números, IMEI, horas).
        display: ['Manrope', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
        sans: ['Manrope', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'Consolas', 'monospace'],
        // Solo para el logotipo "BuildWise Labs" (tipografía de la marca).
        brand: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        float: '0 1px 2px rgb(0 0 0 / .12), 0 4px 14px rgb(0 0 0 / .14)',
        panel: '0 0 24px rgb(0 0 0 / .18)',
      },
      transitionTimingFunction: {
        sheet: 'cubic-bezier(.2,.8,.2,1)',
      },
    },
  },
  plugins: [],
};
