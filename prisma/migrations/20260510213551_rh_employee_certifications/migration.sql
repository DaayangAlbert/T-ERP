-- CreateEnum
CREATE TYPE "AlertPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "DailyReportStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'VALIDATED', 'REJECTED');

-- CreateEnum
CREATE TYPE "WorkforceRole" AS ENUM ('DIRECTOR_WORKS', 'SITE_MANAGER', 'FOREMAN', 'WAREHOUSE', 'TEAM_LEADER', 'WORKER', 'SUBCONTRACTOR');

-- CreateEnum
CREATE TYPE "PhaseStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'DELAYED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SiteMilestoneStatus" AS ENUM ('UPCOMING', 'REACHED', 'LATE', 'MOA_VALIDATED', 'MISSED');

-- CreateEnum
CREATE TYPE "AmendmentStatus" AS ENUM ('DRAFT', 'N2_PENDING', 'N3_PENDING', 'MOA_PENDING', 'SIGNED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PenaltyStatus" AS ENUM ('NOTIFIED', 'CONTESTED', 'ACCEPTED', 'WAIVED', 'PAID');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('CONFIRMED', 'IN_TRANSIT', 'PARTIALLY_RECEIVED', 'RECEIVED', 'RETURNED');

-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('EXECUTION_PLANS', 'FIELD_PHOTOS', 'RECEPTION_PV', 'HSE_REPORTS', 'MOA_CORRESPONDENCE', 'CONTRACT_AMENDMENTS', 'STUDIES_REPORTS', 'QUALITY_CONTROL', 'OTHER');

-- CreateEnum
CREATE TYPE "MoaReportType" AS ENUM ('WEEKLY_PROGRESS', 'MONTHLY_PROGRESS', 'SITE_MEETING_MINUTES', 'HSE_INCIDENT', 'MOA_NOTICE', 'OTHER');

-- AlterTable
ALTER TABLE "site_alerts" ADD COLUMN     "actionLabel" TEXT,
ADD COLUMN     "actionUrl" TEXT,
ADD COLUMN     "priority" "AlertPriority" NOT NULL DEFAULT 'NORMAL';

-- AlterTable
ALTER TABLE "user_preferences" ADD COLUMN     "dtravAlerts" JSONB;

-- CreateTable
CREATE TABLE "employee_certifications" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeKey" TEXT NOT NULL,
    "employeeName" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "issuedBy" TEXT NOT NULL,
    "certificateUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_certifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_daily_reports" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "reportDate" TIMESTAMP(3) NOT NULL,
    "submittedById" TEXT NOT NULL,
    "workforcePresent" INTEGER NOT NULL DEFAULT 0,
    "workforcePlanned" INTEGER NOT NULL DEFAULT 0,
    "normalHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overtimeHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "justifiedAbsences" INTEGER NOT NULL DEFAULT 0,
    "productionValue" BIGINT NOT NULL DEFAULT 0,
    "consumedMaterials" JSONB NOT NULL DEFAULT '[]',
    "tasksCompleted" JSONB NOT NULL DEFAULT '[]',
    "incidents" TEXT,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "DailyReportStatus" NOT NULL DEFAULT 'SUBMITTED',
    "validatedById" TEXT,
    "validatedAt" TIMESTAMP(3),
    "rejectReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_daily_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_workforce_members" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "WorkforceRole" NOT NULL,
    "reportsToId" TEXT,
    "teamId" TEXT,
    "isLeader" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_workforce_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_teams" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "specialty" "CrewSpecialty" NOT NULL,
    "leaderUserId" TEXT NOT NULL,
    "currentTaskId" TEXT,
    "headcountTarget" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_plannings" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "templateId" TEXT,
    "totalDurationDays" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_plannings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_phases" (
    "id" TEXT NOT NULL,
    "planningId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "plannedStart" TIMESTAMP(3) NOT NULL,
    "plannedEnd" TIMESTAMP(3) NOT NULL,
    "actualStart" TIMESTAMP(3),
    "actualEnd" TIMESTAMP(3),
    "progressPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "PhaseStatus" NOT NULL DEFAULT 'PLANNED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_phases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_tasks" (
    "id" TEXT NOT NULL,
    "phaseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "plannedStart" TIMESTAMP(3) NOT NULL,
    "plannedEnd" TIMESTAMP(3) NOT NULL,
    "actualStart" TIMESTAMP(3),
    "actualEnd" TIMESTAMP(3),
    "progressPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dependsOnIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "assignedTeamId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_milestones" (
    "id" TEXT NOT NULL,
    "planningId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "contractDueDate" TIMESTAMP(3) NOT NULL,
    "forecastDate" TIMESTAMP(3),
    "actualDate" TIMESTAMP(3),
    "status" "SiteMilestoneStatus" NOT NULL DEFAULT 'UPCOMING',
    "moaValidation" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_amendments" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "extraDays" INTEGER NOT NULL DEFAULT 0,
    "reason" TEXT NOT NULL,
    "justification" TEXT NOT NULL,
    "status" "AmendmentStatus" NOT NULL DEFAULT 'DRAFT',
    "initiatedById" TEXT NOT NULL,
    "dtValidatedAt" TIMESTAMP(3),
    "dgValidatedAt" TIMESTAMP(3),
    "moaSignedAt" TIMESTAMP(3),
    "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_amendments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_penalties" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "reason" TEXT NOT NULL,
    "notifiedAt" TIMESTAMP(3) NOT NULL,
    "contestedAt" TIMESTAMP(3),
    "status" "PenaltyStatus" NOT NULL DEFAULT 'NOTIFIED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_penalties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_stock_alerts" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "articleCode" TEXT NOT NULL,
    "articleLabel" TEXT NOT NULL,
    "currentStock" DOUBLE PRECISION NOT NULL,
    "weeklyNeed" DOUBLE PRECISION NOT NULL,
    "daysOfCover" DOUBLE PRECISION NOT NULL,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'MEDIUM',
    "suggestedSupplierId" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_stock_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deliveries" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "poId" TEXT,
    "supplierId" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3),
    "receivedById" TEXT,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'CONFIRMED',
    "deliveryNoteRef" TEXT,
    "items" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_documents" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "category" "DocumentCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB,
    "ocrContent" TEXT,

    CONSTRAINT "site_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moa_reports" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "reportType" "MoaReportType" NOT NULL,
    "period" TEXT,
    "content" JSONB NOT NULL,
    "pdfUrl" TEXT,
    "sentTo" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sentAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "moa_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "employee_certifications_tenantId_expiresAt_idx" ON "employee_certifications"("tenantId", "expiresAt");

-- CreateIndex
CREATE INDEX "employee_certifications_employeeKey_idx" ON "employee_certifications"("employeeKey");

-- CreateIndex
CREATE INDEX "site_daily_reports_siteId_reportDate_idx" ON "site_daily_reports"("siteId", "reportDate");

-- CreateIndex
CREATE INDEX "site_daily_reports_status_idx" ON "site_daily_reports"("status");

-- CreateIndex
CREATE UNIQUE INDEX "site_daily_reports_siteId_reportDate_key" ON "site_daily_reports"("siteId", "reportDate");

-- CreateIndex
CREATE INDEX "site_workforce_members_siteId_idx" ON "site_workforce_members"("siteId");

-- CreateIndex
CREATE INDEX "site_workforce_members_reportsToId_idx" ON "site_workforce_members"("reportsToId");

-- CreateIndex
CREATE UNIQUE INDEX "site_workforce_members_siteId_userId_key" ON "site_workforce_members"("siteId", "userId");

-- CreateIndex
CREATE INDEX "site_teams_siteId_idx" ON "site_teams"("siteId");

-- CreateIndex
CREATE UNIQUE INDEX "site_plannings_siteId_key" ON "site_plannings"("siteId");

-- CreateIndex
CREATE INDEX "site_phases_planningId_orderIndex_idx" ON "site_phases"("planningId", "orderIndex");

-- CreateIndex
CREATE INDEX "site_tasks_phaseId_idx" ON "site_tasks"("phaseId");

-- CreateIndex
CREATE INDEX "site_milestones_planningId_idx" ON "site_milestones"("planningId");

-- CreateIndex
CREATE INDEX "contract_amendments_siteId_status_idx" ON "contract_amendments"("siteId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "contract_amendments_siteId_reference_key" ON "contract_amendments"("siteId", "reference");

-- CreateIndex
CREATE INDEX "site_penalties_siteId_idx" ON "site_penalties"("siteId");

-- CreateIndex
CREATE INDEX "site_stock_alerts_siteId_resolved_idx" ON "site_stock_alerts"("siteId", "resolved");

-- CreateIndex
CREATE INDEX "deliveries_siteId_status_idx" ON "deliveries"("siteId", "status");

-- CreateIndex
CREATE INDEX "deliveries_siteId_scheduledAt_idx" ON "deliveries"("siteId", "scheduledAt");

-- CreateIndex
CREATE INDEX "site_documents_siteId_category_idx" ON "site_documents"("siteId", "category");

-- CreateIndex
CREATE INDEX "site_documents_siteId_uploadedAt_idx" ON "site_documents"("siteId", "uploadedAt");

-- CreateIndex
CREATE INDEX "moa_reports_siteId_reportType_idx" ON "moa_reports"("siteId", "reportType");

-- AddForeignKey
ALTER TABLE "site_daily_reports" ADD CONSTRAINT "site_daily_reports_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_daily_reports" ADD CONSTRAINT "site_daily_reports_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_daily_reports" ADD CONSTRAINT "site_daily_reports_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_workforce_members" ADD CONSTRAINT "site_workforce_members_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_workforce_members" ADD CONSTRAINT "site_workforce_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_workforce_members" ADD CONSTRAINT "site_workforce_members_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "site_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_teams" ADD CONSTRAINT "site_teams_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_plannings" ADD CONSTRAINT "site_plannings_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_phases" ADD CONSTRAINT "site_phases_planningId_fkey" FOREIGN KEY ("planningId") REFERENCES "site_plannings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_tasks" ADD CONSTRAINT "site_tasks_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "site_phases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_milestones" ADD CONSTRAINT "site_milestones_planningId_fkey" FOREIGN KEY ("planningId") REFERENCES "site_plannings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_amendments" ADD CONSTRAINT "contract_amendments_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_amendments" ADD CONSTRAINT "contract_amendments_initiatedById_fkey" FOREIGN KEY ("initiatedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_penalties" ADD CONSTRAINT "site_penalties_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_stock_alerts" ADD CONSTRAINT "site_stock_alerts_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_documents" ADD CONSTRAINT "site_documents_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_documents" ADD CONSTRAINT "site_documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moa_reports" ADD CONSTRAINT "moa_reports_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moa_reports" ADD CONSTRAINT "moa_reports_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
