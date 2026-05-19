-- Module DT — Rapport mensuel technique
-- Le Directeur Technique consolide chaque mois la performance du
-- portefeuille pour le DG/COMEX.

-- 1) Enum statut
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DtMonthlyTechReportStatus') THEN
    CREATE TYPE "DtMonthlyTechReportStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'VALIDATED', 'REJECTED');
  END IF;
END$$;

-- 2) Table dt_monthly_tech_reports
CREATE TABLE IF NOT EXISTS "dt_monthly_tech_reports" (
  "id"                       TEXT PRIMARY KEY,
  "tenantId"                 TEXT NOT NULL,
  "authorId"                 TEXT NOT NULL,

  "period"                   TIMESTAMP(3) NOT NULL,
  "periodLabel"              TEXT,
  "status"                   "DtMonthlyTechReportStatus" NOT NULL DEFAULT 'DRAFT',

  "sitesActiveCount"         INTEGER NOT NULL DEFAULT 0,
  "sitesCompletedCount"      INTEGER NOT NULL DEFAULT 0,
  "sitesAtRiskCount"         INTEGER NOT NULL DEFAULT 0,
  "avgPhysicalProgress"      DOUBLE PRECISION NOT NULL DEFAULT 0,
  "avgFinancialProgress"     DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalRevenueXAF"          BIGINT NOT NULL DEFAULT 0,
  "totalSpentXAF"            BIGINT NOT NULL DEFAULT 0,
  "portfolioMarginPercent"   DOUBLE PRECISION NOT NULL DEFAULT 0,

  "hseTotalIncidents"        INTEGER NOT NULL DEFAULT 0,
  "hseTf1"                   DOUBLE PRECISION NOT NULL DEFAULT 0,
  "hseAuditsConducted"       INTEGER NOT NULL DEFAULT 0,
  "hseNcOpen"                INTEGER NOT NULL DEFAULT 0,

  "subcontractorsActive"     INTEGER NOT NULL DEFAULT 0,
  "subcontractorsAtRisk"     INTEGER NOT NULL DEFAULT 0,

  "executiveSummary"         TEXT,
  "financialAnalysis"        TEXT,
  "qhseAnalysis"             TEXT,
  "subcontractingAnalysis"   TEXT,
  "majorRisks"               TEXT,
  "technicalDecisions"       TEXT,
  "recommendations"          TEXT,
  "nextMonthOutlook"         TEXT,

  "submittedAt"              TIMESTAMP(3),
  "validatedById"            TEXT,
  "validatedAt"              TIMESTAMP(3),
  "rejectionReason"          TEXT,

  "pdfUrl"                   TEXT,

  "createdAt"                TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"                TIMESTAMP(3) NOT NULL,

  CONSTRAINT "dt_monthly_tech_reports_authorId_fkey"      FOREIGN KEY ("authorId")      REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "dt_monthly_tech_reports_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "dt_monthly_tech_reports_tenantId_period_idx" ON "dt_monthly_tech_reports" ("tenantId", "period");
CREATE INDEX IF NOT EXISTS "dt_monthly_tech_reports_authorId_status_idx" ON "dt_monthly_tech_reports" ("authorId", "status");
CREATE INDEX IF NOT EXISTS "dt_monthly_tech_reports_validatedById_idx"   ON "dt_monthly_tech_reports" ("validatedById");

-- 3) Table dt_monthly_tech_report_sites
CREATE TABLE IF NOT EXISTS "dt_monthly_tech_report_sites" (
  "id"                          TEXT PRIMARY KEY,
  "reportId"                    TEXT NOT NULL,
  "siteId"                      TEXT NOT NULL,

  "physicalProgressPercent"     DOUBLE PRECISION NOT NULL DEFAULT 0,
  "financialProgressPercent"    DOUBLE PRECISION NOT NULL DEFAULT 0,
  "marginPercent"               DOUBLE PRECISION NOT NULL DEFAULT 0,
  "revenueMonthXAF"             BIGINT NOT NULL DEFAULT 0,
  "hseIncidentsCount"           INTEGER NOT NULL DEFAULT 0,
  "ncOpenCount"                 INTEGER NOT NULL DEFAULT 0,
  "riskLevel"                   TEXT,

  "notes"                       TEXT,

  "createdAt"                   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "dt_monthly_tech_report_sites_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "dt_monthly_tech_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "dt_monthly_tech_report_sites_siteId_fkey"   FOREIGN KEY ("siteId")   REFERENCES "sites"("id")                  ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "dt_monthly_tech_report_sites_reportId_siteId_key" ON "dt_monthly_tech_report_sites" ("reportId", "siteId");
CREATE INDEX IF NOT EXISTS "dt_monthly_tech_report_sites_siteId_idx" ON "dt_monthly_tech_report_sites" ("siteId");
