-- Planning opérationnel CDT + DTrav (Mensuel / Hebdomadaire), distinct du
-- planning général contractuel (SitePlanning) et du DailyPlan existant.

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "PlanHorizon" AS ENUM ('MONTHLY', 'WEEKLY');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "OperationalPlanStatus" AS ENUM ('DRAFT', 'PUBLISHED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "operational_plans" (
  "id"          TEXT NOT NULL PRIMARY KEY,
  "tenantId"    TEXT NOT NULL,
  "siteId"      TEXT NOT NULL,
  "authorId"    TEXT NOT NULL,
  "horizon"     "PlanHorizon" NOT NULL,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd"   TIMESTAMP(3) NOT NULL,
  "title"       TEXT,
  "objective"   TEXT,
  "status"      "OperationalPlanStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL
);

CREATE INDEX IF NOT EXISTS "operational_plans_site_horizon_period_idx" ON "operational_plans" ("siteId", "horizon", "periodStart");
CREATE INDEX IF NOT EXISTS "operational_plans_tenant_horizon_idx" ON "operational_plans" ("tenantId", "horizon");

DO $$ BEGIN
  ALTER TABLE "operational_plans" ADD CONSTRAINT "operational_plans_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "operational_plans" ADD CONSTRAINT "operational_plans_siteId_fkey"
    FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "operational_plans" ADD CONSTRAINT "operational_plans_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "operational_tasks" (
  "id"              TEXT NOT NULL PRIMARY KEY,
  "planId"          TEXT NOT NULL,
  "name"            TEXT NOT NULL,
  "plannedStart"    TIMESTAMP(3) NOT NULL,
  "plannedEnd"      TIMESTAMP(3) NOT NULL,
  "progressPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "assignedTeamId"  TEXT,
  "notes"           TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL
);

CREATE INDEX IF NOT EXISTS "operational_tasks_plan_start_idx" ON "operational_tasks" ("planId", "plannedStart");

DO $$ BEGIN
  ALTER TABLE "operational_tasks" ADD CONSTRAINT "operational_tasks_planId_fkey"
    FOREIGN KEY ("planId") REFERENCES "operational_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
