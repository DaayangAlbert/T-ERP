-- OUV fn 1.4 — Attestations RH demandées par l'ouvrier
-- (salaire, travail, présence, congé pris). RH prépare le PDF signé
-- sous 48 h ouvrées et l'upload sur R2.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AttestationType') THEN
    CREATE TYPE "AttestationType" AS ENUM (
      'SALARY',
      'EMPLOYMENT',
      'PRESENCE',
      'LEAVE_TAKEN',
      'OTHER'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AttestationStatus') THEN
    CREATE TYPE "AttestationStatus" AS ENUM (
      'PENDING',
      'IN_PREPARATION',
      'READY',
      'DELIVERED',
      'REJECTED',
      'CANCELLED'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "attestation_requests" (
  "id"              TEXT NOT NULL,
  "tenantId"        TEXT NOT NULL,
  "userId"          TEXT NOT NULL,
  "type"            "AttestationType" NOT NULL,
  "purpose"         TEXT,
  "status"          "AttestationStatus" NOT NULL DEFAULT 'PENDING',
  "preparedById"    TEXT,
  "preparedAt"      TIMESTAMP(3),
  "documentUrl"     TEXT,
  "expectedReadyAt" TIMESTAMP(3),
  "rejectionReason" TEXT,
  "deliveredAt"     TIMESTAMP(3),
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,
  CONSTRAINT "attestation_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "attestation_requests_tenantId_status_idx"
  ON "attestation_requests"("tenantId", "status");

CREATE INDEX IF NOT EXISTS "attestation_requests_userId_createdAt_idx"
  ON "attestation_requests"("userId", "createdAt");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'attestation_requests_tenantId_fkey') THEN
    ALTER TABLE "attestation_requests"
      ADD CONSTRAINT "attestation_requests_tenantId_fkey"
        FOREIGN KEY ("tenantId") REFERENCES "tenants"("id")
        ON DELETE CASCADE ON UPDATE CASCADE,
      ADD CONSTRAINT "attestation_requests_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "users"("id")
        ON DELETE CASCADE ON UPDATE CASCADE,
      ADD CONSTRAINT "attestation_requests_preparedById_fkey"
        FOREIGN KEY ("preparedById") REFERENCES "users"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
