// Parcha el build compilado (copia local) — idempotente: parte siempre del zip extraído.
const fs = require('fs'), path = require('path');
const [src, dst, dir] = process.argv.slice(2);
fs.rmSync(dst, { recursive: true, force: true });
fs.cpSync(src, dst, { recursive: true });
const js = path.join(dst, 'assets/index-Bka7l8xf.js');
const css = path.join(dst, 'assets/index-onqEVLWB.css');
let t = fs.readFileSync(js, 'utf8');
const rd = (f) => fs.readFileSync(path.join(dir, f), 'utf8');
function rep(a, b, label) {
  const n = t.split(a).length - 1;
  if (n !== 1) throw new Error(`${label}: ${n} coincidencias`);
  t = t.replace(a, () => b);
  console.log('ok', label);
}
// 1. API del panel en mismo origen (proxy local) + sesión de desarrollo sin login
rep('VITE_PANEL_API_URL:"https://api-panelpack.buildwiselabs.net"', 'VITE_PANEL_API_URL:"same-origin"', 'api');
rep('getSession:()=>i.getSession(),getPhoto', 'getSession:async()=>({id:1,name:"Desarrollo Local",email:"dev@localhost",phone:"",role:"admin",attributes:{role:"admin"}}),getPhoto', 'sesion');
require('./registro.cjs')(rep);
// 2. Capa híbrida
rep('sat:()=>yt.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",{maxZoom:19,maxNativeZoom:17,attribution:"Imágenes &copy; Esri"})},Yp=',
  'sat:()=>yt.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",{maxZoom:19,maxNativeZoom:17,attribution:"Imágenes &copy; Esri"}),hyb:()=>yt.layerGroup([yt.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",{maxZoom:19,maxNativeZoom:17,attribution:"Imágenes &copy; Esri"}),yt.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",{maxZoom:19,maxNativeZoom:17})])},Yp=', 'hyb');
