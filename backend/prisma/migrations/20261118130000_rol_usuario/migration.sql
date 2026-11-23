-- Añade el rol USUARIO (usuario normal, menor privilegio).
-- Va en su propia migración: Postgres no permite usar un valor de enum recién añadido en la misma transacción.
ALTER TYPE "Rol" ADD VALUE 'USUARIO';
