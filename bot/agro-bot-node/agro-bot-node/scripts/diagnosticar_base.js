// Diagnostico de la base a la que apunta DATABASE_URL en este momento.
//
// Dice tres cosas, que son las que suelen estar en desacuerdo cuando algo falla:
//   1) a que base se esta conectando de verdad (la contraseña sale tapada),
//   2) que tablas existen ahi,
//   3) que migraciones cree Prisma que ya se aplicaron.
//
// El caso tipico es el 3 sin el 2: Prisma anotada la migracion como aplicada pero las
// tablas no estan -- pasa cuando un `migrate deploy` alcanza a crear su tabla de control
// y falla despues, y luego se corre `migrate resolve --applied`.
//
// Uso:
//   node scripts/diagnosticar_base.js
// Para revisar la base de produccion en vez de la local, pon antes DATABASE_URL en la
// variable de entorno de la terminal (eso le gana al .env).
require('dotenv').config();
const { obtenerPrisma, porQueNoHayBase } = require('../src/services/prisma');

function urlTapada() {
  return String(process.env.DATABASE_URL || '').replace(/:\/\/([^:]+):[^@]*@/, '://$1:****@');
}

async function main() {
  const prisma = obtenerPrisma();
  if (!prisma) {
    console.log('No hay base configurada: ' + porQueNoHayBase());
    return;
  }
  console.log('Conectando a: ' + urlTapada());

  const filas = await prisma.$queryRawUnsafe('SHOW TABLES');
  const tablas = filas.map((f) => Object.values(f)[0]);
  console.log('\nTablas en la base (' + tablas.length + '):');
  console.log(tablas.length ? '  ' + tablas.join('\n  ') : '  (ninguna, la base esta vacia)');

  const faltan = ['usuarios', 'registros'].filter((t) => !tablas.includes(t));
  console.log('\nTablas que el bot necesita: ' + (faltan.length ? 'FALTAN -> ' + faltan.join(', ') : 'las dos estan'));

  if (tablas.includes('_prisma_migrations')) {
    const migs = await prisma.$queryRawUnsafe(
      'SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY started_at'
    );
    console.log('\nMigraciones que Prisma da por aplicadas:');
    migs.forEach((m) => {
      const estado = m.rolled_back_at ? 'revertida' : (m.finished_at ? 'aplicada' : 'a medias');
      console.log('  ' + m.migration_name + '  [' + estado + ']');
    });
    if (faltan.length && migs.some((m) => m.finished_at && !m.rolled_back_at)) {
      console.log('\n>>> INCONSISTENCIA: hay migraciones marcadas como aplicadas pero las');
      console.log('    tablas no existen. Hay que borrar la tabla _prisma_migrations y');
      console.log('    volver a correr `npx prisma migrate deploy`.');
    }
  } else {
    console.log('\nNo existe la tabla _prisma_migrations (Prisma nunca registro nada aqui).');
  }

  // Tablas que no son del bot: se describen para poder decidir si estorban o si la base
  // se esta usando para otra cosa. Solo se lee: columnas y cuantas filas tiene.
  const ajenas = tablas.filter((t) => !['usuarios', 'registros', '_prisma_migrations'].includes(t));
  if (ajenas.length) {
    console.log('\nTablas que NO son del bot (' + ajenas.length + '):');
    for (const t of ajenas) {
      const cols = await prisma.$queryRawUnsafe('SHOW COLUMNS FROM `' + t + '`');
      const cuenta = await prisma.$queryRawUnsafe('SELECT COUNT(*) AS n FROM `' + t + '`');
      const n = Number(Object.values(cuenta[0])[0]);
      console.log('  ' + t + ': ' + n + ' fila(s) | columnas: ' + cols.map((c) => c.Field).join(', '));
    }
  }

  if (tablas.includes('usuarios')) {
    const u = await prisma.$queryRawUnsafe('SELECT id, usuario, rol, activo FROM usuarios ORDER BY id');
    console.log('\nUsuarios dados de alta (' + u.length + '):');
    u.forEach((x) => console.log('  #' + x.id + ' ' + x.usuario + ' (' + x.rol + ')' + (x.activo ? '' : ' [inactivo]')));
  }
}

main()
  .catch((e) => { console.error('\nError: ' + e.message); process.exitCode = 1; })
  .finally(async () => { const p = obtenerPrisma(); if (p) await p.$disconnect(); });
