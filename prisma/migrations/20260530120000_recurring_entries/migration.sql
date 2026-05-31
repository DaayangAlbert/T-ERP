-- Modèles d'écritures récurrentes (loyers, abonnements, provisions mensuelles).
CREATE TABLE IF NOT EXISTS "recurring_entries" (
  "id"            TEXT NOT NULL PRIMARY KEY,
  "tenantId"      TEXT NOT NULL,
  "label"         TEXT NOT NULL,
  "journalCode"   TEXT NOT NULL,
  "description"   TEXT NOT NULL,
  "lines"         JSONB NOT NULL DEFAULT '[]',
  "active"        BOOLEAN NOT NULL DEFAULT true,
  "dayOfMonth"    INTEGER,
  "lastRunAt"     TIMESTAMP(3),
  "lastRunPeriod" TEXT,
  "createdById"   TEXT NOT NULL,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL
);
CREATE INDEX IF NOT EXISTS "recurring_entries_tenantId_active_idx" ON "recurring_entries"("tenantId", "active");
