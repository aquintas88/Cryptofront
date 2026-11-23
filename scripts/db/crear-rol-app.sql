-- Cryptofront · crea el rol de la aplicación SIN privilegios (decisión D-03, lección L-09).
-- Se ejecuta con un usuario administrador. La app conecta con este rol.
--
-- Uso (la contraseña se pasa SIN comillas; la contraseña nunca va en el repositorio):
--   psql "$DATABASE_URL_ADMIN" -v ON_ERROR_STOP=1 -v dbname=NOMBRE_BD -v password=CONTRASEÑA -f scripts/db/crear-rol-app.sql
--
-- Idempotente: crea el rol si falta y aplica SIEMPRE la contraseña indicada y los permisos.

SELECT NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'kira_app') AS falta \gset
\if :falta
  SELECT 'CREATE ROLE kira_app' \gexec
\endif
SELECT format('ALTER ROLE kira_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS PASSWORD %L', :'password') \gexec
GRANT CONNECT ON DATABASE :"dbname" TO kira_app;
GRANT USAGE ON SCHEMA public TO kira_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO kira_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO kira_app;
-- Tablas que creen las migraciones (ejecutadas por el administrador) heredan los mismos permisos.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO kira_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO kira_app;
-- Auditoría inmutable: la aplicación solo puede insertar y leer (ver migración 20261118140000).
REVOKE UPDATE, DELETE ON "RegistroAuditoria" FROM kira_app;
