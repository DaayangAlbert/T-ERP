-- CreateEnum
CREATE TYPE "RhAlertType" AS ENUM ('MEDICAL_VISIT_DUE', 'TRAINING_RECYCLE_DUE', 'CDD_ENDING', 'LEAVE_REQUEST_PENDING', 'PAYROLL_INPUT_DEADLINE');

-- CreateTable
CREATE TABLE "rh_alerts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "RhAlertType" NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "details" TEXT,
    "link" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rh_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rh_alerts_tenantId_resolved_idx" ON "rh_alerts"("tenantId", "resolved");
