-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ReportType" ADD VALUE 'RH_MONTHLY';
ALTER TYPE "ReportType" ADD VALUE 'RH_SOCIAL_ANNUAL';
ALTER TYPE "ReportType" ADD VALUE 'RH_GENDER_EQUALITY';
ALTER TYPE "ReportType" ADD VALUE 'RH_WEEKLY_DASHBOARD';
ALTER TYPE "ReportType" ADD VALUE 'RH_RECRUITMENT_QUARTERLY';
ALTER TYPE "ReportType" ADD VALUE 'RH_SOCIAL_INDICATORS';
