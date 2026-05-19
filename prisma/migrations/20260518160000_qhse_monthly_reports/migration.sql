-- Module QHSE — Rapport mensuel sinistralité

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'QhseMonthlyReportStatus') THEN
    CREATE TYPE "QhseMonthlyReportStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'VALIDATED', 'REJECTED');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS "qhse_monthly_reports" (
  "id"                    TEXT PRIMARY KEY,
  "tenantId"              TEXT NOT NULL,
  "authorId"              TEXT NOT NULL,

  "period"                TIMESTAMP(3) NOT NULL,
  "periodLabel"           TEXT,
  "status"                "QhseMonthlyReportStatus" NOT NULL DEFAULT 'DRAFT',

  "totalHoursWorked"      BIGINT NOT NULL DEFAULT 0,
  "totalIncidents"        INTEGER NOT NULL DEFAULT 0,
  "lostTimeIncidents"     INTEGER NOT NULL DEFAULT 0,
  "noLostTimeIncidents"   INTEGER NOT NULL DEFAULT 0,
  "daysLost"              INTEGER NOT NULL DEFAULT 0,
  "tf1"                   DOUBLE PRECISION NOT NULL DEFAULT 0,
  "tg"                    DOUBLE PRECISION NOT NULL DEFAULT 0,
  "daysWithoutAccident"   INTEGER NOT NULL DEFAULT 0,

  "cutsCount"             INTEGER NOT NULL DEFAULT 0,
  "fallsCount"            INTEGER NOT NULL DEFAULT 0,
  "electricalCount"       INTEGER NOT NULL DEFAULT 0,
  "chemicalCount"         INTEGER NOT NULL DEFAULT 0,
  "vehiclesCount"         INTEGER NOT NULL DEFAULT 0,
  "otherCount"            INTEGER NOT NULL DEFAULT 0,

  "internalAudits"        INTEGER NOT NULL DEFAULT 0,
  "externalAudits"        INTEGER NOT NULL DEFAULT 0,
  "inspectionsCount"      INTEGER NOT NULL DEFAULT 0,
  "observationsCount"     INTEGER NOT NULL DEFAULT 0,

  "ncOpened"              INTEGER NOT NULL DEFAULT 0,
  "ncClosed"              INTEGER NOT NULL DEFAULT 0,
  "ncCritical"            INTEGER NOT NULL DEFAULT 0,
  "ncOverdue"             INTEGER NOT NULL DEFAULT 0,

  "safetyTrainings"       INTEGER NOT NULL DEFAULT 0,
  "trainingHours"         DOUBLE PRECISION NOT NULL DEFAULT 0,
  "personsTrained"        INTEGER NOT NULL DEFAULT 0,

  "epiDistributed"        INTEGER NOT NULL DEFAULT 0,
  "epiCheckCompliance"    DOUBLE PRECISION NOT NULL DEFAULT 0,

  "executiveSummary"      TEXT,
  "incidentsAnalysis"     TEXT,
  "auditFindings"         TEXT,
  "ncAnalysis"            TEXT,
  "trainingsAnalysis"     TEXT,
  "epiAnalysis"           TEXT,
  "actionPlans"           TEXT,
  "trendsAnalysis"        TEXT,
  "chsctRecommendations"  TEXT,

  "submittedAt"           TIMESTAMP(3),
  "validatedById"         TEXT,
  "validatedAt"           TIMESTAMP(3),
  "rejectionReason"       TEXT,

  "pdfUrl"                TEXT,

  "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"             TIMESTAMP(3) NOT NULL,

  CONSTRAINT "qhse_monthly_reports_authorId_fkey"      FOREIGN KEY ("authorId")      REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "qhse_monthly_reports_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "qhse_monthly_reports_tenantId_period_idx" ON "qhse_monthly_reports" ("tenantId", "period");
CREATE INDEX IF NOT EXISTS "qhse_monthly_reports_authorId_status_idx" ON "qhse_monthly_reports" ("authorId", "status");
CREATE INDEX IF NOT EXISTS "qhse_monthly_reports_validatedById_idx"   ON "qhse_monthly_reports" ("validatedById");
