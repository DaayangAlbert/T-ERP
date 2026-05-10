-- CreateEnum
CREATE TYPE "LeaveType" AS ENUM ('PAID_LEAVE', 'RTT', 'UNPAID', 'SICK', 'MATERNITY', 'PATERNITY', 'FAMILY', 'OTHER');

-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'N1_APPROVED', 'RH_APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AbsenceReason" AS ENUM ('SICK', 'FAMILY', 'UNJUSTIFIED', 'LATE', 'STRIKE', 'OTHER');

-- CreateTable
CREATE TABLE "leave_requests" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeKey" TEXT NOT NULL,
    "employeeName" TEXT NOT NULL,
    "type" "LeaveType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "daysCount" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "status" "LeaveStatus" NOT NULL DEFAULT 'PENDING',
    "n1ValidatedBy" TEXT,
    "n1ValidatedAt" TIMESTAMP(3),
    "rhValidatedBy" TEXT,
    "rhValidatedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_balances" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeKey" TEXT NOT NULL,
    "employeeName" TEXT NOT NULL,
    "paidLeaveAcquired" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidLeaveTaken" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rttBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastTakenAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leave_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "absences" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeKey" TEXT NOT NULL,
    "employeeName" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "reason" "AbsenceReason" NOT NULL,
    "justified" BOOLEAN NOT NULL DEFAULT false,
    "reportedBy" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "absences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "leave_requests_tenantId_status_idx" ON "leave_requests"("tenantId", "status");

-- CreateIndex
CREATE INDEX "leave_requests_tenantId_startDate_idx" ON "leave_requests"("tenantId", "startDate");

-- CreateIndex
CREATE UNIQUE INDEX "leave_balances_employeeKey_key" ON "leave_balances"("employeeKey");

-- CreateIndex
CREATE INDEX "leave_balances_tenantId_idx" ON "leave_balances"("tenantId");

-- CreateIndex
CREATE INDEX "absences_tenantId_date_idx" ON "absences"("tenantId", "date");
