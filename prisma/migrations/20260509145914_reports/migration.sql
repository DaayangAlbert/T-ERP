-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('EXECUTIVE_SUMMARY', 'MONTHLY_DASHBOARD', 'ANNUAL_GROUP', 'QUARTERLY_NOTE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('DRAFT', 'GENERATED', 'PUBLISHED', 'ARCHIVED', 'SCHEDULED');

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "type" "ReportType" NOT NULL,
    "title" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "parameters" JSONB NOT NULL,
    "blocks" JSONB NOT NULL,
    "data" JSONB NOT NULL,
    "pdfUrl" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'GENERATED',
    "scheduledRule" TEXT,
    "recipients" JSONB,
    "generatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reports_tenantId_type_idx" ON "reports"("tenantId", "type");

-- CreateIndex
CREATE INDEX "reports_tenantId_status_idx" ON "reports"("tenantId", "status");

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
