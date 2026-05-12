-- GED — Référent documentaire (Bloc 0)
-- Profil ARCHIVIST (Christelle EYENGA, BatimCAM) : transverse, structure
-- la documentation de toute l'entreprise. Architecture 3 niveaux :
-- Espace → Catégorie/Classification → Document. Workflows configurables,
-- rétention SYSCOHADA + droit camerounais (DUA), traçabilité ISO 9001.

-- CreateEnum (GED)
CREATE TYPE "SpaceType" AS ENUM ('CONSTRUCTION_SITE', 'MARKETS_CONTRACTS', 'HR', 'ACCOUNTING', 'LEGAL', 'QSE', 'OTHER');
CREATE TYPE "Confidentiality" AS ENUM ('PUBLIC', 'INTERNAL', 'RESTRICTED', 'CONFIDENTIAL');
CREATE TYPE "ClassificationCategory" AS ENUM ('MARKETS', 'TECHNICAL', 'HR', 'ACCOUNTING', 'LEGAL', 'QSE', 'OTHER');
CREATE TYPE "DuaTrigger" AS ENUM ('CREATION_DATE', 'END_OF_FISCAL_YEAR', 'EMPLOYEE_DEPARTURE', 'PROJECT_CLOSURE', 'OTHER');
CREATE TYPE "WorkflowStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'REJECTED', 'CANCELLED', 'OVERDUE');
CREATE TYPE "StepStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SKIPPED');
CREATE TYPE "ArchivalStatus" AS ENUM ('ACTIVE', 'SEMI_ACTIVE', 'FINAL_ARCHIVE', 'PENDING_DESTRUCTION', 'DESTROYED');
CREATE TYPE "AccessStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED', 'EXPIRED');
CREATE TYPE "GedAuditAction" AS ENUM ('CONSULTATION', 'DOWNLOAD', 'IMPORT', 'MODIFICATION', 'DELETION', 'WORKFLOW_DECISION', 'DIFFUSION', 'ACCESS_REQUEST', 'ANOMALY');

-- AlterEnum: ARCHIVIST role
ALTER TYPE "Role" ADD VALUE 'ARCHIVIST';

-- AlterTable: User → canReadAllDocuments flag
ALTER TABLE "users" ADD COLUMN "canReadAllDocuments" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Document → GED fields
ALTER TABLE "documents"
  ADD COLUMN "spaceId" TEXT,
  ADD COLUMN "classificationId" TEXT,
  ADD COLUMN "internalReference" TEXT,
  ADD COLUMN "confidentiality" "Confidentiality" NOT NULL DEFAULT 'INTERNAL';

CREATE UNIQUE INDEX "documents_internalReference_key" ON "documents"("internalReference");
CREATE INDEX "documents_tenantId_spaceId_idx" ON "documents"("tenantId", "spaceId");
CREATE INDEX "documents_tenantId_classificationId_idx" ON "documents"("tenantId", "classificationId");

-- CreateTable: ged_document_spaces
CREATE TABLE "ged_document_spaces" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "responsibleId" TEXT,
    "siteId" TEXT,
    "spaceType" "SpaceType" NOT NULL,
    "confidentiality" "Confidentiality" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ged_document_spaces_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ged_document_spaces_tenantId_code_key" ON "ged_document_spaces"("tenantId", "code");
CREATE INDEX "ged_document_spaces_tenantId_spaceType_idx" ON "ged_document_spaces"("tenantId", "spaceType");

-- CreateTable: ged_document_classifications
CREATE TABLE "ged_document_classifications" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "ClassificationCategory" NOT NULL,
    "dua" TEXT NOT NULL,
    "duaYears" INTEGER,
    "duaTrigger" "DuaTrigger" NOT NULL,
    "confidentiality" "Confidentiality" NOT NULL,
    "workflowId" TEXT,
    "requiredValidators" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ged_document_classifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ged_document_classifications_tenantId_prefix_key" ON "ged_document_classifications"("tenantId", "prefix");
CREATE INDEX "ged_document_classifications_tenantId_category_idx" ON "ged_document_classifications"("tenantId", "category");

-- CreateTable: ged_workflow_templates
CREATE TABLE "ged_workflow_templates" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "steps" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ged_workflow_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ged_workflow_templates_tenantId_code_key" ON "ged_workflow_templates"("tenantId", "code");

