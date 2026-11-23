-- USUARIO pasa a ser el rol por defecto (menor privilegio). Los usuarios existentes conservan su rol.
ALTER TABLE "Usuario" ALTER COLUMN "rol" SET DEFAULT 'USUARIO';
