-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('PLATAFORMA', 'DIRECTOR', 'USUARIO');

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "esPlataforma" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "rol" "Rol" NOT NULL DEFAULT 'USUARIO',
ADD COLUMN     "sucursalId" TEXT;

-- CreateTable
CREATE TABLE "Sucursal" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sucursal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Sucursal_tenantId_idx" ON "Sucursal"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Sucursal_tenantId_nombre_key" ON "Sucursal"("tenantId", "nombre");

-- AddForeignKey
ALTER TABLE "Sucursal" ADD CONSTRAINT "Sucursal_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_sucursalId_fkey" FOREIGN KEY ("sucursalId") REFERENCES "Sucursal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

