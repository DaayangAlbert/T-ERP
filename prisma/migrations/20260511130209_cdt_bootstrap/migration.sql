-- CreateEnum
CREATE TYPE "DailyPlanStatus" AS ENUM ('DRAFT', 'VALIDATED', 'EXECUTED', 'REVISED');

-- CreateEnum
CREATE TYPE "TeamStatus" AS ENUM ('ASSIGNED', 'PENDING_RESOURCES', 'REINFORCEMENT_NEEDED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "QcType" AS ENUM ('SELF_CONTROL', 'LAB_TEST', 'EXTERNAL_INSPECTION');

-- CreateEnum
CREATE TYPE "QcCategory" AS ENUM ('CONCRETE', 'REBAR', 'FORMWORK', 'GEOMETRY', 'EARTHWORKS', 'WATERPROOFING', 'ELECTRICAL', 'OTHER');

-- CreateEnum
CREATE TYPE "LabTestType" AS ENUM ('CONCRETE_J7', 'CONCRETE_J28', 'STEEL_TENSILE', 'SOIL_BEARING', 'SOIL_DENSITY', 'ASPHALT', 'OTHER');

-- CreateEnum
CREATE TYPE "VisitorType" AS ENUM ('BCT', 'GEOMETER', 'MOA', 'INSURANCE', 'BANK', 'CONSULTANT', 'OTHER');

-- CreateEnum
CREATE TYPE "VisitStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'REPORTED', 'VALIDATED');

-- CreateEnum
CREATE TYPE "CdtMilestoneStatus" AS ENUM ('UPCOMING', 'IN_PREPARATION', 'READY_FOR_RECEPTION', 'REACHED', 'MISSED');

-- CreateTable
CREATE TABLE "daily_plans" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "planDate" DATE NOT NULL,
    "status" "DailyPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "createdBy" TEXT NOT NULL,
    "validatedAt" TIMESTAMP(3),
    "validatedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_plan_teams" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "mainTask" TEXT NOT NULL,
    "objective" TEXT,
    "materialsNeeded" JSONB,
    "status" "TeamStatus" NOT NULL DEFAULT 'ASSIGNED',
    "extraNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_plan_teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quality_controls" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "type" "QcType" NOT NULL,
    "category" "QcCategory" NOT NULL,
    "reference" TEXT NOT NULL,
    "checkpoints" JSONB NOT NULL,
    "overallConform" BOOLEAN NOT NULL DEFAULT true,
    "photos" TEXT[],
    "notes" TEXT,
    "performedBy" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL,
    "phase" TEXT,
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quality_controls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_tests" (
    "id" TEXT NOT NULL,
    "qcId" TEXT,
    "siteId" TEXT NOT NULL,
    "labName" TEXT NOT NULL,
    "testType" "LabTestType" NOT NULL,
    "sampleRef" TEXT NOT NULL,
    "samplingDate" TIMESTAMP(3) NOT NULL,
    "expectedDate" TIMESTAMP(3) NOT NULL,
    "receivedDate" TIMESTAMP(3),
    "result" JSONB,
    "conform" BOOLEAN,
    "reportUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lab_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subcontractor_presences" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "subcontractorId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "supervisorOnSite" TEXT NOT NULL,
    "workerCount" INTEGER NOT NULL,
    "activityNotes" TEXT,
    "dailyPresenceBL" TEXT,
    "recordedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subcontractor_presences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_visits" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "visitorType" "VisitorType" NOT NULL,
    "visitorName" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "purpose" TEXT NOT NULL,
    "reportContent" TEXT,
    "reportPhotos" TEXT[],
    "reservations" INTEGER NOT NULL DEFAULT 0,
    "status" "VisitStatus" NOT NULL DEFAULT 'SCHEDULED',
    "reportUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cdt_milestones" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "contractDate" TIMESTAMP(3) NOT NULL,
    "forecastDate" TIMESTAMP(3) NOT NULL,
    "actualDate" TIMESTAMP(3),
    "status" "CdtMilestoneStatus" NOT NULL DEFAULT 'UPCOMING',
    "deliverables" JSONB NOT NULL,
    "preparation" INTEGER NOT NULL DEFAULT 0,
    "reservations" INTEGER NOT NULL DEFAULT 0,
    "pvUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cdt_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "daily_plans_siteId_status_idx" ON "daily_plans"("siteId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "daily_plans_siteId_planDate_key" ON "daily_plans"("siteId", "planDate");

-- CreateIndex
CREATE UNIQUE INDEX "daily_plan_teams_planId_teamId_key" ON "daily_plan_teams"("planId", "teamId");

-- CreateIndex
CREATE INDEX "quality_controls_siteId_performedAt_idx" ON "quality_controls"("siteId", "performedAt");

-- CreateIndex
CREATE INDEX "lab_tests_siteId_expectedDate_idx" ON "lab_tests"("siteId", "expectedDate");

-- CreateIndex
CREATE INDEX "subcontractor_presences_siteId_date_idx" ON "subcontractor_presences"("siteId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "subcontractor_presences_siteId_subcontractorId_date_key" ON "subcontractor_presences"("siteId", "subcontractorId", "date");

-- CreateIndex
CREATE INDEX "external_visits_siteId_scheduledAt_idx" ON "external_visits"("siteId", "scheduledAt");

-- CreateIndex
CREATE INDEX "cdt_milestones_siteId_status_idx" ON "cdt_milestones"("siteId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "cdt_milestones_siteId_code_key" ON "cdt_milestones"("siteId", "code");

-- AddForeignKey
ALTER TABLE "daily_plans" ADD CONSTRAINT "daily_plans_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_plan_teams" ADD CONSTRAINT "daily_plan_teams_planId_fkey" FOREIGN KEY ("planId") REFERENCES "daily_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_plan_teams" ADD CONSTRAINT "daily_plan_teams_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "site_teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_controls" ADD CONSTRAINT "quality_controls_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcontractor_presences" ADD CONSTRAINT "subcontractor_presences_subcontractorId_fkey" FOREIGN KEY ("subcontractorId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_visits" ADD CONSTRAINT "external_visits_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cdt_milestones" ADD CONSTRAINT "cdt_milestones_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
