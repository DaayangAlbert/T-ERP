-- OUV fn 1.8 — Prêts d'outils ouvrier (demande + prêt en cours + retour)

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ToolLoanStatus') THEN
    CREATE TYPE "ToolLoanStatus" AS ENUM (
      'REQUESTED',
      'ISSUED',
      'RETURNED',
      'OVERDUE',
      'LOST',
      'CANCELLED'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "tool_loans" (
  "id"            TEXT NOT NULL,
  "tenantId"      TEXT NOT NULL,
  "userId"        TEXT NOT NULL,
  "toolName"      TEXT NOT NULL,
  "toolCategory"  TEXT,
  "serialNumber"  TEXT,
  "status"        "ToolLoanStatus" NOT NULL DEFAULT 'REQUESTED',
  "requestedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "requestReason" TEXT,
  "issuedAt"      TIMESTAMP(3),
  "issuedById"    TEXT,
  "dueDate"       TIMESTAMP(3),
  "isPermanent"   BOOLEAN NOT NULL DEFAULT false,
  "returnedAt"    TIMESTAMP(3),
  "notes"         TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tool_loans_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "tool_loans_tenantId_status_idx" ON "tool_loans"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "tool_loans_userId_status_idx" ON "tool_loans"("userId", "status");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tool_loans_tenantId_fkey') THEN
    ALTER TABLE "tool_loans"
      ADD CONSTRAINT "tool_loans_tenantId_fkey"
        FOREIGN KEY ("tenantId") REFERENCES "tenants"("id")
        ON DELETE CASCADE ON UPDATE CASCADE,
      ADD CONSTRAINT "tool_loans_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "users"("id")
        ON DELETE CASCADE ON UPDATE CASCADE,
      ADD CONSTRAINT "tool_loans_issuedById_fkey"
        FOREIGN KEY ("issuedById") REFERENCES "users"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