-- CreateTable: ged_workflow_instances
CREATE TABLE "ged_workflow_instances" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "status" "WorkflowStatus" NOT NULL,
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "initiatorId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "ged_workflow_instances_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ged_workflow_instances_reference_key" ON "ged_workflow_instances"("reference");
CREATE INDEX "ged_workflow_instances_documentId_idx" ON "ged_workflow_instances"("documentId");
CREATE INDEX "ged_workflow_instances_status_dueAt_idx" ON "ged_workflow_instances"("status", "dueAt");

-- CreateTable: ged_workflow_steps
CREATE TABLE "ged_workflow_steps" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "stepIndex" INTEGER NOT NULL,
    "stepName" TEXT NOT NULL,
    "assignedToId" TEXT NOT NULL,
    "status" "StepStatus" NOT NULL DEFAULT 'PENDING',
    "decidedAt" TIMESTAMP(3),
    "comment" TEXT,
    CONSTRAINT "ged_workflow_steps_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ged_workflow_steps_instanceId_stepIndex_key" ON "ged_workflow_steps"("instanceId", "stepIndex");
CREATE INDEX "ged_workflow_steps_assignedToId_status_idx" ON "ged_workflow_steps"("assignedToId", "status");

-- CreateTable: ged_retention_records
CREATE TABLE "ged_retention_records" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "duaEndDate" TIMESTAMP(3) NOT NULL,
    "archivalStatus" "ArchivalStatus" NOT NULL DEFAULT 'ACTIVE',
    "archivedAt" TIMESTAMP(3),
    "destroyedAt" TIMESTAMP(3),
    "destructionPv" TEXT,
    "legalHold" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ged_retention_records_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ged_retention_records_documentId_key" ON "ged_retention_records"("documentId");
CREATE INDEX "ged_retention_records_archivalStatus_duaEndDate_idx" ON "ged_retention_records"("archivalStatus", "duaEndDate");

-- CreateTable: ged_access_requests
CREATE TABLE "ged_access_requests" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "AccessStatus" NOT NULL DEFAULT 'PENDING',
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decisionNotes" TEXT,
    "expiresAt" TIMESTAMP(3),
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ged_access_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ged_access_requests_documentId_idx" ON "ged_access_requests"("documentId");
CREATE INDEX "ged_access_requests_status_requestedAt_idx" ON "ged_access_requests"("status", "requestedAt");

-- CreateTable: ged_audit_events
CREATE TABLE "ged_audit_events" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" "GedAuditAction" NOT NULL,
    "documentId" TEXT,
    "spaceId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "anomaly" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "resolutionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ged_audit_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ged_audit_events_tenantId_createdAt_idx" ON "ged_audit_events"("tenantId", "createdAt");
CREATE INDEX "ged_audit_events_tenantId_action_createdAt_idx" ON "ged_audit_events"("tenantId", "action", "createdAt");
CREATE INDEX "ged_audit_events_tenantId_anomaly_idx" ON "ged_audit_events"("tenantId", "anomaly");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "ged_document_spaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_classificationId_fkey" FOREIGN KEY ("classificationId") REFERENCES "ged_document_classifications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ged_document_spaces" ADD CONSTRAINT "ged_document_spaces_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ged_document_spaces" ADD CONSTRAINT "ged_document_spaces_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ged_document_spaces" ADD CONSTRAINT "ged_document_spaces_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ged_document_classifications" ADD CONSTRAINT "ged_document_classifications_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ged_document_classifications" ADD CONSTRAINT "ged_document_classifications_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "ged_workflow_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ged_workflow_templates" ADD CONSTRAINT "ged_workflow_templates_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ged_workflow_instances" ADD CONSTRAINT "ged_workflow_instances_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ged_workflow_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ged_workflow_instances" ADD CONSTRAINT "ged_workflow_instances_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ged_workflow_instances" ADD CONSTRAINT "ged_workflow_instances_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ged_workflow_steps" ADD CONSTRAINT "ged_workflow_steps_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "ged_workflow_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ged_workflow_steps" ADD CONSTRAINT "ged_workflow_steps_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ged_retention_records" ADD CONSTRAINT "ged_retention_records_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ged_access_requests" ADD CONSTRAINT "ged_access_requests_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ged_access_requests" ADD CONSTRAINT "ged_access_requests_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ged_access_requests" ADD CONSTRAINT "ged_access_requests_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ged_audit_events" ADD CONSTRAINT "ged_audit_events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ged_audit_events" ADD CONSTRAINT "ged_audit_events_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ged_audit_events" ADD CONSTRAINT "ged_audit_events_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ged_audit_events" ADD CONSTRAINT "ged_audit_events_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "ged_document_spaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;
