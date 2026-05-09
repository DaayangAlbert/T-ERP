-- CreateEnum
CREATE TYPE "BoardReportType" AS ENUM ('MONTHLY', 'QUARTERLY', 'ANNUAL', 'EXTRAORDINARY');

-- CreateEnum
CREATE TYPE "BoardReportStatus" AS ENUM ('DRAFT', 'GENERATED', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "board_reports" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "type" "BoardReportType" NOT NULL,
    "period" TEXT NOT NULL,
    "boardDate" TIMESTAMP(3) NOT NULL,
    "chapters" JSONB NOT NULL,
    "comments" JSONB NOT NULL,
    "data" JSONB NOT NULL,
    "pdfUrl" TEXT,
    "status" "BoardReportStatus" NOT NULL DEFAULT 'DRAFT',
    "sentTo" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "board_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "board_reports_tenantId_type_period_idx" ON "board_reports"("tenantId", "type", "period");

-- CreateIndex
CREATE INDEX "board_reports_tenantId_status_idx" ON "board_reports"("tenantId", "status");

-- AddForeignKey
ALTER TABLE "board_reports" ADD CONSTRAINT "board_reports_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_reports" ADD CONSTRAINT "board_reports_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
