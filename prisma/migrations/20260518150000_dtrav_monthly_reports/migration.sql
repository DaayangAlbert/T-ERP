-- Module DTrav — Rapport synthétique mensuel vers DG

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DtravMonthlyReportStatus') THEN
    CREATE TYPE "DtravMonthlyReportStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'VALIDATED', 'REJECTED');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS "dtrav_monthly_reports" (
  "id"                       TEXT PRIMARY KEY,
  "tenantId"                 TEXT NOT NULL,
  "authorId"                 TEXT NOT NULL,

  "period"                   TIMESTAMP(3) NOT NULL,
  "periodLabel"              TEXT,
  "status"                   "DtravMonthlyReportStatus" NOT NULL DEFAULT 'DRAFT',

  "revenueProducedXAF"       BIGINT NOT NULL DEFAULT 0,
  "revenueDeliveredXAF"      BIGINT NOT NULL DEFAULT 0,
  "marginPercent"            DOUBLE PRECISION NOT NULL DEFAULT 0,
  "sitesDelivered"           INTEGER NOT NULL DEFAULT 0,

  "receivablesXAF"           BIGINT NOT NULL DEFAULT 0,
  "overdueReceivablesXAF"    BIGINT NOT NULL DEFAULT 0,
  "dso"                      INTEGER NOT NULL DEFAULT 0,
  "decompteIssuedCount"      INTEGER NOT NULL DEFAULT 0,
  "decompteIssuedXAF"        BIGINT NOT NULL DEFAULT 0,

  "amendmentsCount"          INTEGER NOT NULL DEFAULT 0,
  "penaltiesAppliedXAF"      BIGINT NOT NULL DEFAULT 0,
  "litigationsOpen"          INTEGER NOT NULL DEFAULT 0,

  "cdtCount"                 INTEGER NOT NULL DEFAULT 0,
  "cdtReportsValidated"      INTEGER NOT NULL DEFAULT 0,
  "cdtUnderperforming"       INTEGER NOT NULL DEFAULT 0,

  "workforceTotal"           INTEGER NOT NULL DEFAULT 0,
  "workforceOvertimeHours"   DOUBLE PRECISION NOT NULL DEFAULT 0,
  "workforceCostXAF"         BIGINT NOT NULL DEFAULT 0,

  "executiveSummary"         TEXT,
  "productionAnalysis"       TEXT,
  "collectionsAnalysis"      TEXT,
  "contractualSituation"     TEXT,
  "cdtPerformance"           TEXT,
  "workforceAnalysis"        TEXT,
  "majorIssues"              TEXT,
  "arbitragesRequested"      TEXT,
  "nextMonthStrategy"        TEXT,

  "submittedAt"              TIMESTAMP(3),
  "validatedById"            TEXT,
  "validatedAt"              TIMESTAMP(3),
  "rejectionReason"          TEXT,

  "pdfUrl"                   TEXT,

  "createdAt"                TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"                TIMESTAMP(3) NOT NULL,

  CONSTRAINT "dtrav_monthly_reports_authorId_fkey"      FOREIGN KEY ("authorId")      REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "dtrav_monthly_reports_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "dtrav_monthly_reports_tenantId_period_idx" ON "dtrav_monthly_reports" ("tenantId", "period");
CREATE INDEX IF NOT EXISTS "dtrav_monthly_reports_authorId_status_idx" ON "dtrav_monthly_reports" ("authorId", "status");
CREATE INDEX IF NOT EXISTS "dtrav_monthly_reports_validatedById_idx"   ON "dtrav_monthly_reports" ("validatedById");