// 3. Plantilla: reemplaza capas + controles por la barra estilo Deere
const a = t.indexOf('<!-- Capas (abajo a la izquierda) -->');
const zEnd = t.indexOf('id="ctl-zout"', a);
const end = t.indexOf('</div>\n    </div>', zEnd) + '</div>\n    </div>'.length;
if (a < 0 || zEnd < 0 || end < zEnd) throw new Error('plantilla no encontrada');
t = t.slice(0, a) + rd('tpl.html').trimEnd() + t.slice(end);
console.log('ok plantilla');
// 4. Cableado de controles
const w0 = t.indexOf('const j=document.getElementById("layer-thumb")');
const w1marker = 'document.getElementById("ctl-fit").addEventListener("click",O);';
const w1 = t.indexOf(w1marker, w0) + w1marker.length;
if (w0 < 0 || w1 < w0) throw new Error('cableado no encontrado');
t = t.slice(0, w0) + rd('wire.js').trim() + rd('navwire.js').trim() + t.slice(w1);
console.log('ok cableado');
const ORGPOP = '<div class="jd-orgname">Agrícola Las Cabras</div><div class="jd-orgaddr"><div>Rafael Buelna 32, 31</div><div>82800 El Rosario Sinaloa SIN</div></div><button type="button" class="jd-orglink" data-org-go="map-settings"><svg viewBox="0 0 24 24" class="h-4 w-4" aria-hidden="true"><path d="M19.1 12.9c0-.3.1-.6.1-.9s0-.6-.1-.9l2-1.6c.2-.1.2-.4.1-.6l-1.9-3.3c-.1-.2-.4-.3-.6-.2l-2.4 1c-.5-.4-1-.7-1.6-.9L14.3 3c0-.2-.2-.4-.5-.4H10c-.2 0-.4.2-.5.4l-.3 2.3c-.5.3-1.1.6-1.6 1l-2.4-1c-.2-.1-.4 0-.6.2L2.7 8.9c-.1.2 0 .4.2.6l2 1.6c0 .3-.1.6-.1.9s0 .6.1.9l-2 1.6c-.2.1-.2.4-.1.6l1.9 3.3c.1.2.4.3.6.2l2.4-1c.5.4 1 .7 1.6.9l.4 2.5c.1.2.2.4.5.4H14c.2 0 .4-.2.5-.4l.4-2.5c.6-.2 1.1-.6 1.6-.9l2.4 1c.2.1.5 0 .6-.2l1.9-3.3c.1-.2.1-.5-.1-.6zM12 15.6c-2 0-3.6-1.6-3.6-3.6S10 8.4 12 8.4s3.6 1.6 3.6 3.6-1.6 3.6-3.6 3.6" fill="currentColor"/></svg><span>Preferencias de organización</span></button><button type="button" class="jd-orglink" data-org-new title="Próximamente"><svg viewBox="0 0 24 24" class="h-4 w-4" aria-hidden="true"><path d="M20 13.1h-6.9V20h-2.3v-6.9H4v-2.3h6.9V4h2.3v6.9H20z" fill="currentColor"/></svg><span>Crear una organización nueva</span></button>';
rep('          <button type="button" class="menu-btn" data-links-btn aria-haspopup="true" aria-expanded="false">\n            <span class="inline-flex items-center gap-1">Enlaces<span data-links-caret class="rotate-180 transition-transform">${G("chevronUp","h-4 w-4")}</span></span>\n          </button>\n        </nav>', '        </nav>', 'quitar-enlaces-fila1');
// 4b. Header: fila superior con el concepto de Operations Center (marca | título | organización | usuario)
const PERSON = '<svg viewBox="0 0 32 32" class="h-5 w-5" aria-hidden="true"><path d="M21.976 21.815a39 39 0 0 0-1.804-.78q-.062-.38-.146-.738a23 23 0 0 1-.117-.569q-.054-.274-.031-.38 0-.232.136-.706.138-.474.306-.98.169-.506.326-.981.159-.473.201-.706.148.064.295.085.126.021.252.011a.37.37 0 0 0 .232-.117q.273-.38.485-.886a7.4 7.4 0 0 0 .337-1.012q.125-.506.137-.949.01-.442-.117-.717a.73.73 0 0 0-.295-.263 1.7 1.7 0 0 0-.379-.137 1.7 1.7 0 0 0-.485-.063 3.8 3.8 0 0 1 .094-1.317q.16-.58.37-1.075.209-.497.389-.918.179-.421.179-.886 0-.506-.222-.801a1.8 1.8 0 0 0-.495-.464 2 2 0 0 0-.718-.252c0-.099-.007-.196-.013-.292a3 3 0 0 1-.031-.274 2 2 0 0 0-.054-.317 4 4 0 0 0-.179-.474 1.8 1.8 0 0 0-.326-.497 2.5 2.5 0 0 0-.517-.422 3 3 0 0 0-.749-.317Q18.03 3.39 17.3 3.6t-1.307.548q-.58.338-1.055.664-.476.327-.96.326-.168 0-.485-.011a5 5 0 0 1-.726-.085 8 8 0 0 1-.866-.211 3.9 3.9 0 0 1-.874-.389.9.9 0 0 0 .063.317.8.8 0 0 0 .148.252q.104.127.274.232-.696.21-1.161.758-.465.549-.506 1.603a7 7 0 0 0 .085 1.538q.125.78.295 1.413.19.717.463 1.37-.273 0-.485.063-.211.043-.389.137a.77.77 0 0 0-.284.266q-.125.275-.106.717c.019.442.061.612.137.949q.116.505.326 1.012t.485.886a.5.5 0 0 0 .232.105.8.8 0 0 0 .254 0q.125-.02.294-.085.041.254.201.717.157.464.337.97.179.505.317.98.136.474.158.706 0 .084-.054.369a35 35 0 0 1-.115.58q-.064.338-.148.738a31 31 0 0 0-1.835.769q-.95.433-1.75.833l-1.856.949q.78 1.392 1.824 2.33a9 9 0 0 0 2.277 1.507q1.234.57 2.625.823 1.392.254 2.867.254 1.497 0 2.878-.252 1.381-.253 2.615-.823a9 9 0 0 0 2.266-1.507q1.032-.939 1.835-2.33a59 59 0 0 0-1.856-.949 244 244 0 0 0-1.762-.824" fill="currentColor"/></svg>';
const GROUPS = '<svg viewBox="0 0 32 32" class="h-5 w-5" aria-hidden="true"><circle cx="16" cy="10" r="4.5" fill="currentColor"/><path d="M7 27c0-5 4-8.5 9-8.5s9 3.5 9 8.5z" fill="currentColor"/><circle cx="6" cy="13" r="3" fill="currentColor" opacity=".7"/><circle cx="26" cy="13" r="3" fill="currentColor" opacity=".7"/></svg>';
rep('<div class="flex h-8 items-center gap-5 bg-bar px-4 text-xs text-bar-ink">\n        <span class="opacity-80">Las Cabras Sinaloa · Rastreo y Medición</span>\n        <div class="ml-auto flex items-center gap-2" role="group" aria-label="Tema de color">',
  '<div class="jd-top">\n        <span class="jd-brand" title="Las Cabras Sinaloa">${hr("h-6 w-auto")}</span><span class="jd-vline"></span>\n        <h2 class="jd-title">panelpack.net</h2><span class="jd-flex"></span>\n        <div class="flex items-center gap-2" role="group" aria-label="Tema de color">', 'header-abre');
