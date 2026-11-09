// Arquitectura de navegación: 5 módulos, cada uno con sus vistas (pestañas).
// Para agregar una vista: registrarla en VIEWS y crear su <section data-section="…"> en shell.js.

export const MODULES = [
  { id: 'inicio', label: 'Inicio', icon: 'home', home: 'fleet' },
  { id: 'plan', label: 'Plan', icon: 'calendar', home: 'lotes' },
  { id: 'analizar', label: 'Analizar', icon: 'chart', home: 'reports' },
  { id: 'mantenimiento', label: 'Mantenimiento', icon: 'wrench', home: 'soon' },
  { id: 'configuracion', label: 'Configuración', icon: 'gear', home: 'sim' },
];

// tab: aparece como pestaña del módulo. parent: pestaña que se marca cuando la vista es una subpantalla.
export const VIEWS = [
  { view: 'fleet', module: 'inicio', label: 'Resumen', tab: true },
  { view: 'alerts', module: 'inicio', label: 'Alertas', tab: true },
  { view: 'lotes', module: 'plan', label: 'Rutas y geocercas', tab: true },
  { view: 'lote', module: 'plan', parent: 'lotes' },
  { view: 'reports', module: 'analizar', label: 'Reportes', tab: true },
  { view: 'stats', module: 'analizar', label: 'Combustible y velocidad', tab: true },
  { view: 'soon', module: 'mantenimiento', label: 'Resumen', tab: true },
  { view: 'tractor', module: 'configuracion' },
  { view: 'sim', module: 'configuracion', label: 'Simulador', tab: true },
  { view: '3d', module: 'configuracion', label: 'Vista 3D', tab: true },
  { view: 'profile', module: 'configuracion', label: 'Mi perfil', tab: true },
];

// 'device' es una capa (panel de unidad) sobre la pantalla desde la que se abrió.
export const pageOf = (view, backView = 'fleet') => (view === 'device' ? backView : view);

export const viewInfo = (view) => VIEWS.find((v) => v.view === view) || null;

export function moduleOf(view, backView = 'fleet') {
  const info = viewInfo(pageOf(view, backView));
  return MODULES.find((m) => m.id === info?.module) || MODULES[0];
}

export const tabsOf = (moduleId) => VIEWS.filter((v) => v.module === moduleId && v.tab);

export function activeTab(view, backView = 'fleet') {
  const v = pageOf(view, backView);
  return viewInfo(v)?.parent || v;
}
