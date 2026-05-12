-- CreateEnum
CREATE TYPE "EquipmentType" AS ENUM ('TP_HEAVY', 'TRUCK', 'CONCRETE_MIXER', 'SERVICE_VEHICLE', 'OTHER');

-- CreateEnum
CREATE TYPE "EquipmentStatus" AS ENUM ('IN_SERVICE', 'MAINTENANCE', 'BREAKDOWN', 'RETIRED', 'TRANSFER');

-- CreateEnum
CREATE TYPE "MaintenanceType" AS ENUM ('PREVENTIVE_SMALL', 'PREVENTIVE_BIG', 'ANNUAL_INSPECTION', 'CURATIVE', 'INSURANCE_RENEWAL', 'REGULATORY');

-- CreateEnum
CREATE TYPE "MaintenanceStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'DONE', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TransferPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SCHEDULED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "equipment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "registration" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "type" "EquipmentType" NOT NULL,
    "acquisitionDate" TIMESTAMP(3),
    "acquisitionValue" BIGINT NOT NULL,
    "currentValue" BIGINT NOT NULL,
    "status" "EquipmentStatus" NOT NULL DEFAULT 'IN_SERVICE',
    "counterUnit" TEXT NOT NULL DEFAULT 'h',
    "counter" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "insuranceUntil" TIMESTAMP(3),
    "visiteUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_assignments" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "siteId" TEXT,
    "driverId" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipment_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_schedules" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "type" "MaintenanceType" NOT NULL,
    "description" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "triggerAt" DOUBLE PRECISION,
    "completedAt" TIMESTAMP(3),
    "cost" BIGINT,
    "vendorName" TEXT,
    "status" "MaintenanceStatus" NOT NULL DEFAULT 'PLANNED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inter_site_transfers" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "fromSiteId" TEXT NOT NULL,
    "toSiteId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priority" "TransferPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "TransferStatus" NOT NULL DEFAULT 'PENDING',
    "estimatedSavings" BIGINT NOT NULL DEFAULT 0,
    "context" TEXT,
    "arbitratedById" TEXT,
    "arbitratedAt" TIMESTAMP(3),
    "arbitrationNote" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inter_site_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inter_site_transfer_items" (
    "id" TEXT NOT NULL,
    "transferId" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,

    CONSTRAINT "inter_site_transfer_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "equipment_tenantId_type_idx" ON "equipment"("tenantId", "type");

-- CreateIndex
CREATE INDEX "equipment_tenantId_status_idx" ON "equipment"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_tenantId_registration_key" ON "equipment"("tenantId", "registration");

-- CreateIndex
CREATE INDEX "equipment_assignments_equipmentId_active_idx" ON "equipment_assignments"("equipmentId", "active");

-- CreateIndex
CREATE INDEX "equipment_assignments_siteId_idx" ON "equipment_assignments"("siteId");

-- CreateIndex
CREATE INDEX "maintenance_schedules_equipmentId_scheduledAt_idx" ON "maintenance_schedules"("equipmentId", "scheduledAt");

-- CreateIndex
CREATE INDEX "maintenance_schedules_status_idx" ON "maintenance_schedules"("status");

-- CreateIndex
CREATE INDEX "inter_site_transfers_tenantId_status_idx" ON "inter_site_transfers"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "inter_site_transfers_tenantId_reference_key" ON "inter_site_transfers"("tenantId", "reference");

-- CreateIndex
CREATE INDEX "inter_site_transfer_items_transferId_idx" ON "inter_site_transfer_items"("transferId");

-- AddForeignKey
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_assignments" ADD CONSTRAINT "equipment_assignments_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_assignments" ADD CONSTRAINT "equipment_assignments_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_assignments" ADD CONSTRAINT "equipment_assignments_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_schedules" ADD CONSTRAINT "maintenance_schedules_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inter_site_transfers" ADD CONSTRAINT "inter_site_transfers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inter_site_transfers" ADD CONSTRAINT "inter_site_transfers_fromSiteId_fkey" FOREIGN KEY ("fromSiteId") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inter_site_transfers" ADD CONSTRAINT "inter_site_transfers_toSiteId_fkey" FOREIGN KEY ("toSiteId") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inter_site_transfers" ADD CONSTRAINT "inter_site_transfers_arbitratedById_fkey" FOREIGN KEY ("arbitratedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inter_site_transfer_items" ADD CONSTRAINT "inter_site_transfer_items_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "inter_site_transfers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
