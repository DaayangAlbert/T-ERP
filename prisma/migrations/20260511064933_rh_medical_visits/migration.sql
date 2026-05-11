-- CreateEnum
CREATE TYPE "MedicalVisitType" AS ENUM ('HIRING', 'PERIODIC', 'RETURN_TO_WORK', 'SPONTANEOUS');

-- CreateEnum
CREATE TYPE "FitnessVerdict" AS ENUM ('FIT', 'FIT_WITH_RESTRICTIONS', 'UNFIT', 'TEMPORARILY_UNFIT');

-- CreateTable
CREATE TABLE "medical_visits" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeKey" TEXT NOT NULL,
    "employeeName" TEXT NOT NULL,
    "type" "MedicalVisitType" NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "fitnessVerdict" "FitnessVerdict",
    "restrictions" TEXT,
    "nextVisitDue" TIMESTAMP(3),
    "doctor" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medical_visits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "medical_visits_tenantId_scheduledAt_idx" ON "medical_visits"("tenantId", "scheduledAt");

-- CreateIndex
CREATE INDEX "medical_visits_employeeKey_idx" ON "medical_visits"("employeeKey");
