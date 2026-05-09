-- CreateEnum
CREATE TYPE "PeriodStatus" AS ENUM ('OPEN', 'CLOSING', 'CLOSED', 'LOCKED');

-- CreateEnum
CREATE TYPE "ClosureStatus" AS ENUM ('IN_PROGRESS', 'PENDING_DG_VALIDATION', 'VALIDATED', 'SUBMITTED');

-- CreateTable
CREATE TABLE "accounting_periods" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "status" "PeriodStatus" NOT NULL DEFAULT 'OPEN',
    "closedAt" TIMESTAMP(3),
    "closedBy" TEXT,
    "totalEntries" INTEGER NOT NULL DEFAULT 0,
    "totalDebit" BIGINT NOT NULL DEFAULT 0,
    "totalCredit" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounting_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting_entries" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "journal" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "totalDebit" BIGINT NOT NULL,
    "totalCredit" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accounting_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting_lines" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "account" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "debit" BIGINT NOT NULL DEFAULT 0,
    "credit" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "accounting_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "annual_closures" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fiscalYear" INTEGER NOT NULL,
    "status" "ClosureStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "pnlValidated" BOOLEAN NOT NULL DEFAULT false,
    "balanceValidated" BOOLEAN NOT NULL DEFAULT false,
    "adjustmentsValidated" BOOLEAN NOT NULL DEFAULT false,
    "draftGenerated" BOOLEAN NOT NULL DEFAULT false,
    "adjustments" JSONB NOT NULL DEFAULT '[]',
    "dgValidatedAt" TIMESTAMP(3),
    "dgValidatedBy" TEXT,
    "submittedToDgi" BOOLEAN NOT NULL DEFAULT false,
    "dsfFileUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "annual_closures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "accounting_periods_tenantId_period_key" ON "accounting_periods"("tenantId", "period");

-- CreateIndex
CREATE INDEX "accounting_entries_tenantId_period_idx" ON "accounting_entries"("tenantId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "accounting_entries_tenantId_reference_key" ON "accounting_entries"("tenantId", "reference");

-- CreateIndex
CREATE INDEX "accounting_lines_account_idx" ON "accounting_lines"("account");

-- CreateIndex
CREATE UNIQUE INDEX "annual_closures_tenantId_fiscalYear_key" ON "annual_closures"("tenantId", "fiscalYear");

-- AddForeignKey
ALTER TABLE "accounting_periods" ADD CONSTRAINT "accounting_periods_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_entries" ADD CONSTRAINT "accounting_entries_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_lines" ADD CONSTRAINT "accounting_lines_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "accounting_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "annual_closures" ADD CONSTRAINT "annual_closures_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
