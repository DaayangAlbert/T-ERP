-- CreateEnum
CREATE TYPE "CptDirection" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "ProjectAccountEntryType" AS ENUM ('FUNDING', 'EXPENSE', 'PROJECT_SALARY', 'OVERHEAD_SALARY', 'REVENUE', 'REPAYMENT', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "OverheadRunStatus" AS ENUM ('PENDING', 'APPLIED', 'CANCELLED');

-- CreateTable
CREATE TABLE "cpt_project_accounts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "bankAccountId" TEXT,
    "balance" BIGINT NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cpt_project_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cpt_project_account_movements" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "type" "ProjectAccountEntryType" NOT NULL,
    "direction" "CptDirection" NOT NULL,
    "amount" BIGINT NOT NULL,
    "reason" TEXT NOT NULL,
    "reference" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "balanceAfter" BIGINT NOT NULL,
    "recordedById" TEXT NOT NULL,
    "overheadRunId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cpt_project_account_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cpt_salary_accounts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "bankAccountId" TEXT,
    "balance" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cpt_salary_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cpt_salary_account_movements" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "direction" "CptDirection" NOT NULL,
    "amount" BIGINT NOT NULL,
    "reason" TEXT NOT NULL,
    "reference" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "balanceAfter" BIGINT NOT NULL,
    "siteId" TEXT,
    "recordedById" TEXT NOT NULL,
    "overheadRunId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cpt_salary_account_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cpt_overhead_runs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "totalAmount" BIGINT NOT NULL,
    "basis" JSONB NOT NULL,
    "status" "OverheadRunStatus" NOT NULL DEFAULT 'PENDING',
    "executedById" TEXT,
    "executedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cpt_overhead_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cpt_project_accounts_siteId_key" ON "cpt_project_accounts"("siteId");

-- CreateIndex
CREATE INDEX "cpt_project_accounts_tenantId_idx" ON "cpt_project_accounts"("tenantId");

-- CreateIndex
CREATE INDEX "cpt_project_account_movements_accountId_occurredAt_idx" ON "cpt_project_account_movements"("accountId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "cpt_salary_accounts_tenantId_key" ON "cpt_salary_accounts"("tenantId");

-- CreateIndex
CREATE INDEX "cpt_salary_account_movements_accountId_occurredAt_idx" ON "cpt_salary_account_movements"("accountId", "occurredAt");

-- CreateIndex
CREATE INDEX "cpt_overhead_runs_tenantId_idx" ON "cpt_overhead_runs"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "cpt_overhead_runs_tenantId_period_key" ON "cpt_overhead_runs"("tenantId", "period");

-- AddForeignKey
ALTER TABLE "cpt_project_accounts" ADD CONSTRAINT "cpt_project_accounts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cpt_project_accounts" ADD CONSTRAINT "cpt_project_accounts_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cpt_project_accounts" ADD CONSTRAINT "cpt_project_accounts_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cpt_project_account_movements" ADD CONSTRAINT "cpt_project_account_movements_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "cpt_project_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cpt_project_account_movements" ADD CONSTRAINT "cpt_project_account_movements_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cpt_project_account_movements" ADD CONSTRAINT "cpt_project_account_movements_overheadRunId_fkey" FOREIGN KEY ("overheadRunId") REFERENCES "cpt_overhead_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cpt_salary_accounts" ADD CONSTRAINT "cpt_salary_accounts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cpt_salary_accounts" ADD CONSTRAINT "cpt_salary_accounts_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cpt_salary_account_movements" ADD CONSTRAINT "cpt_salary_account_movements_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "cpt_salary_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cpt_salary_account_movements" ADD CONSTRAINT "cpt_salary_account_movements_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cpt_salary_account_movements" ADD CONSTRAINT "cpt_salary_account_movements_overheadRunId_fkey" FOREIGN KEY ("overheadRunId") REFERENCES "cpt_overhead_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cpt_overhead_runs" ADD CONSTRAINT "cpt_overhead_runs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cpt_overhead_runs" ADD CONSTRAINT "cpt_overhead_runs_executedById_fkey" FOREIGN KEY ("executedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
