-- OUV — Bloc 0 Ouvrier : champs PIN/PWA + GPS pointage + 4 nouveaux models terrain
-- (SalaryAdvanceRequest, MissionAssignment, HseIncidentReport, EpiAssignment)
-- Réutilise TimeReport (étendu) et LeaveRequest (existant) — pas de TimeClock séparé.

-- 1) users : auth téléphone+PIN, anti brute-force, flags ouvrier
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "pinHash"              TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phoneVerified"        BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "pinFailedAttempts"    INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "pinLockedUntil"       TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isGuard"              BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "workerQualification"  TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "deviceFingerprints"   TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE INDEX IF NOT EXISTS "users_tenantId_phone_idx" ON "users"("tenantId", "phone");

-- 2) time_reports : pointage autonome ouvrier (GPS + selfie + anti-fraude)
ALTER TABLE "time_reports" ADD COLUMN IF NOT EXISTS "entryGeoLat"        DOUBLE PRECISION;
ALTER TABLE "time_reports" ADD COLUMN IF NOT EXISTS "entryGeoLng"        DOUBLE PRECISION;
ALTER TABLE "time_reports" ADD COLUMN IF NOT EXISTS "entryGeoAccuracyM"  INTEGER;
ALTER TABLE "time_reports" ADD COLUMN IF NOT EXISTS "entrySelfieUrl"     TEXT;
ALTER TABLE "time_reports" ADD COLUMN IF NOT EXISTS "exitGeoLat"         DOUBLE PRECISION;
ALTER TABLE "time_reports" ADD COLUMN IF NOT EXISTS "exitGeoLng"         DOUBLE PRECISION;
ALTER TABLE "time_reports" ADD COLUMN IF NOT EXISTS "exitGeoAccuracyM"   INTEGER;
ALTER TABLE "time_reports" ADD COLUMN IF NOT EXISTS "exitSelfieUrl"      TEXT;
ALTER TABLE "time_reports" ADD COLUMN IF NOT EXISTS "deviceFingerprint"  TEXT;
ALTER TABLE "time_reports" ADD COLUMN IF NOT EXISTS "outOfGeofence"      BOOLEAN NOT NULL DEFAULT false;

