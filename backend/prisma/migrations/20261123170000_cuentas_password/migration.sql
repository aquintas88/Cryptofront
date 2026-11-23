-- Cambio de contraseña obligatorio tras una clave temporal, y fecha del último cambio.
ALTER TABLE "Usuario" ADD COLUMN "debeCambiarPassword" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Usuario" ADD COLUMN "passwordCambiadaEn" TIMESTAMP(3);
