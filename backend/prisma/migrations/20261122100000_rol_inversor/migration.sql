-- Añade el rol INVERSOR (cliente que consulta su propia inversión).
-- Va en su propia migración: Postgres no permite usar un valor de enum recién añadido en la misma transacción.
ALTER TYPE "Rol" ADD VALUE 'INVERSOR';
