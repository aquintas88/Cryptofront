-- CreateTable
CREATE TABLE "RegistroAuditoria" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "actorId" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidadId" TEXT,
    "accion" TEXT NOT NULL,
    "cambios" JSONB,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistroAuditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecretoIntegracion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "integracion" TEXT NOT NULL,
    "campo" TEXT NOT NULL,
    "ambitoId" TEXT NOT NULL DEFAULT '',
    "valorCifrado" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecretoIntegracion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RegistroAuditoria_tenantId_creadoEn_idx" ON "RegistroAuditoria"("tenantId", "creadoEn");

-- CreateIndex
CREATE INDEX "RegistroAuditoria_entidad_entidadId_idx" ON "RegistroAuditoria"("entidad", "entidadId");

-- CreateIndex
CREATE UNIQUE INDEX "SecretoIntegracion_tenantId_integracion_campo_ambitoId_key" ON "SecretoIntegracion"("tenantId", "integracion", "campo", "ambitoId");

-- AddForeignKey
ALTER TABLE "SecretoIntegracion" ADD CONSTRAINT "SecretoIntegracion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Auditoría inmutable: la aplicación no puede modificar ni borrar registros.
-- Si el rol de la aplicación ya existe, se le retira el permiso. Si no existe todavía
-- (primer despliegue), crear-rol-app.sql lo aplica después de las migraciones.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'kira_app') THEN
    REVOKE UPDATE, DELETE ON "RegistroAuditoria" FROM kira_app;
  END IF;
END
$$;
