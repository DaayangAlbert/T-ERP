-- Sync 9 colonnes Payslip qui étaient dans le schema Prisma mais jamais
-- migrées en DB. Cause : sessions précédentes ont étendu le modèle Payslip
-- (vérification, payroll cycles, snapshots) sans créer de migration.
-- Symptôme : /api/dashboard/dg → 500 PrismaClientKnownRequestError P2022.
-- Fix : appliqué via `prisma db push` puis ce fichier formalise pour prod.

-- Liens vers PayrollCycle et PayrollEmployeeSnapshot
ALTER TABLE "payslips"
  ADD COLUMN "payrollCycleId" TEXT,
  ADD COLUMN "snapshotId" TEXT;

-- Système de vérification publique (QR code + URL signée)
ALTER TABLE "payslips"
  ADD COLUMN "verificationUuid" TEXT,
  ADD COLUMN "verificationCode" TEXT,
  ADD COLUMN "verificationHash" TEXT,
  ADD COLUMN "verifiedPublicUrl" TEXT;

-- Lifecycle : émission, annulation, remplacement
ALTER TABLE "payslips"
  ADD COLUMN "issuedAt" TIMESTAMP(3),
  ADD COLUMN "cancelledAt" TIMESTAMP(3),
  ADD COLUMN "replacedById" TEXT;

-- Index unique sur verificationUuid (lookup rapide par QR code public)
CREATE UNIQUE INDEX "payslips_verificationUuid_key" ON "payslips"("verificationUuid");

-- Index sur payrollCycleId (filtre fréquent "tous les bulletins du cycle X")
CREATE INDEX "payslips_payrollCycleId_idx" ON "payslips"("payrollCycleId");

-- Foreign keys
ALTER TABLE "payslips"
  ADD CONSTRAINT "payslips_payrollCycleId_fkey"
    FOREIGN KEY ("payrollCycleId") REFERENCES "payroll_cycles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "payslips"
  ADD CONSTRAINT "payslips_snapshotId_fkey"
    FOREIGN KEY ("snapshotId") REFERENCES "payroll_employee_snapshots"("id") ON DELETE SET NULL ON UPDATE CASCADE;
