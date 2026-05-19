-- Module 2 CC — Rapport d'avancement chantier
-- Le CC produit un rapport structuré (WEEKLY/MONTHLY/AD_HOC), wizard
-- 5 étapes, soumission au DTrav, validation/refus, export PDF.

-- 1) Enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SiteProgressReportType') THEN
    CREATE TYPE "SiteProgressReportType" AS ENUM ('WEEKLY', 'MONTHLY', 'AD_HOC');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SiteProgressReportStatus') THEN
    CREATE TYPE "SiteProgressReportStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'VALIDATED', 'REJECTED');
  END IF;
END$$;

-- 2) Table site_progress_reports
CREATE TABLE IF NOT EXISTS "site_progress_reports" (
  "id"                       TEXT PRIMARY KEY,
  "tenantId"                 TEXT NOT NULL,
  "siteId"                   TEXT NOT NULL,
  "authorId"                 TEXT NOT NULL,
  "reportType"               "SiteProgressReportType"   NOT NULL DEFAULT 'MONTHLY',
  "period"                   TIMESTAMP(3) NOT NULL,
  "periodLabel"              TEXT,
  "status"                   "SiteProgressReportStatus" NOT NULL DEFAULT 'DRAFT',

  "physicalProgressPercent"  DOUBLE PRECISION NOT NULL DEFAULT 0,
  "previousProgressPercent"  DOUBLE PRECISION,

  "mainAchievements"         TEXT,
  "delaysIdentified"         TEXT,
  "photos"                   TEXT[] NOT NULL DEFAULT '{}',

  "valueProducedXAF"         BIGINT NOT NULL DEFAULT 0,
  "valueProducedCumulXAF"    BIGINT NOT NULL DEFAULT 0,
  "avgWorkforce"             INTEGER NOT NULL DEFAULT 0,
  "maxWorkforce"             INTEGER NOT NULL DEFAULT 0,
  "overtimeHoursTotal"       DOUBLE PRECISION NOT NULL DEFAULT 0,
  "billingStatus"            TEXT,

  "hseIncidentsCount"        INTEGER NOT NULL DEFAULT 0,
  "daysWithoutAccident"      INTEGER NOT NULL DEFAULT 0,
  "issuesEncountered"        TEXT,
  "supportNeeded"            TEXT,

  "attachmentDocumentIds"    TEXT[] NOT NULL DEFAULT '{}',
  "nextPeriodPriorities"     TEXT,

  "submittedAt"              TIMESTAMP(3),
  "validatedById"            TEXT,
  "validatedAt"              TIMESTAMP(3),
  "rejectionReason"          TEXT,

  "pdfUrl"                   TEXT,

  "createdAt"                TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"                TIMESTAMP(3) NOT NULL,

  CONSTRAINT "site_progress_reports_siteId_fkey"      FOREIGN KEY ("siteId")        REFERENCES "sites"("id") ON DELETE CASCADE  ON UPDATE CASCADE,
  CONSTRAINT "site_progress_reports_authorId_fkey"    FOREIGN KEY ("authorId")      REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT "site_progress_reports_validatedBy_fkey" FOREIGN KEY ("validatedById") REFERENCES "users"("id") ON DELETE SET NULL  ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "site_progress_reports_siteId_period_idx"     ON "site_progress_reports" ("siteId", "period");
CREATE INDEX IF NOT EXISTS "site_progress_reports_siteId_status_idx"     ON "site_progress_reports" ("siteId", "status");
CREATE INDEX IF NOT EXISTS "site_progress_reports_authorId_idx"          ON "site_progress_reports" ("authorId");
CREATE INDEX IF NOT EXISTS "site_progress_reports_validatedById_idx"     ON "site_progress_reports" ("validatedById");
