-- CreateEnum
CREATE TYPE "ValidationType" AS ENUM ('PAYROLL', 'EXPENSE', 'PURCHASE', 'HIRING', 'CONTRACT', 'LEAVE', 'OTHER');

-- CreateEnum
CREATE TYPE "ValidationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "ValidationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateTable
CREATE TABLE "validations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "ValidationType" NOT NULL,
    "reference" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amount" BIGINT,
    "initiatorId" TEXT NOT NULL,
    "currentStep" TEXT,
    "currentApproverId" TEXT,
    "workflow" JSONB NOT NULL,
    "comments" JSONB NOT NULL DEFAULT '[]',
    "status" "ValidationStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "ValidationPriority" NOT NULL DEFAULT 'NORMAL',
    "decidedById" TEXT,
    "decisionAt" TIMESTAMP(3),
    "decisionReason" TEXT,
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "validations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delegations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "types" "ValidationType"[],
    "maxAmount" BIGINT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delegations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "validations_tenantId_status_idx" ON "validations"("tenantId", "status");

-- CreateIndex
CREATE INDEX "validations_currentApproverId_status_idx" ON "validations"("currentApproverId", "status");

-- CreateIndex
CREATE INDEX "validations_tenantId_type_status_idx" ON "validations"("tenantId", "type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "validations_tenantId_reference_key" ON "validations"("tenantId", "reference");

-- CreateIndex
CREATE INDEX "delegations_tenantId_active_idx" ON "delegations"("tenantId", "active");

-- CreateIndex
CREATE INDEX "delegations_fromUserId_active_idx" ON "delegations"("fromUserId", "active");

-- AddForeignKey
ALTER TABLE "validations" ADD CONSTRAINT "validations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validations" ADD CONSTRAINT "validations_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validations" ADD CONSTRAINT "validations_currentApproverId_fkey" FOREIGN KEY ("currentApproverId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validations" ADD CONSTRAINT "validations_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delegations" ADD CONSTRAINT "delegations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delegations" ADD CONSTRAINT "delegations_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delegations" ADD CONSTRAINT "delegations_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
