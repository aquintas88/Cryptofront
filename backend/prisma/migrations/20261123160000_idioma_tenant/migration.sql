-- Idioma de la zona de clientes por empresa (es | en). Por defecto español para las empresas existentes.
ALTER TABLE "Tenant" ADD COLUMN "idioma" TEXT NOT NULL DEFAULT 'es';
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_idioma_check" CHECK ("idioma" IN ('es', 'en'));
