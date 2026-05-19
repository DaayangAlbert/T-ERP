-- Module 3 CC — Planning & équipes
-- Le CC crée des équipes (avec chef d'équipe), planifie des tâches journalières
-- assignées à une équipe et/ou à des personnes, suit l'avancement.
-- NB : table "site_teams" existe déjà (CDT/RH), d'où le préfixe cc_planning_*

-- 1) Enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CcPlanningMemberRole') THEN
    CREATE TYPE "CcPlanningMemberRole" AS ENUM ('MEMBER', 'DEPUTY');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CcPlanningTaskStatus') THEN
    CREATE TYPE "CcPlanningTaskStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'DONE', 'BLOCKED', 'CANCELLED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CcPlanningTaskPriority') THEN
    CREATE TYPE "CcPlanningTaskPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH');
  END IF;
END$$;

-- 2) Table cc_planning_teams
CREATE TABLE IF NOT EXISTS "cc_planning_teams" (
  "id"        TEXT PRIMARY KEY,
  "tenantId"  TEXT NOT NULL,
  "siteId"    TEXT NOT NULL,
  "name"      TEXT NOT NULL,
  "color"     TEXT,
  "active"    BOOLEAN NOT NULL DEFAULT true,
  "leaderId"  TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "cc_planning_teams_siteId_fkey"   FOREIGN KEY ("siteId")   REFERENCES "sites"("id") ON DELETE CASCADE  ON UPDATE CASCADE,
  CONSTRAINT "cc_planning_teams_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "cc_planning_teams_siteId_active_idx" ON "cc_planning_teams" ("siteId", "active");
CREATE INDEX IF NOT EXISTS "cc_planning_teams_leaderId_idx"      ON "cc_planning_teams" ("leaderId");

-- 3) Table cc_planning_team_members
CREATE TABLE IF NOT EXISTS "cc_planning_team_members" (
  "id"      TEXT PRIMARY KEY,
  "teamId"  TEXT NOT NULL,
  "userId"  TEXT NOT NULL,
  "role"    "CcPlanningMemberRole" NOT NULL DEFAULT 'MEMBER',
  "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "cc_planning_team_members_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "cc_planning_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "cc_planning_team_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id")             ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "cc_planning_team_members_teamId_userId_key" ON "cc_planning_team_members" ("teamId", "userId");
CREATE INDEX IF NOT EXISTS "cc_planning_team_members_userId_idx" ON "cc_planning_team_members" ("userId");

-- 4) Table cc_planning_tasks
CREATE TABLE IF NOT EXISTS "cc_planning_tasks" (
  "id"               TEXT PRIMARY KEY,
  "tenantId"         TEXT NOT NULL,
  "siteId"           TEXT NOT NULL,
  "teamId"           TEXT,

  "title"            TEXT NOT NULL,
  "description"      TEXT,
  "location"         TEXT,

  "scheduledDate"    TIMESTAMP(3) NOT NULL,
  "plannedStartTime" TEXT,
  "plannedEndTime"   TEXT,

  "status"           "CcPlanningTaskStatus"   NOT NULL DEFAULT 'PLANNED',
  "priority"         "CcPlanningTaskPriority" NOT NULL DEFAULT 'NORMAL',
  "progressPercent"  INTEGER NOT NULL DEFAULT 0,

  "assigneeUserIds"  TEXT[] NOT NULL DEFAULT '{}',

  "createdById"      TEXT NOT NULL,

  "blockedReason"    TEXT,
  "completedAt"      TIMESTAMP(3),

  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL,

  CONSTRAINT "cc_planning_tasks_siteId_fkey"      FOREIGN KEY ("siteId")      REFERENCES "sites"("id")             ON DELETE CASCADE  ON UPDATE CASCADE,
  CONSTRAINT "cc_planning_tasks_teamId_fkey"      FOREIGN KEY ("teamId")      REFERENCES "cc_planning_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "cc_planning_tasks_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id")             ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "cc_planning_tasks_siteId_scheduledDate_idx" ON "cc_planning_tasks" ("siteId", "scheduledDate");
CREATE INDEX IF NOT EXISTS "cc_planning_tasks_siteId_status_idx"        ON "cc_planning_tasks" ("siteId", "status");
CREATE INDEX IF NOT EXISTS "cc_planning_tasks_teamId_scheduledDate_idx" ON "cc_planning_tasks" ("teamId", "scheduledDate");
