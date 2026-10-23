// Enlaces del menú "Enlaces" en la barra de chips. Agrupados; cada grupo se expande.
// Edita aquí para agregar o quitar enlaces (los mismos de Enlaces_utiles.md).
export const LINK_GROUPS = [
  {
    title: 'Rastreadores',
    icon: 'chip',
    links: [
      { label: 'Teltonika FMC130', note: 'Nivel A · tractores sin electrónica', href: 'https://www.teltonika-gps.com/products/trackers/advanced/fmc130' },
      { label: 'Teltonika FMC150', note: 'Nivel B · lectura CAN', href: 'https://www.teltonika-gps.com/products/trackers/can-data/fmc150' },
    ],
  },
  {
    title: 'Sensores',
    icon: 'fuel',
    links: [
      { label: 'Escort TD-BLE 1000', note: 'Sonda de combustible BLE · CJP México', href: 'https://tienda.cjp.mx/compra/escort-tdble1000-sensor-de-combustible-conectividad-ble-4-0-sin-cables-176985' },
    ],
  },
  {
    title: 'Instalación',
    icon: 'lock',
    links: [
      { label: 'Caja IP67 con prensaestopas', note: 'Zulkit · Amazon MX', href: 'https://www.amazon.com.mx/Zulkit-conexiones-impermeable-transparente-prensaestopas/dp/B09FL2VKJY' },
      { label: 'Sello de acero con folio', note: '$584 por 50 piezas · Amazon MX', href: 'https://www.amazon.com.mx/contenedores-antimanipulaci%C3%B3n-seguridad-autobloqueantes-certificadas/dp/B0CHYK7ZP7' },
    ],
  },
  {
    title: 'Plataforma',
    icon: 'layers',
    links: [
      { label: 'Traccar', note: 'Servidor de rastreo y documentación', href: 'https://www.traccar.org/' },
      { label: 'BuildWise Labs', note: 'Sitio y servicios', href: 'https://buildwiselabs.net' },
    ],
  },
  {
    title: 'Otros',
    icon: 'external',
    links: [{ label: 'Producto AliExpress', note: 'Por identificar', href: 'https://es.aliexpress.com/item/1005010414603740.html' }],
  },
];
