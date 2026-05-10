-- CreateEnum
CREATE TYPE "ProvisionType" AS ENUM ('PAID_LEAVE', 'END_OF_CAREER', 'BONUSES', 'MUTUAL', 'OTHER');

-- CreateEnum
CREATE TYPE "DepartureType" AS ENUM ('RESIGNATION', 'DISMISSAL_INDIVIDUAL', 'DISMISSAL_ECONOMIC', 'RETIREMENT', 'END_OF_CONTRACT', 'NEGOTIATED');

-- CreateEnum
CREATE TYPE "DepartureStatus" AS ENUM ('PROVISIONED', 'PAID', 'DISPUTED');

-- CreateTable
CREATE TABLE "social_provisions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "ProvisionType" NOT NULL,
    "amount" BIGINT NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "periodEnd" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_provisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_departures" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "employeeName" TEXT NOT NULL,
    "position" TEXT,
    "departureType" "DepartureType" NOT NULL,
    "departureDate" TIMESTAMP(3) NOT NULL,
    "severancePay" BIGINT NOT NULL DEFAULT 0,
    "unusedLeavePay" BIGINT NOT NULL DEFAULT 0,
    "bonusProrata" BIGINT NOT NULL DEFAULT 0,
    "totalCost" BIGINT NOT NULL DEFAULT 0,
    "status" "DepartureStatus" NOT NULL DEFAULT 'PROVISIONED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_departures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "social_provisions_tenantId_periodEnd_idx" ON "social_provisions"("tenantId", "periodEnd");

-- CreateIndex
CREATE INDEX "employee_departures_tenantId_departureDate_idx" ON "employee_departures"("tenantId", "departureDate");

-- CreateIndex
CREATE INDEX "employee_departures_tenantId_status_idx" ON "employee_departures"("tenantId", "status");
