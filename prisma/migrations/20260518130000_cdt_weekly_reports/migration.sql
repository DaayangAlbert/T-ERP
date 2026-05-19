-- Module CDT — Rapport hebdomadaire consolidé
-- Le Conducteur de Travaux supervise N chantiers et soumet
-- chaque semaine un rapport agrégé au DTrav pour validation.

-- 1) Enum statut
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CdtWeeklyReportStatus') THEN
    CREATE TYPE "CdtWeeklyReportStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'VALIDATED', 'REJECTED');
  END IF;
END$$;

-- 2) Table cdt_weekly_reports (entête)
CREATE TABLE IF NOT EXISTS "cdt_weekly_reports" (
  "id"                     TEXT PRIMARY KEY,
  "tenantId"               TEXT NOT NULL,
  "authorId"               TEXT NOT NULL,

  "weekStart"              TIMESTAMP(3) NOT NULL,
  "weekEnd"                TIMESTAMP(3) NOT NULL,
  "weekLabel"              TEXT,

  "status"                 "CdtWeeklyReportStatus" NOT NULL DEFAULT 'DRAFT',

  "workingDays"            INTEGER NOT NULL DEFAULT 0,
  "weatherDays"            INTEGER NOT NULL DEFAULT 0,
  "subcontractorsPresent"  INTEGER NOT NULL DEFAULT 0,

  "globalSummary"          TEXT,
  "keyAchievements"        TEXT,
  "transverseIssues"       TEXT,
  "scheduleSlippages"      TEXT,
  "arbitrationsNeeded"     TEXT,
  "nextWeekPlan"           TEXT,

  "submittedAt"            TIMESTAMP(3),
  "validatedById"          TEXT,
  "validatedAt"            TIMESTAMP(3),
  "rejectionReason"        TEXT,

  "pdfUrl"                 TEXT,

  "createdAt"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"              TIMESTAMP(3) NOT NULL,

  CONSTRAINT "cdt_weekly_reports_authorId_fkey"      FOREIGN KEY ("authorId")      REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "cdt_weekly_reports_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "cdt_weekly_reports_authorId_weekStart_idx" ON "cdt_weekly_reports" ("authorId", "weekStart");
CREATE INDEX IF NOT EXISTS "cdt_weekly_reports_authorId_status_idx"   ON "cdt_weekly_reports" ("authorId", "status");
CREATE INDEX IF NOT EXISTS "cdt_weekly_reports_validatedById_idx"     ON "cdt_weekly_reports" ("validatedById");

-- 3) Table cdt_weekly_report_sites (snapshot KPI par chantier couvert)
CREATE TABLE IF NOT EXISTS "cdt_weekly_report_sites" (
  "id"                         TEXT PRIMARY KEY,
  "reportId"                   TEXT NOT NULL,
  "siteId"                     TEXT NOT NULL,

  "physicalProgressPercent"    DOUBLE PRECISION NOT NULL DEFAULT 0,
  "financialProgressPercent"   DOUBLE PRECISION NOT NULL DEFAULT 0,
  "valueProducedXAF"           BIGINT NOT NULL DEFAULT 0,
  "avgWorkforce"               INTEGER NOT NULL DEFAULT 0,
  "hseIncidentsCount"          INTEGER NOT NULL DEFAULT 0,

  "milestonesAchieved"         TEXT,
  "milestonesAtRisk"           TEXT,
  "notes"                      TEXT,

  "createdAt"                  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "cdt_weekly_report_sites_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "cdt_weekly_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "cdt_weekly_report_sites_siteId_fkey"   FOREIGN KEY ("siteId")   REFERENCES "sites"("id")             ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "cdt_weekly_report_sites_reportId_siteId_key" ON "cdt_weekly_report_sites" ("reportId", "siteId");
CREATE INDEX IF NOT EXISTS "cdt_weekly_report_sites_siteId_idx" ON "cdt_weekly_report_sites" ("siteId");
