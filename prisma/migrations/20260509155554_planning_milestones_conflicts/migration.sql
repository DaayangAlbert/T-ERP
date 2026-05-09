-- CreateEnum
CREATE TYPE "MilestoneType" AS ENUM ('SITE_START', 'SITE_DELIVERY', 'MILESTONE', 'FINANCIAL', 'COMMERCIAL', 'INTERNAL');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'DONE', 'DELAYED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ArbitrationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED');

-- CreateTable
CREATE TABLE "milestones" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "siteId" TEXT,
    "type" "MilestoneType" NOT NULL,
    "title" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "critical" BOOLEAN NOT NULL DEFAULT false,
    "status" "MilestoneStatus" NOT NULL DEFAULT 'PLANNED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_conflicts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceLabel" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "demandLevel" INTEGER NOT NULL,
    "siteIds" TEXT[],
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolution" TEXT,
    "arbitration" BOOLEAN NOT NULL DEFAULT false,
    "arbitrationStatus" "ArbitrationStatus" NOT NULL DEFAULT 'PENDING',
    "arbitrationNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resource_conflicts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "milestones_tenantId_date_idx" ON "milestones"("tenantId", "date");

-- CreateIndex
CREATE INDEX "milestones_tenantId_type_idx" ON "milestones"("tenantId", "type");

-- CreateIndex
CREATE INDEX "resource_conflicts_tenantId_resolved_idx" ON "resource_conflicts"("tenantId", "resolved");

-- CreateIndex
CREATE INDEX "resource_conflicts_tenantId_arbitration_idx" ON "resource_conflicts"("tenantId", "arbitration");

-- AddForeignKey
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_conflicts" ADD CONSTRAINT "resource_conflicts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
