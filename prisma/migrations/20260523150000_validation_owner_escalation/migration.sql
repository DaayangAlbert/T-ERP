-- Escalade des validations au Propriétaire / PCA. Colonnes additives, nullable.
ALTER TABLE "validations"
  ADD COLUMN IF NOT EXISTS "ownerEscalatedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "ownerEscalatedById" TEXT,
  ADD COLUMN IF NOT EXISTS "ownerDecision" TEXT,
  ADD COLUMN IF NOT EXISTS "ownerDecisionAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "ownerDecisionById" TEXT,
  ADD COLUMN IF NOT EXISTS "ownerDecisionReason" TEXT;