rep('Cerrar sesión</button>\n        </nav>\n      </div>',
  'Cerrar sesión</button>\n        </nav>\n        <span class="jd-vline"></span>\n        <div class="jd-orgw"><button type="button" class="jd-org" title="Selección de organización" aria-haspopup="true" aria-expanded="false">' + GROUPS + '<span>Agrícola Las Cabras</span><svg viewBox="0 0 24 24" class="h-4 w-4" aria-hidden="true"><path d="M16.6 8.6 12 13.2 7.4 8.6 6 10l6 6 6-6z" fill="currentColor"/></svg></button><div class="jd-orgpop" hidden>' + ORGPOP + '</div></div>\n        <span class="jd-vline"></span>\n        <button type="button" data-view="profile" class="jd-user" title="Preferencias de usuario" aria-label="Preferencias de usuario">' + PERSON + '</button>\n      </div>', 'header-cierra');
rep('<div class="flex items-center gap-2.5" title="Las Cabras Sinaloa · Rastreo y Medición">\n          ${hr("h-8 w-auto")}\n          <span class="grid leading-tight"><b class="text-[13px] font-semibold">Panel de flota</b><span class="text-[11px] text-muted">Rastreo y Medición</span></span>\n        </div>\n        <nav id="rail"', '<nav id="rail"', 'header-fila2');
rep('        </nav>\n      </div>\n    </header>', '        </nav>\n      </div>' + rd('navrow.html') + '\n    </header>', 'header-fila3');
rep('_?.addEventListener("click",()=>g.toggle(_))', '_?.addEventListener("click",()=>g.toggle(_)),document.querySelectorAll("[data-links-btn]").forEach(b=>b!==_&&b.addEventListener("click",()=>g.toggle(b)))', 'enlaces-extra');
// 5. Clics en marcadores/lotes ignorados mientras se mide
fs.writeFileSync(js, t);
fs.appendFileSync(css, rd('deere.css'));
fs.appendFileSync(css, rd('home.css'));
fs.copyFileSync(path.join(dir, 'home.js'), path.join(dst, 'assets/home.js'));
fs.copyFileSync(path.join(dir, 'earth-poster.jpg'), path.join(dst, 'brand/earth-poster.jpg'));
fs.copyFileSync(path.join(dir, 'jquery.min.js'), path.join(dst, 'assets/jquery.min.js'));
const ix = path.join(dst, 'index.html');
const ih = fs.readFileSync(ix, 'utf8');
if (!ih.includes('home.js')) fs.writeFileSync(ix, ih.replace('</head>', '    <script defer src="/assets/jquery.min.js"></script>\n    <script defer src="/assets/home.js"></script>\n  </head>'));
console.log('listo');

