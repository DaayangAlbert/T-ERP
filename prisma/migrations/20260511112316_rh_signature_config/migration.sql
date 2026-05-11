-- CreateEnum
CREATE TYPE "ArticleCategory" AS ENUM ('CEMENT_CONCRETE', 'STEEL_REBAR', 'AGGREGATES', 'FORMWORK', 'FUEL', 'CONSUMABLES', 'TOOLS', 'PPE', 'OTHER');

-- CreateEnum
CREATE TYPE "WarehouseMovementDirection" AS ENUM ('IN', 'OUT', 'ADJUSTMENT_PLUS', 'ADJUSTMENT_MINUS');

-- CreateEnum
CREATE TYPE "WarehouseMovementReason" AS ENUM ('PURCHASE_DELIVERY', 'RETURN', 'CONSUMPTION_TEAM', 'CONSUMPTION_ENGINE', 'INVENTORY_ADJUSTMENT', 'DAMAGE_LOSS', 'TRANSFER_OUT', 'TRANSFER_IN');

-- CreateEnum
CREATE TYPE "WarehouseInventoryType" AS ENUM ('MONTHLY', 'ROLLING_WEEKLY', 'ROLLING_BIWEEKLY', 'ROLLING_MONTHLY', 'ANNUAL', 'ADHOC');

-- CreateEnum
CREATE TYPE "WarehouseInventoryStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'PENDING_VALIDATION', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "rh_settings" ADD COLUMN     "signatureConfig" JSONB;

-- CreateTable
CREATE TABLE "articles" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "ArticleCategory" NOT NULL,
    "unit" TEXT NOT NULL,
    "conversionUnit" TEXT,
    "defaultSupplierId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouses" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keeperId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouse_stocks" (
    "id" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pmpUnitPrice" BIGINT NOT NULL DEFAULT 0,
    "totalValue" BIGINT NOT NULL DEFAULT 0,
    "minThreshold" DOUBLE PRECISION,
    "lastInAt" TIMESTAMP(3),
    "lastOutAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouse_stocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouse_movements" (
    "id" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "direction" "WarehouseMovementDirection" NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitPrice" BIGINT NOT NULL,
    "totalValue" BIGINT NOT NULL,
    "reference" TEXT NOT NULL,
    "reason" "WarehouseMovementReason" NOT NULL,
    "supplierId" TEXT,
    "deliveryId" TEXT,
    "destinationTeamId" TEXT,
    "destinationUserId" TEXT,
    "signaturePhoto" TEXT,
    "blPhoto" TEXT,
    "notes" TEXT,
    "recordedById" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "syncedFromOffline" BOOLEAN NOT NULL DEFAULT false,
    "clientUuid" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "warehouse_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouse_inventories" (
    "id" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "type" "WarehouseInventoryType" NOT NULL,
    "scope" TEXT NOT NULL,
    "plannedDate" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "completedById" TEXT,
    "totalGapValue" BIGINT NOT NULL DEFAULT 0,
    "status" "WarehouseInventoryStatus" NOT NULL DEFAULT 'PLANNED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouse_inventories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouse_inventory_lines" (
    "id" TEXT NOT NULL,
    "inventoryId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "theoreticalQty" DOUBLE PRECISION NOT NULL,
    "countedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gap" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gapValue" BIGINT NOT NULL DEFAULT 0,
    "justification" TEXT,
    "countedAt" TIMESTAMP(3),
    "countedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouse_inventory_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "articles_tenantId_category_idx" ON "articles"("tenantId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "articles_tenantId_code_key" ON "articles"("tenantId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_siteId_key" ON "warehouses"("siteId");

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_tenantId_code_key" ON "warehouses"("tenantId", "code");

-- CreateIndex
CREATE INDEX "warehouse_stocks_warehouseId_idx" ON "warehouse_stocks"("warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "warehouse_stocks_warehouseId_articleId_key" ON "warehouse_stocks"("warehouseId", "articleId");

-- CreateIndex
CREATE INDEX "warehouse_movements_warehouseId_occurredAt_idx" ON "warehouse_movements"("warehouseId", "occurredAt");

-- CreateIndex
CREATE INDEX "warehouse_movements_articleId_idx" ON "warehouse_movements"("articleId");

-- CreateIndex
CREATE INDEX "warehouse_movements_direction_idx" ON "warehouse_movements"("direction");

-- CreateIndex
CREATE INDEX "warehouse_inventories_warehouseId_status_idx" ON "warehouse_inventories"("warehouseId", "status");

-- CreateIndex
CREATE INDEX "warehouse_inventory_lines_inventoryId_idx" ON "warehouse_inventory_lines"("inventoryId");

-- AddForeignKey
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_keeperId_fkey" FOREIGN KEY ("keeperId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_stocks" ADD CONSTRAINT "warehouse_stocks_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_stocks" ADD CONSTRAINT "warehouse_stocks_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "articles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_movements" ADD CONSTRAINT "warehouse_movements_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_movements" ADD CONSTRAINT "warehouse_movements_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "articles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_movements" ADD CONSTRAINT "warehouse_movements_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_inventories" ADD CONSTRAINT "warehouse_inventories_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_inventories" ADD CONSTRAINT "warehouse_inventories_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_inventory_lines" ADD CONSTRAINT "warehouse_inventory_lines_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "warehouse_inventories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_inventory_lines" ADD CONSTRAINT "warehouse_inventory_lines_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "articles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
