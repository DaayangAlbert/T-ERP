-- CreateEnum
CREATE TYPE "ObjectiveCategory" AS ENUM ('FINANCIAL', 'COMMERCIAL', 'HR', 'HSE', 'STRATEGIC');

-- CreateEnum
CREATE TYPE "ObjectivePeriod" AS ENUM ('ANNUAL', 'QUARTERLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "ObjectiveStatus" AS ENUM ('IN_PROGRESS', 'AT_RISK', 'ACHIEVED', 'MISSED', 'CANCELLED');

-- CreateTable
CREATE TABLE "objectives" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "category" "ObjectiveCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "targetValue" DOUBLE PRECISION NOT NULL,
    "actualValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL,
    "period" "ObjectivePeriod" NOT NULL,
    "year" INTEGER NOT NULL,
    "quarter" INTEGER,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "status" "ObjectiveStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "objectives_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "objectives_tenantId_year_period_idx" ON "objectives"("tenantId", "year", "period");

-- CreateIndex
CREATE INDEX "objectives_ownerId_year_idx" ON "objectives"("ownerId", "year");

-- AddForeignKey
ALTER TABLE "objectives" ADD CONSTRAINT "objectives_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objectives" ADD CONSTRAINT "objectives_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
