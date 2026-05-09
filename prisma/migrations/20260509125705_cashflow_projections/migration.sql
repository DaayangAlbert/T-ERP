-- CreateEnum
CREATE TYPE "CashFlowType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateTable
CREATE TABLE "cashflow_projections" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "CashFlowType" NOT NULL,
    "category" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "expectedDate" TIMESTAMP(3) NOT NULL,
    "probability" INTEGER NOT NULL DEFAULT 100,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "realized" BOOLEAN NOT NULL DEFAULT false,
    "realizedDate" TIMESTAMP(3),
    "realizedAmount" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cashflow_projections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cashflow_projections_tenantId_expectedDate_idx" ON "cashflow_projections"("tenantId", "expectedDate");

-- CreateIndex
CREATE INDEX "cashflow_projections_tenantId_type_expectedDate_idx" ON "cashflow_projections"("tenantId", "type", "expectedDate");

-- AddForeignKey
ALTER TABLE "cashflow_projections" ADD CONSTRAINT "cashflow_projections_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
