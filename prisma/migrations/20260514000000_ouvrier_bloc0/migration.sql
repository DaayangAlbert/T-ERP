-- OUV — Bloc 0 Ouvrier : champs PIN/PWA + GPS pointage + 4 nouveaux models terrain
-- (SalaryAdvanceRequest, MissionAssignment, HseIncidentReport, EpiAssignment)
-- Réutilise TimeReport (étendu) et LeaveRequest (existant) — pas de TimeClock séparé.

-- 1) users : auth téléphone+PIN, anti brute-force, flags ouvrier
ALTER TABLE "users"
  ADD COLUMN "pinHash"              TEXT,
  ADD COLUMN "phoneVerified"        BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "pinFailedAttempts"    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "pinLockedUntil"       TIMESTAMP(3),
  ADD COLUMN "isGuard"              BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "workerQualification"  TEXT,
  ADD COLUMN "deviceFingerprints"   TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE INDEX "users_tenantId_phone_idx" ON "users"("tenantId", "phone");

-- 2) time_reports : pointage autonome ouvrier (GPS + selfie + anti-fraude)
ALTER TABLE "time_reports"
  ADD COLUMN "entryGeoLat"        DOUBLE PRECISION,
  ADD COLUMN "entryGeoLng"        DOUBLE PRECISION,
  ADD COLUMN "entryGeoAccuracyM"  INTEGER,
  ADD COLUMN "entrySelfieUrl"     TEXT,
  ADD COLUMN "exitGeoLat"         DOUBLE PRECISION,
  ADD COLUMN "exitGeoLng"         DOUBLE PRECISION,
  ADD COLUMN "exitGeoAccuracyM"   INTEGER,
  ADD COLUMN "exitSelfieUrl"      TEXT,
  ADD COLUMN "deviceFingerprint"  TEXT,
  ADD COLUMN "outOfGeofence"      BOOLEAN NOT NULL DEFAULT false;

-- 3) SalaryAdvanceRequest — avance sur salaire (max 30% base)
CREATE TYPE "SalaryAdvanceStatus" AS ENUM (
  'PENDING', 'APPROVED', 'PAID', 'RECOVERED', 'REJECTED', 'CANCELLED'
);

CREATE TABLE "salary_advance_requests" (
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

CREATE INDEX "salary_advance_requests_tenantId_status_idx"
  ON "salary_advance_requests"("tenantId", "status");
CREATE INDEX "salary_advance_requests_userId_createdAt_idx"
  ON "salary_advance_requests"("userId", "createdAt");

ALTER TABLE "salary_advance_requests"
  ADD CONSTRAINT "salary_advance_requests_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "salary_advance_requests_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "salary_advance_requests_validatedById_fkey"
    FOREIGN KEY ("validatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 4) MissionAssignment — ordres de mission
CREATE TYPE "MissionPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
CREATE TYPE "MissionStatus"   AS ENUM (
  'PENDING_ACCEPTANCE', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'
);

CREATE TABLE "mission_assignments" (
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

CREATE INDEX "mission_assignments_tenantId_status_idx"
  ON "mission_assignments"("tenantId", "status");
CREATE INDEX "mission_assignments_userId_status_idx"
  ON "mission_assignments"("userId", "status");
CREATE INDEX "mission_assignments_siteId_status_idx"
  ON "mission_assignments"("siteId", "status");

ALTER TABLE "mission_assignments"
  ADD CONSTRAINT "mission_assignments_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "mission_assignments_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "mission_assignments_siteId_fkey"
    FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "mission_assignments_assignedById_fkey"
    FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 5) HseIncidentReport — signalements HSE par ouvrier (anti-représailles)
CREATE TYPE "HseIncidentType" AS ENUM (
  'CORPORAL_ACCIDENT', 'NEAR_MISS', 'EQUIPMENT_DEFECT', 'SITE_DANGER', 'THEFT_INTRUSION'
);
CREATE TYPE "HseIncidentSeverity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');
CREATE TYPE "HseIncidentStatus" AS ENUM (
  'OPEN', 'INVESTIGATING', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'
);

CREATE TABLE "hse_incident_reports" (
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

CREATE INDEX "hse_incident_reports_tenantId_status_idx"
  ON "hse_incident_reports"("tenantId", "status");
CREATE INDEX "hse_incident_reports_reportedById_createdAt_idx"
  ON "hse_incident_reports"("reportedById", "createdAt");
CREATE INDEX "hse_incident_reports_siteId_severity_idx"
  ON "hse_incident_reports"("siteId", "severity");

ALTER TABLE "hse_incident_reports"
  ADD CONSTRAINT "hse_incident_reports_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "hse_incident_reports_reportedById_fkey"
    FOREIGN KEY ("reportedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "hse_incident_reports_siteId_fkey"
    FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "hse_incident_reports_assignedToId_fkey"
    FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 6) EpiAssignment — équipements de protection individuels
CREATE TYPE "EpiType" AS ENUM (
  'HELMET', 'HIGH_VIS_VEST', 'SAFETY_GLASSES', 'GLOVES',
  'SAFETY_SHOES', 'HARNESS', 'DUST_MASK', 'EAR_PROTECTION'
);
CREATE TYPE "EpiStatus" AS ENUM (
  'OK', 'WORN_OUT', 'DEFECTIVE', 'REPLACED', 'LOST'
);

CREATE TABLE "epi_assignments" (
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

CREATE INDEX "epi_assignments_tenantId_status_idx"
  ON "epi_assignments"("tenantId", "status");
CREATE INDEX "epi_assignments_userId_epiType_idx"
  ON "epi_assignments"("userId", "epiType");

ALTER TABLE "epi_assignments"
  ADD CONSTRAINT "epi_assignments_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "epi_assignments_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
