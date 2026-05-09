-- CreateEnum
CREATE TYPE "CommitmentType" AS ENUM ('BANK_GUARANTEE', 'FIRST_DEMAND_GUARANTEE', 'LETTER_CREDIT', 'PURCHASE_COMMITMENT');

-- CreateEnum
CREATE TYPE "CommitmentStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'RELEASED', 'CALLED');

-- CreateTable
CREATE TABLE "financial_periods" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "pnl" JSONB NOT NULL,
    "balance" JSONB NOT NULL,
    "bfr" JSONB NOT NULL,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_commitments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "CommitmentType" NOT NULL,
    "reference" TEXT,
    "bank" TEXT,
    "beneficiary" TEXT,
    "amount" BIGINT NOT NULL,
    "siteId" TEXT,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "maturityDate" TIMESTAMP(3) NOT NULL,
    "status" "CommitmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_commitments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_accounts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "bank" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountType" TEXT NOT NULL DEFAULT 'CURRENT',
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "balance" BIGINT NOT NULL,
    "creditLineGranted" BIGINT NOT NULL DEFAULT 0,
    "creditLineUsed" BIGINT NOT NULL DEFAULT 0,
    "renewalDate" TIMESTAMP(3),
    "contact" JSONB,
    "history12m" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "financial_periods_tenantId_period_idx" ON "financial_periods"("tenantId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "financial_periods_tenantId_period_key" ON "financial_periods"("tenantId", "period");

-- CreateIndex
CREATE INDEX "financial_commitments_tenantId_status_idx" ON "financial_commitments"("tenantId", "status");

-- CreateIndex
CREATE INDEX "financial_commitments_tenantId_type_idx" ON "financial_commitments"("tenantId", "type");

-- CreateIndex
CREATE INDEX "bank_accounts_tenantId_idx" ON "bank_accounts"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "bank_accounts_tenantId_accountNumber_key" ON "bank_accounts"("tenantId", "accountNumber");

-- AddForeignKey
ALTER TABLE "financial_periods" ADD CONSTRAINT "financial_periods_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_commitments" ADD CONSTRAINT "financial_commitments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
