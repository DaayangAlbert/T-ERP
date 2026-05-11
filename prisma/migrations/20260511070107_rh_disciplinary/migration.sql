-- CreateEnum
CREATE TYPE "DisciplinarySeverity" AS ENUM ('MINOR', 'MAJOR', 'CRITICAL');

-- CreateEnum
CREATE TYPE "DisciplinaryStage" AS ENUM ('OPENED', 'PRELIMINARY_INTERVIEW', 'SANCTION_DECIDED', 'APPEALED', 'CLOSED');

-- CreateEnum
CREATE TYPE "DisciplinarySanction" AS ENUM ('WARNING', 'REPRIMAND', 'SUSPENSION_3D', 'SUSPENSION_8D', 'DISMISSAL_FAULT', 'GROSS_MISCONDUCT_DISMISSAL');

-- AlterTable
ALTER TABLE "purchase_orders" ADD COLUMN     "dtravValidatedAt" TIMESTAMP(3),
ADD COLUMN     "dtravValidatedBy" TEXT,
ADD COLUMN     "siteId" TEXT;

-- CreateTable
CREATE TABLE "disciplinary_cases" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeKey" TEXT NOT NULL,
    "employeeName" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "severity" "DisciplinarySeverity" NOT NULL,
    "stage" "DisciplinaryStage" NOT NULL DEFAULT 'OPENED',
    "openedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "sanction" "DisciplinarySanction",
    "facts" TEXT NOT NULL,
    "notes" TEXT,
    "documents" TEXT[],
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "disciplinary_cases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "disciplinary_cases_tenantId_stage_idx" ON "disciplinary_cases"("tenantId", "stage");

-- CreateIndex
CREATE INDEX "disciplinary_cases_tenantId_severity_idx" ON "disciplinary_cases"("tenantId", "severity");

-- CreateIndex
CREATE INDEX "purchase_orders_siteId_idx" ON "purchase_orders"("siteId");
