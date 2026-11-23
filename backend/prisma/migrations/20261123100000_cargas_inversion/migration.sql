-- Registro de cargas diarias o semanales de datos de inversión.
-- CreateTable
CREATE TABLE "CargaInversion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fechaCarga" TIMESTAMP(3) NOT NULL,
    "origen" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "filasRecibidas" INTEGER NOT NULL,
    "filasAceptadas" INTEGER NOT NULL,
    "erroresResumen" TEXT,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CargaInversion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CargaInversion_tenantId_fechaCarga_idx" ON "CargaInversion"("tenantId", "fechaCarga");

-- AddForeignKey
ALTER TABLE "CargaInversion" ADD CONSTRAINT "CargaInversion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

