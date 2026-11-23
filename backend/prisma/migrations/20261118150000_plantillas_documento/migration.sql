-- CreateTable
CREATE TABLE "PlantillaDocumento" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlantillaDocumento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlantillaDocumento_tenantId_idx" ON "PlantillaDocumento"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "PlantillaDocumento_tenantId_nombre_key" ON "PlantillaDocumento"("tenantId", "nombre");

-- AddForeignKey
ALTER TABLE "PlantillaDocumento" ADD CONSTRAINT "PlantillaDocumento_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

