-- Tablas de inversiones y aislamiento por Row-Level Security (RLS).
-- La aplicación fija en cada transacción: app.tenant_id, app.usuario_id y app.acceso_total ('on' solo para DIRECTOR_EMPRESA).
-- Sin esas variables, las políticas no devuelven ninguna fila (cierre por defecto).

-- CreateEnum
CREATE TYPE "ProductoInversion" AS ENUM ('BOT_TRADING', 'PROYECTO_CRYPTO', 'TOKEN_SHARE');

-- CreateEnum
CREATE TYPE "EstadoPosicion" AS ENUM ('ACTIVA', 'FINALIZADA');

-- CreateEnum
CREATE TYPE "TipoMovimiento" AS ENUM ('APORTACION', 'RETIRADA', 'COMISION', 'RENDIMIENTO', 'REPARTO');

-- AlterEnum

-- CreateTable
CREATE TABLE "CondicionesInversion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "producto" "ProductoInversion" NOT NULL,
    "vigenteDesde" TIMESTAMP(3) NOT NULL,
    "comisionExitoPct" DECIMAL(6,3),
    "tasaFijaPct" DECIMAL(6,3),
    "tasaMensualPct" DECIMAL(6,3),
    "meses" INTEGER,
    "fechaSalida" TIMESTAMP(3),
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CondicionesInversion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosicionInversion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "inversorId" TEXT NOT NULL,
    "producto" "ProductoInversion" NOT NULL,
    "estado" "EstadoPosicion" NOT NULL DEFAULT 'ACTIVA',
    "fechaAlta" TIMESTAMP(3) NOT NULL,
    "fechaBaja" TIMESTAMP(3),
    "capitalAportado" DECIMAL(14,2) NOT NULL,
    "idOrigen" TEXT,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PosicionInversion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimientoInversion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "posicionId" TEXT NOT NULL,
    "inversorId" TEXT NOT NULL,
    "tipo" "TipoMovimiento" NOT NULL,
    "importe" DECIMAL(14,2) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "idOrigen" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimientoInversion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ValorDiarioInversion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "posicionId" TEXT NOT NULL,
    "inversorId" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "valor" DECIMAL(14,2) NOT NULL,
    "idOrigen" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ValorDiarioInversion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CondicionesInversion_tenantId_producto_vigenteDesde_idx" ON "CondicionesInversion"("tenantId", "producto", "vigenteDesde");

-- CreateIndex
CREATE INDEX "PosicionInversion_tenantId_inversorId_idx" ON "PosicionInversion"("tenantId", "inversorId");

-- CreateIndex
CREATE UNIQUE INDEX "PosicionInversion_id_tenantId_inversorId_key" ON "PosicionInversion"("id", "tenantId", "inversorId");

-- CreateIndex
CREATE UNIQUE INDEX "PosicionInversion_tenantId_idOrigen_key" ON "PosicionInversion"("tenantId", "idOrigen");

-- CreateIndex
CREATE INDEX "MovimientoInversion_posicionId_fecha_idx" ON "MovimientoInversion"("posicionId", "fecha");

