/*
 * Compila la documentacion de Labs (Docusaurus, carpeta labs-docs/) y la deja en
 * public/labs-docs, desde donde la app la muestra en la pagina Labs.
 *
 * Expo sirve la carpeta public/ tal cual, tanto con "expo start" como en el build que se
 * publica, asi que no hace falta un paso extra en Vercel: basta con correr esto despues
 * de editar un .md de labs-docs/docs y subir el resultado.
 *
 *   npm run labs:build
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const labs = path.join(raiz, 'labs-docs');
const destino = path.join(raiz, 'public', 'labs-docs');

function correr(cmd, cwd) {
  console.log(`\n> ${cmd}   (en ${path.relative(raiz, cwd) || '.'})`);
  execSync(cmd, { cwd, stdio: 'inherit' });
}

if (!fs.existsSync(path.join(labs, 'node_modules'))) {
  correr(fs.existsSync(path.join(labs, 'package-lock.json')) ? 'npm ci' : 'npm install', labs);
}
correr('npm run build', labs);

fs.rmSync(destino, { recursive: true, force: true });
fs.mkdirSync(path.dirname(destino), { recursive: true });
fs.cpSync(path.join(labs, 'build'), destino, { recursive: true });
console.log(`\n[labs] Listo: ${path.relative(raiz, destino)}`);
