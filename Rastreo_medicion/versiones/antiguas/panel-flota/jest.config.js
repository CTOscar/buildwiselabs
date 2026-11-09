// Configuración de Jest para pruebas del frontend.
// El proyecto usa módulos ES nativos: Jest corre con --experimental-vm-modules
// (ver scripts "test" en package.json) y sin transformaciones (no requiere Babel).
export default {
  testEnvironment: 'jsdom',
  transform: {},
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.js'],
  setupFiles: ['<rootDir>/tests/setup.js'],
  moduleNameMapper: {
    // Los estilos no se prueban: se sustituyen por un módulo vacío.
    '\\.(css)$': '<rootDir>/tests/__mocks__/style.js',
  },
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/main.js',
    '!src/three/**', // WebGL: se revisa en el navegador
    '!src/features/simulator/diagram.js',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text-summary', 'html'],
  clearMocks: true,
};
