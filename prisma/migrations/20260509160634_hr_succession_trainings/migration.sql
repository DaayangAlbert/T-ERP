-- CreateEnum
CREATE TYPE "SuccessionStatus" AS ENUM ('IDENTIFIED', 'AT_RISK', 'NONE', 'READY_NOW');

-- CreateEnum
CREATE TYPE "TrainingStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "succession_plans" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "positionTitle" TEXT NOT NULL,
    "incumbentId" TEXT NOT NULL,
    "successorId" TEXT,
    "readyInMonths" INTEGER,
    "status" "SuccessionStatus" NOT NULL DEFAULT 'NONE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "succession_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trainings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "provider" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "cost" BIGINT,
    "status" "TrainingStatus" NOT NULL DEFAULT 'PLANNED',
    "certificateUrl" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trainings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_indicators" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "indicators" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_indicators_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "succession_plans_tenantId_status_idx" ON "succession_plans"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "succession_plans_tenantId_positionTitle_key" ON "succession_plans"("tenantId", "positionTitle");

-- CreateIndex
CREATE INDEX "trainings_tenantId_status_idx" ON "trainings"("tenantId", "status");

-- CreateIndex
CREATE INDEX "trainings_tenantId_expiresAt_idx" ON "trainings"("tenantId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "social_indicators_tenantId_period_key" ON "social_indicators"("tenantId", "period");

-- AddForeignKey
ALTER TABLE "succession_plans" ADD CONSTRAINT "succession_plans_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "succession_plans" ADD CONSTRAINT "succession_plans_incumbentId_fkey" FOREIGN KEY ("incumbentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "succession_plans" ADD CONSTRAINT "succession_plans_successorId_fkey" FOREIGN KEY ("successorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainings" ADD CONSTRAINT "trainings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainings" ADD CONSTRAINT "trainings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_indicators" ADD CONSTRAINT "social_indicators_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