-- CreateIndex
CREATE INDEX "MovimientoInversion_tenantId_inversorId_fecha_idx" ON "MovimientoInversion"("tenantId", "inversorId", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "MovimientoInversion_tenantId_idOrigen_key" ON "MovimientoInversion"("tenantId", "idOrigen");

-- CreateIndex
CREATE INDEX "ValorDiarioInversion_tenantId_inversorId_fecha_idx" ON "ValorDiarioInversion"("tenantId", "inversorId", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "ValorDiarioInversion_posicionId_fecha_key" ON "ValorDiarioInversion"("posicionId", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "ValorDiarioInversion_tenantId_idOrigen_key" ON "ValorDiarioInversion"("tenantId", "idOrigen");

-- AddForeignKey
ALTER TABLE "CondicionesInversion" ADD CONSTRAINT "CondicionesInversion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosicionInversion" ADD CONSTRAINT "PosicionInversion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosicionInversion" ADD CONSTRAINT "PosicionInversion_inversorId_fkey" FOREIGN KEY ("inversorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoInversion" ADD CONSTRAINT "MovimientoInversion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoInversion" ADD CONSTRAINT "MovimientoInversion_posicionId_tenantId_inversorId_fkey" FOREIGN KEY ("posicionId", "tenantId", "inversorId") REFERENCES "PosicionInversion"("id", "tenantId", "inversorId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValorDiarioInversion" ADD CONSTRAINT "ValorDiarioInversion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValorDiarioInversion" ADD CONSTRAINT "ValorDiarioInversion_posicionId_tenantId_inversorId_fkey" FOREIGN KEY ("posicionId", "tenantId", "inversorId") REFERENCES "PosicionInversion"("id", "tenantId", "inversorId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────
-- Row-Level Security
-- ─────────────────────────────────────────────────────────────
-- Funciones de contexto. Sin variable de sesión devuelven NULL / falso.
CREATE OR REPLACE FUNCTION app_tenant() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT current_setting('app.tenant_id', true)
$$;
CREATE OR REPLACE FUNCTION app_usuario() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT current_setting('app.usuario_id', true)
$$;
CREATE OR REPLACE FUNCTION app_acceso_total() RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT coalesce(current_setting('app.acceso_total', true), 'off') = 'on'
$$;

-- Condiciones: solo gestión de la empresa (el inversor no las lee en esta fase).
ALTER TABLE "CondicionesInversion" ENABLE ROW LEVEL SECURITY;
CREATE POLICY condiciones_gestion ON "CondicionesInversion"
  USING ("tenantId" = app_tenant() AND app_acceso_total())
  WITH CHECK ("tenantId" = app_tenant() AND app_acceso_total());

-- Posiciones: el inversor lee SOLO las suyas; escribir y borrar, solo la gestión de la empresa.
ALTER TABLE "PosicionInversion" ENABLE ROW LEVEL SECURITY;
CREATE POLICY posicion_lectura ON "PosicionInversion" FOR SELECT
  USING ("tenantId" = app_tenant() AND (app_acceso_total() OR "inversorId" = app_usuario()));
CREATE POLICY posicion_alta ON "PosicionInversion" FOR INSERT
  WITH CHECK ("tenantId" = app_tenant() AND app_acceso_total());
CREATE POLICY posicion_modificacion ON "PosicionInversion" FOR UPDATE
  USING ("tenantId" = app_tenant() AND app_acceso_total())
  WITH CHECK ("tenantId" = app_tenant() AND app_acceso_total());
CREATE POLICY posicion_baja ON "PosicionInversion" FOR DELETE
  USING ("tenantId" = app_tenant() AND app_acceso_total());

-- Movimientos y valores: lectura por inversor propio o gestión de la empresa; escritura solo gestión.
ALTER TABLE "MovimientoInversion" ENABLE ROW LEVEL SECURITY;
CREATE POLICY movimiento_lectura ON "MovimientoInversion" FOR SELECT
  USING ("tenantId" = app_tenant() AND (app_acceso_total() OR "inversorId" = app_usuario()));
CREATE POLICY movimiento_escritura ON "MovimientoInversion" FOR ALL
  USING ("tenantId" = app_tenant() AND app_acceso_total())
  WITH CHECK ("tenantId" = app_tenant() AND app_acceso_total());

ALTER TABLE "ValorDiarioInversion" ENABLE ROW LEVEL SECURITY;
CREATE POLICY valor_lectura ON "ValorDiarioInversion" FOR SELECT
  USING ("tenantId" = app_tenant() AND (app_acceso_total() OR "inversorId" = app_usuario()));
CREATE POLICY valor_escritura ON "ValorDiarioInversion" FOR ALL
  USING ("tenantId" = app_tenant() AND app_acceso_total())
  WITH CHECK ("tenantId" = app_tenant() AND app_acceso_total());
