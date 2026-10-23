-- Prisma necesita una "shadow database" para `prisma migrate dev`: crea una base temporal,
-- le aplica el historial de migraciones y la compara con el esquema para saber que cambio.
-- El usuario que crea la imagen de MySQL solo tiene permisos sobre SU base, no para crear
-- otras, asi que `migrate dev` falla con P3014 / "User `agrobot` was denied access".
--
-- Esto le da permisos globales al usuario del bot. Es seguro porque este contenedor es
-- SOLO para desarrollo local: no esta expuesto a internet y su base se puede borrar y
-- recrear cuando sea. En Hostinger no aplica -- alla se usa `prisma migrate deploy`, que
-- no necesita shadow database ni permisos especiales.
--
-- Este archivo lo corre MySQL solo, la primera vez que se crea el volumen de datos.
-- Si el volumen ya existe, no se vuelve a ejecutar (hay que correr el GRANT a mano).
GRANT ALL PRIVILEGES ON *.* TO 'agrobot'@'%';
FLUSH PRIVILEGES;
