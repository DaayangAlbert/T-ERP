-- Financement du marché : type (simple / conjoint), répartition du montant HT
-- par source de financement, taux TVA et IR, et délai d'exécution en mois.

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "FinancingType" AS ENUM ('SINGLE', 'JOINT');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- AlterTable
ALTER TABLE "sites" ADD COLUMN IF NOT EXISTS "financingType" "FinancingType" NOT NULL DEFAULT 'SINGLE';
ALTER TABLE "sites" ADD COLUMN IF NOT EXISTS "financings" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "sites" ADD COLUMN IF NOT EXISTS "vatRate" DOUBLE PRECISION NOT NULL DEFAULT 19.25;
ALTER TABLE "sites" ADD COLUMN IF NOT EXISTS "irRate" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "sites" ADD COLUMN IF NOT EXISTS "durationMonths" INTEGER;
