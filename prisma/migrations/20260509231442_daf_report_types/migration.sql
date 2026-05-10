-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ReportType" ADD VALUE 'DAF_TREASURY_WEEKLY';
ALTER TYPE "ReportType" ADD VALUE 'DAF_FINANCIAL_MONTHLY';
ALTER TYPE "ReportType" ADD VALUE 'DAF_BANKING_QUARTERLY';
ALTER TYPE "ReportType" ADD VALUE 'DAF_CAC_QUARTERLY';
ALTER TYPE "ReportType" ADD VALUE 'DAF_DSF_PREP';
