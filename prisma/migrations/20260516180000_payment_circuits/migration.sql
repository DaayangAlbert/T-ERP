-- Circuits de paiement DAF — workflow administratif côté client
-- (marchés publics CM : Comptable Min → Contrôleur Financier → Payeur → ACCT).
--
-- 5 nouvelles tables + 1 enum. Migration idempotente.

-- 1) Enum PaymentStepStatus.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentStepStatus') THEN
    CREATE TYPE "PaymentStepStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'VALIDATED', 'BLOCKED');
  END IF;
END $$;

-- 2) Templates de circuits (par marché/client).
CREATE TABLE IF NOT EXISTS "payment_circuit_templates" (
  "id"          TEXT NOT NULL,
  "tenantId"    TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "clientName"  TEXT NOT NULL,
  "description" TEXT,
  "createdById" TEXT NOT NULL,
  "archivedAt"  TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,

  CONSTRAINT "payment_circuit_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "payment_circuit_templates_tenantId_name_key"
  ON "payment_circuit_templates"("tenantId", "name");
CREATE INDEX IF NOT EXISTS "payment_circuit_templates_tenantId_clientName_idx"
  ON "payment_circuit_templates"("tenantId", "clientName");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_circuit_templates_tenantId_fkey') THEN
    ALTER TABLE "payment_circuit_templates"
      ADD CONSTRAINT "payment_circuit_templates_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_circuit_templates_createdById_fkey') THEN
    ALTER TABLE "payment_circuit_templates"
      ADD CONSTRAINT "payment_circuit_templates_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- 3) Étapes du template (Comptable Min, Contrôleur Financier, ...).
CREATE TABLE IF NOT EXISTS "payment_circuit_template_steps" (
  "id"            TEXT NOT NULL,
  "templateId"    TEXT NOT NULL,
  "order"         INTEGER NOT NULL,
  "label"         TEXT NOT NULL,
  "description"   TEXT,
  "contactName"   TEXT,
  "contactRole"   TEXT,
  "contactPhone"  TEXT,
  "contactEmail"  TEXT,
  "estimatedDays" INTEGER,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL,

  CONSTRAINT "payment_circuit_template_steps_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "payment_circuit_template_steps_templateId_order_key"
  ON "payment_circuit_template_steps"("templateId", "order");
CREATE INDEX IF NOT EXISTS "payment_circuit_template_steps_templateId_idx"
  ON "payment_circuit_template_steps"("templateId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_circuit_template_steps_templateId_fkey') THEN
    ALTER TABLE "payment_circuit_template_steps"
      ADD CONSTRAINT "payment_circuit_template_steps_templateId_fkey"
      FOREIGN KEY ("templateId") REFERENCES "payment_circuit_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- 4) Instances de circuit (1 par Receivable).
CREATE TABLE IF NOT EXISTS "payment_tracks" (
  "id"           TEXT NOT NULL,
  "receivableId" TEXT NOT NULL,
  "templateId"   TEXT NOT NULL,
  "assignedToId" TEXT,
  "startedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt"  TIMESTAMP(3),
  "createdById"  TEXT NOT NULL,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL,

  CONSTRAINT "payment_tracks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "payment_tracks_receivableId_key"
  ON "payment_tracks"("receivableId");
CREATE INDEX IF NOT EXISTS "payment_tracks_assignedToId_idx"
  ON "payment_tracks"("assignedToId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_tracks_receivableId_fkey') THEN
    ALTER TABLE "payment_tracks"
      ADD CONSTRAINT "payment_tracks_receivableId_fkey"
      FOREIGN KEY ("receivableId") REFERENCES "receivables"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_tracks_templateId_fkey') THEN
    ALTER TABLE "payment_tracks"
      ADD CONSTRAINT "payment_tracks_templateId_fkey"
      FOREIGN KEY ("templateId") REFERENCES "payment_circuit_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_tracks_assignedToId_fkey') THEN
    ALTER TABLE "payment_tracks"
      ADD CONSTRAINT "payment_tracks_assignedToId_fkey"
      FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_tracks_createdById_fkey') THEN
    ALTER TABLE "payment_tracks"
      ADD CONSTRAINT "payment_tracks_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- 5) État de chaque étape pour un track donné.
CREATE TABLE IF NOT EXISTS "payment_track_steps" (
  "id"             TEXT NOT NULL,
  "trackId"        TEXT NOT NULL,
  "templateStepId" TEXT NOT NULL,
  "order"          INTEGER NOT NULL,
  "label"          TEXT NOT NULL,
  "status"         "PaymentStepStatus" NOT NULL DEFAULT 'PENDING',
  "validatedAt"    TIMESTAMP(3),
  "validatedById"  TEXT,
  "blockedReason"  TEXT,
  "blockedSince"   TIMESTAMP(3),
  "blockedById"    TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,

  CONSTRAINT "payment_track_steps_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "payment_track_steps_trackId_order_key"
  ON "payment_track_steps"("trackId", "order");
CREATE INDEX IF NOT EXISTS "payment_track_steps_trackId_status_idx"
  ON "payment_track_steps"("trackId", "status");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_track_steps_trackId_fkey') THEN
    ALTER TABLE "payment_track_steps"
      ADD CONSTRAINT "payment_track_steps_trackId_fkey"
      FOREIGN KEY ("trackId") REFERENCES "payment_tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_track_steps_templateStepId_fkey') THEN
    ALTER TABLE "payment_track_steps"
      ADD CONSTRAINT "payment_track_steps_templateStepId_fkey"
      FOREIGN KEY ("templateStepId") REFERENCES "payment_circuit_template_steps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_track_steps_validatedById_fkey') THEN
    ALTER TABLE "payment_track_steps"
      ADD CONSTRAINT "payment_track_steps_validatedById_fkey"
      FOREIGN KEY ("validatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_track_steps_blockedById_fkey') THEN
    ALTER TABLE "payment_track_steps"
      ADD CONSTRAINT "payment_track_steps_blockedById_fkey"
      FOREIGN KEY ("blockedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- 6) Documents demandés pour débloquer une étape.
CREATE TABLE IF NOT EXISTS "payment_track_step_documents" (
  "id"           TEXT NOT NULL,
  "stepId"       TEXT NOT NULL,
  "label"        TEXT NOT NULL,
  "provided"     BOOLEAN NOT NULL DEFAULT false,
  "providedAt"   TIMESTAMP(3),
  "providedById" TEXT,
  "providedNote" TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL,

  CONSTRAINT "payment_track_step_documents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "payment_track_step_documents_stepId_provided_idx"
  ON "payment_track_step_documents"("stepId", "provided");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_track_step_documents_stepId_fkey') THEN
    ALTER TABLE "payment_track_step_documents"
      ADD CONSTRAINT "payment_track_step_documents_stepId_fkey"
      FOREIGN KEY ("stepId") REFERENCES "payment_track_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_track_step_documents_providedById_fkey') THEN
    ALTER TABLE "payment_track_step_documents"
      ADD CONSTRAINT "payment_track_step_documents_providedById_fkey"
      FOREIGN KEY ("providedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
