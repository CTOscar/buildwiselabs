#!/usr/bin/env node
/* make-deploy.cjs — arma la carpeta para subir a Hostinger SIN tocar el bundle de trabajo.
 *
 * Copia panelpack/ a deploy-hostinger/ (sin *.bak*, *.map ni archivos ocultos) y, en esa copia, cambia la
 * dirección de la API del panel: en trabajo el bundle usa "same-origin" (/api/panel, con el proxy local),
 * en Hostinger la API vive en otro subdominio.
 *
 * Uso:
 *   node patch/make-deploy.cjs                       # API en https://api-panelpack.buildwiselabs.net, datos simulados
 *   node patch/make-deploy.cjs --live                # además usa Traccar real (VITE_USE_MOCK=false)
 *   node patch/make-deploy.cjs --api https://otra.api --out ../salida
 */
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : def;
};
const live = args.includes('--live');
const api = opt('api', 'https://api-panelpack.buildwiselabs.net').replace(/\/$/, '');
const root = path.resolve(__dirname, '..');
const src = path.join(root, 'panelpack');
const out = path.resolve(root, opt('out', 'deploy-hostinger'));

if (!/^https:\/\/[a-z0-9.-]+(:\d+)?$/i.test(api)) {
  console.error(`La dirección de la API debe ser https://dominio (recibido: ${api})`);
  process.exit(1);
}
if (!fs.existsSync(path.join(src, 'index.html'))) {
  console.error(`No encuentro ${src}/index.html`);
  process.exit(1);
}
if (out === src || src.startsWith(out + path.sep)) {
  console.error('La carpeta de salida no puede ser panelpack ni una carpeta que la contenga.');
  process.exit(1);
}

const skip = (name) => /\.bak/i.test(name) || /\.map$/i.test(name) || name.startsWith('.');
let copied = 0;
function copy(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    if (skip(e.name)) continue;
    const a = path.join(from, e.name);
    const b = path.join(to, e.name);
    if (e.isDirectory()) copy(a, b);
    else {
      fs.copyFileSync(a, b);
      copied++;
    }
  }
}

fs.rmSync(out, { recursive: true, force: true });
copy(src, out);

// Cambia una constante del bundle exigiendo exactamente una coincidencia (si el bundle cambia, falla en vez de subir algo roto).
const bundle = fs.readdirSync(path.join(out, 'assets')).find((f) => /^index-.*\.js$/.test(f));
if (!bundle) throw new Error('No hay assets/index-*.js en la copia');
const file = path.join(out, 'assets', bundle);
let js = fs.readFileSync(file, 'utf8');
function swap(from, to) {
  const n = js.split(from).length - 1;
  if (n !== 1) throw new Error(`Se esperaba 1 coincidencia de ${from} y hay ${n}. ¿Cambió el bundle?`);
  js = js.replace(from, () => to);
}
swap('VITE_PANEL_API_URL:"same-origin"', `VITE_PANEL_API_URL:"${api}"`);
if (live) swap('VITE_USE_MOCK:"true"', 'VITE_USE_MOCK:"false"');
fs.writeFileSync(file, js);

console.log(`Listo: ${copied} archivos en ${out}`);
console.log(`  API del panel : ${api}/api/panel`);
console.log(`  Datos         : ${live ? 'Traccar real (VITE_USE_MOCK=false)' : 'simulados (VITE_USE_MOCK=true)'}`);
console.log('  Sube el CONTENIDO de esa carpeta (index.html, assets/, brand/, brands/, links/, status.html).');
