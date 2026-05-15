-- HISTORIQUE — cette migration était à l'origine 20260513030000 et précédait
-- 20260513103000_payroll_generation. Problème : elle référençait des FK vers
-- payroll_cycles / payroll_employee_snapshots qui ne sont créées que dans
-- 20260513103000_payroll_generation → shadow DB plante en replay d'historique.
--
-- Fix : renommée 20260513104000 pour passer APRÈS payroll_generation, puis
-- contenu rendu idempotent (IF NOT EXISTS, DO blocks pour FK déjà créées par
-- payroll_generation). Sur fresh DB, ce fichier devient un no-op ; sur DB
-- ayant déjà appliqué l'ancienne 20260513030000, il revérifie l'état attendu.
--
-- Cohérent pour : fresh dev, dev existant (déjà patché via prisma db push),
-- prod (qui doit être migrée via prisma migrate resolve si nécessaire).

-- Colonnes payslips : ajoutées par 20260513103000_payroll_generation (3-11)
-- + 20260514000000_ouvrier_bloc0 indirect. On les revérifie sans erreur.
ALTER TABLE "payslips" ADD COLUMN IF NOT EXISTS "payrollCycleId" TEXT;
ALTER TABLE "payslips" ADD COLUMN IF NOT EXISTS "snapshotId" TEXT;
ALTER TABLE "payslips" ADD COLUMN IF NOT EXISTS "verificationUuid" TEXT;
ALTER TABLE "payslips" ADD COLUMN IF NOT EXISTS "verificationCode" TEXT;
ALTER TABLE "payslips" ADD COLUMN IF NOT EXISTS "verificationHash" TEXT;
ALTER TABLE "payslips" ADD COLUMN IF NOT EXISTS "verifiedPublicUrl" TEXT;
ALTER TABLE "payslips" ADD COLUMN IF NOT EXISTS "issuedAt" TIMESTAMP(3);
ALTER TABLE "payslips" ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3);
ALTER TABLE "payslips" ADD COLUMN IF NOT EXISTS "replacedById" TEXT;

-- Indexes idempotents
CREATE UNIQUE INDEX IF NOT EXISTS "payslips_verificationUuid_key" ON "payslips"("verificationUuid");
CREATE INDEX IF NOT EXISTS "payslips_payrollCycleId_idx" ON "payslips"("payrollCycleId");

-- FKs : PostgreSQL ne supporte pas IF NOT EXISTS sur ADD CONSTRAINT → DO block
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payslips_payrollCycleId_fkey'
  ) THEN
    ALTER TABLE "payslips"
      ADD CONSTRAINT "payslips_payrollCycleId_fkey"
        FOREIGN KEY ("payrollCycleId") REFERENCES "payroll_cycles"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payslips_snapshotId_fkey'
  ) THEN
    ALTER TABLE "payslips"
      ADD CONSTRAINT "payslips_snapshotId_fkey"
        FOREIGN KEY ("snapshotId") REFERENCES "payroll_employee_snapshots"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
