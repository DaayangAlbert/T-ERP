-- CreateEnum
CREATE TYPE "ReconciliationStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'VALIDATED');

-- CreateEnum
CREATE TYPE "ClosingStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'READY', 'CLOSED');

-- CreateEnum
CREATE TYPE "SupplierCommitmentStatus" AS ENUM ('ACTIVE', 'PARTIAL_DELIVERY', 'FULFILLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EntryStatus" AS ENUM ('DRAFT', 'VALIDATED', 'LOCKED', 'REVERSED');

-- AlterTable
ALTER TABLE "accounting_entries" ADD COLUMN     "dafValidatedAt" TIMESTAMP(3),
ADD COLUMN     "dafValidatedBy" TEXT,
ADD COLUMN     "enteredBy" TEXT,
ADD COLUMN     "requiresDafValidation" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "status" "EntryStatus" NOT NULL DEFAULT 'VALIDATED',
ADD COLUMN     "validatedByDaf" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "suppliers" ADD COLUMN     "financialRating" TEXT,
ADD COLUMN     "financialRatingSource" TEXT,
ADD COLUMN     "incidentsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "paymentTermsActual" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "paymentTermsContract" INTEGER NOT NULL DEFAULT 45;

-- CreateTable
CREATE TABLE "bank_reconciliations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "bookBalance" BIGINT NOT NULL,
    "bankBalance" BIGINT NOT NULL,
    "gap" BIGINT NOT NULL DEFAULT 0,
    "reconciledItems" JSONB NOT NULL DEFAULT '[]',
    "status" "ReconciliationStatus" NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_reconciliations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_closings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "items" JSONB NOT NULL DEFAULT '[]',
    "status" "ClosingStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_closings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_variances" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "costCenter" TEXT NOT NULL,
    "budgetAmount" BIGINT NOT NULL,
    "actualAmount" BIGINT NOT NULL,
    "variance" BIGINT NOT NULL DEFAULT 0,
    "variancePercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "comment" TEXT,
    "commentAuthor" TEXT,
    "commentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budget_variances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_scenarios" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parameters" JSONB NOT NULL,
    "results" JSONB NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_scenarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_commitments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "poRef" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "deliveredAmount" BIGINT NOT NULL DEFAULT 0,
    "invoicedAmount" BIGINT NOT NULL DEFAULT 0,
    "expectedDeliveryDate" TIMESTAMP(3),
    "status" "SupplierCommitmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_commitments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bank_reconciliations_tenantId_status_idx" ON "bank_reconciliations"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "bank_reconciliations_tenantId_bankAccountId_period_key" ON "bank_reconciliations"("tenantId", "bankAccountId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_closings_tenantId_period_key" ON "monthly_closings"("tenantId", "period");

-- CreateIndex
CREATE INDEX "budget_variances_tenantId_period_idx" ON "budget_variances"("tenantId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "budget_variances_tenantId_period_costCenter_key" ON "budget_variances"("tenantId", "period", "costCenter");

-- CreateIndex
CREATE INDEX "financial_scenarios_tenantId_idx" ON "financial_scenarios"("tenantId");

-- CreateIndex
CREATE INDEX "supplier_commitments_tenantId_status_idx" ON "supplier_commitments"("tenantId", "status");

-- CreateIndex
CREATE INDEX "supplier_commitments_supplierId_idx" ON "supplier_commitments"("supplierId");

-- CreateIndex
CREATE INDEX "accounting_entries_tenantId_status_idx" ON "accounting_entries"("tenantId", "status");

-- AddForeignKey
ALTER TABLE "supplier_commitments" ADD CONSTRAINT "supplier_commitments_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