-- 3) SalaryAdvanceRequest — avance sur salaire (max 30% base)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SalaryAdvanceStatus') THEN
    CREATE TYPE "SalaryAdvanceStatus" AS ENUM (
      'PENDING', 'APPROVED', 'PAID', 'RECOVERED', 'REJECTED', 'CANCELLED'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "salary_advance_requests" (
  "id"              TEXT NOT NULL,
  "tenantId"        TEXT NOT NULL,
  "userId"          TEXT NOT NULL,
  "amountXAF"       BIGINT NOT NULL,
  "reason"          TEXT,
  "maxAllowedXAF"   BIGINT NOT NULL,
  "status"          "SalaryAdvanceStatus" NOT NULL DEFAULT 'PENDING',
  "validatedById"   TEXT,
  "validatedAt"     TIMESTAMP(3),
  "rejectionReason" TEXT,
  "payoutAt"        TIMESTAMP(3),
  "payoutMethod"    TEXT,
  "recoveryMonth"   TEXT,
  "recoveredAt"     TIMESTAMP(3),
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,
  CONSTRAINT "salary_advance_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "salary_advance_requests_tenantId_status_idx"
  ON "salary_advance_requests"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "salary_advance_requests_userId_createdAt_idx"
  ON "salary_advance_requests"("userId", "createdAt");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'salary_advance_requests_tenantId_fkey') THEN
    ALTER TABLE "salary_advance_requests"
      ADD CONSTRAINT "salary_advance_requests_tenantId_fkey"
        FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      ADD CONSTRAINT "salary_advance_requests_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      ADD CONSTRAINT "salary_advance_requests_validatedById_fkey"
        FOREIGN KEY ("validatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- 4) MissionAssignment — ordres de mission
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MissionPriority') THEN
    CREATE TYPE "MissionPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MissionStatus') THEN
    CREATE TYPE "MissionStatus"   AS ENUM (
      'PENDING_ACCEPTANCE', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "mission_assignments" (
  "id"                    TEXT NOT NULL,
  "tenantId"              TEXT NOT NULL,
  "userId"                TEXT NOT NULL,
  "siteId"                TEXT NOT NULL,
  "assignedById"          TEXT NOT NULL,
  "title"                 TEXT NOT NULL,
  "description"           TEXT NOT NULL,
  "instructions"          TEXT,
  "startDate"             TIMESTAMP(3) NOT NULL,
  "endDate"               TIMESTAMP(3),
  "estimatedDays"         INTEGER,
  "progressPercent"       INTEGER NOT NULL DEFAULT 0,
  "priority"              "MissionPriority" NOT NULL DEFAULT 'NORMAL',
  "status"                "MissionStatus" NOT NULL DEFAULT 'PENDING_ACCEPTANCE',
  "workerAcceptedAt"      TIMESTAMP(3),
  "workerQuestionsRaised" TEXT,
  "completedAt"           TIMESTAMP(3),
  "completionNotes"       TEXT,
  "progressPhotoUrls"     TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"             TIMESTAMP(3) NOT NULL,
  CONSTRAINT "mission_assignments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "mission_assignments_tenantId_status_idx"
  ON "mission_assignments"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "mission_assignments_userId_status_idx"
  ON "mission_assignments"("userId", "status");
CREATE INDEX IF NOT EXISTS "mission_assignments_siteId_status_idx"
  ON "mission_assignments"("siteId", "status");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mission_assignments_tenantId_fkey') THEN
    ALTER TABLE "mission_assignments"
      ADD CONSTRAINT "mission_assignments_tenantId_fkey"
        FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      ADD CONSTRAINT "mission_assignments_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      ADD CONSTRAINT "mission_assignments_siteId_fkey"
        FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      ADD CONSTRAINT "mission_assignments_assignedById_fkey"
        FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- 5) HseIncidentReport — signalements HSE par ouvrier (anti-représailles)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'HseIncidentType') THEN
    CREATE TYPE "HseIncidentType" AS ENUM (
      'CORPORAL_ACCIDENT', 'NEAR_MISS', 'EQUIPMENT_DEFECT', 'SITE_DANGER', 'THEFT_INTRUSION'
    );
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'HseIncidentSeverity') THEN
    CREATE TYPE "HseIncidentSeverity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'HseIncidentStatus') THEN
    CREATE TYPE "HseIncidentStatus" AS ENUM (
      'OPEN', 'INVESTIGATING', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "hse_incident_reports" (
  "id"                TEXT NOT NULL,
  "tenantId"          TEXT NOT NULL,
  "reportedById"      TEXT NOT NULL,
  "siteId"            TEXT NOT NULL,
  "type"              "HseIncidentType" NOT NULL,
  "severity"          "HseIncidentSeverity" NOT NULL,
  "title"             TEXT NOT NULL,
  "description"       TEXT NOT NULL,
  "incidentGeoLat"    DOUBLE PRECISION,
  "incidentGeoLng"    DOUBLE PRECISION,
  "locationDetail"    TEXT,
  "injuredPersonIds"  TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "witnessIds"        TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "photosUrls"        TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "isAnonymous"       BOOLEAN NOT NULL DEFAULT false,
  "status"            "HseIncidentStatus" NOT NULL DEFAULT 'OPEN',
  "assignedToId"      TEXT,
  "resolution"        TEXT,
  "resolvedAt"        TIMESTAMP(3),
  "reportedToCnps"    BOOLEAN NOT NULL DEFAULT false,
  "reportedToCnpsAt"  TIMESTAMP(3),
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL,
  CONSTRAINT "hse_incident_reports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "hse_incident_reports_tenantId_status_idx"
  ON "hse_incident_reports"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "hse_incident_reports_reportedById_createdAt_idx"
  ON "hse_incident_reports"("reportedById", "createdAt");
CREATE INDEX IF NOT EXISTS "hse_incident_reports_siteId_severity_idx"
  ON "hse_incident_reports"("siteId", "severity");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hse_incident_reports_tenantId_fkey') THEN
    ALTER TABLE "hse_incident_reports"
      ADD CONSTRAINT "hse_incident_reports_tenantId_fkey"
        FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      ADD CONSTRAINT "hse_incident_reports_reportedById_fkey"
        FOREIGN KEY ("reportedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
      ADD CONSTRAINT "hse_incident_reports_siteId_fkey"
        FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      ADD CONSTRAINT "hse_incident_reports_assignedToId_fkey"
        FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- 6) EpiAssignment — équipements de protection individuels
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EpiType') THEN
    CREATE TYPE "EpiType" AS ENUM (
      'HELMET', 'HIGH_VIS_VEST', 'SAFETY_GLASSES', 'GLOVES',
      'SAFETY_SHOES', 'HARNESS', 'DUST_MASK', 'EAR_PROTECTION'
    );
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EpiStatus') THEN
    CREATE TYPE "EpiStatus" AS ENUM (
      'OK', 'WORN_OUT', 'DEFECTIVE', 'REPLACED', 'LOST'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "epi_assignments" (
  "id"                    TEXT NOT NULL,
  "tenantId"              TEXT NOT NULL,
  "userId"                TEXT NOT NULL,
  "epiType"               "EpiType" NOT NULL,
  "name"                  TEXT NOT NULL,
  "serialNumber"          TEXT,
  "assignedAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expectedReplacementAt" TIMESTAMP(3),
  "status"                "EpiStatus" NOT NULL DEFAULT 'OK',
  "replacedAt"            TIMESTAMP(3),
  "replacementReason"     TEXT,
  "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"             TIMESTAMP(3) NOT NULL,
  CONSTRAINT "epi_assignments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "epi_assignments_tenantId_status_idx"
  ON "epi_assignments"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "epi_assignments_userId_epiType_idx"
  ON "epi_assignments"("userId", "epiType");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'epi_assignments_tenantId_fkey') THEN
    ALTER TABLE "epi_assignments"
      ADD CONSTRAINT "epi_assignments_tenantId_fkey"
        FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      ADD CONSTRAINT "epi_assignments_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
