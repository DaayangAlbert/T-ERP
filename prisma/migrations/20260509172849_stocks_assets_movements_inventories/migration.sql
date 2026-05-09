-- CreateEnum
CREATE TYPE "AssetCategory" AS ENUM ('EQUIPMENT', 'VEHICLE', 'BUILDING', 'TOOLING', 'IT', 'FURNITURE', 'OTHER');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('INBOUND', 'OUTBOUND', 'TRANSFER', 'ADJUSTMENT', 'WRITEOFF');

-- CreateEnum
CREATE TYPE "InventoryStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'VALIDATED');

-- CreateEnum
CREATE TYPE "LossType" AS ENUM ('THEFT', 'DAMAGE', 'LOSS', 'OTHER');

-- CreateTable
CREATE TABLE "fixed_assets" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "AssetCategory" NOT NULL,
    "acquisitionDate" TIMESTAMP(3) NOT NULL,
    "grossValue" BIGINT NOT NULL,
    "accumulatedDepreciation" BIGINT NOT NULL DEFAULT 0,
    "netValue" BIGINT NOT NULL,
    "usefulLifeMonths" INTEGER NOT NULL,
    "siteId" TEXT,
    "condition" TEXT NOT NULL DEFAULT 'GOOD',
    "insurance" JSONB,
    "lastRevaluedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fixed_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "MovementType" NOT NULL,
    "itemCode" TEXT NOT NULL,
    "itemLabel" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitValue" BIGINT NOT NULL,
    "totalValue" BIGINT NOT NULL,
    "fromSiteId" TEXT,
    "toSiteId" TEXT,
    "reason" TEXT,
    "initiatorId" TEXT NOT NULL,
    "anomalous" BOOLEAN NOT NULL DEFAULT false,
    "anomalyReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventories" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "siteId" TEXT,
    "period" TEXT NOT NULL,
    "items" JSONB NOT NULL DEFAULT '[]',
    "itemsCount" INTEGER NOT NULL DEFAULT 0,
    "gapsCount" INTEGER NOT NULL DEFAULT 0,
    "gapsValue" BIGINT NOT NULL DEFAULT 0,
    "status" "InventoryStatus" NOT NULL DEFAULT 'PLANNED',
    "dgValidated" BOOLEAN NOT NULL DEFAULT false,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "losses" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "LossType" NOT NULL,
    "itemDescription" TEXT NOT NULL,
    "value" BIGINT NOT NULL,
    "siteId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "declaredToInsurance" BOOLEAN NOT NULL DEFAULT false,
    "declaredAt" TIMESTAMP(3),
    "indemnification" BIGINT,
    "correctiveActions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "losses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fixed_assets_tenantId_category_idx" ON "fixed_assets"("tenantId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "fixed_assets_tenantId_code_key" ON "fixed_assets"("tenantId", "code");

-- CreateIndex
CREATE INDEX "stock_movements_tenantId_anomalous_idx" ON "stock_movements"("tenantId", "anomalous");

-- CreateIndex
CREATE INDEX "stock_movements_tenantId_createdAt_idx" ON "stock_movements"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "inventories_tenantId_status_idx" ON "inventories"("tenantId", "status");

-- CreateIndex
CREATE INDEX "losses_tenantId_type_idx" ON "losses"("tenantId", "type");

-- AddForeignKey
ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventories" ADD CONSTRAINT "inventories_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "losses" ADD CONSTRAINT "losses_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
