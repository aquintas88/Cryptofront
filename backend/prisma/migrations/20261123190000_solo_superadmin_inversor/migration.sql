-- Se elimina el rol USUARIO. Las cuentas con ese rol pasan a INVERSOR y se desactivan
-- (no tienen posiciones de inversión; la zona de inversores quedaría vacía).
UPDATE "Usuario" SET "rol" = 'INVERSOR', "activo" = false WHERE "rol" = 'USUARIO';

ALTER TABLE "Usuario" ALTER COLUMN "rol" DROP DEFAULT;
CREATE TYPE "Rol_nuevo" AS ENUM ('SUPERADMIN', 'INVERSOR');
ALTER TABLE "Usuario" ALTER COLUMN "rol" TYPE "Rol_nuevo" USING ("rol"::text::"Rol_nuevo");
DROP TYPE "Rol";
ALTER TYPE "Rol_nuevo" RENAME TO "Rol";
ALTER TABLE "Usuario" ALTER COLUMN "rol" SET DEFAULT 'INVERSOR';
