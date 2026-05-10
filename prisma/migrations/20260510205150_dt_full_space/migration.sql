-- CreateEnum
CREATE TYPE "MoaType" AS ENUM ('PUBLIC', 'PRIVATE', 'PARAPUBLIC', 'INTERNATIONAL');

-- CreateEnum
CREATE TYPE "ContractTypeSite" AS ENUM ('FIRM_PRICE', 'UNIT_PRICE', 'COST_PLUS', 'DESIGN_BUILD');

-- CreateEnum
CREATE TYPE "SubSpecialty" AS ENUM ('EARTHWORKS_HEAVY', 'ROOFING_WATERPROOFING', 'ELECTRICAL', 'PLUMBING', 'HVAC', 'PAINTING', 'TILING', 'JOINERY', 'METALWORK', 'GLAZING', 'DEMOLITION', 'CRANE', 'OTHER');

-- CreateEnum
CREATE TYPE "PromotionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CptEntryStatus" AS ENUM ('DRAFT', 'VALIDATED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE', 'OFF_BALANCE');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('RECEIVED', 'PENDING_3WAY_MATCH', 'ACCOUNTED', 'PENDING_PAYMENT', 'PAID', 'DISPUTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "BillingStatus" AS ENUM ('DRAFT', 'VALIDATED', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'DISPUTED');

-- CreateEnum
CREATE TYPE "CashDirection" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "DtAlertType" AS ENUM ('SITE_BUDGET_DEVIATION', 'SITE_DELIVERY_DELAY', 'MARGIN_BELOW_TARGET', 'TEAM_CAPACITY_OVERLOAD', 'MARKET_VALIDATION_PENDING', 'HSE_INCIDENT', 'QUALITY_NON_CONFORMITY');

-- CreateEnum
CREATE TYPE "TenderStage" AS ENUM ('OPPORTUNITY', 'DCE_ANALYSIS', 'SITE_VISIT', 'TECHNICAL_STUDY', 'PRICING', 'SUBCONTRACTOR_QUOTES', 'INTERNAL_VALIDATION', 'SUBMITTED', 'RESULTS_PENDING', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "WorkType" AS ENUM ('BUILDING', 'ROADWORK', 'CIVIL_ENGINEERING', 'HYDRAULIC', 'LAYOUT', 'INDUSTRIAL', 'OTHER');

-- CreateEnum
CREATE TYPE "MethodCategory" AS ENUM ('EARTHWORKS', 'FOUNDATIONS', 'STRUCTURE', 'FORMWORK', 'REBAR', 'FINISHING', 'ROADWORK', 'HYDRAULIC', 'SAFETY', 'OTHER');

-- CreateEnum
CREATE TYPE "MethodStatus" AS ENUM ('DRAFT', 'ACTIVE', 'OBSOLETE', 'UNDER_REVIEW');

-- CreateEnum
CREATE TYPE "CrewSpecialty" AS ENUM ('CONCRETE', 'FORMWORK', 'REBAR', 'FINISHING', 'ROADWORK', 'HYDRAULIC', 'ELECTRICAL', 'OTHER');

-- CreateEnum
CREATE TYPE "IncidentType" AS ENUM ('NEAR_MISS', 'MINOR_INJURY', 'MAJOR_INJURY', 'FATAL_ACCIDENT', 'MATERIAL_DAMAGE', 'ENVIRONMENT_INCIDENT');

-- CreateEnum
CREATE TYPE "IncidentSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('OPEN', 'UNDER_INVESTIGATION', 'ACTIONS_DEFINED', 'ACTIONS_IN_PROGRESS', 'CLOSED');

-- CreateEnum
CREATE TYPE "AuditCategory" AS ENUM ('INTERNAL_QHSE', 'EXTERNAL_ISO', 'MOA_INSPECTION', 'REGULATORY');

-- CreateEnum
CREATE TYPE "NcCategory" AS ENUM ('QUALITY', 'SAFETY', 'ENVIRONMENT', 'REGULATORY', 'DOCUMENTATION');

-- CreateEnum
CREATE TYPE "Criticality" AS ENUM ('MINOR', 'MAJOR', 'CRITICAL');

-- CreateEnum
CREATE TYPE "NcStatus" AS ENUM ('OPEN', 'ACTION_PLANNED', 'IN_PROGRESS', 'CLOSED', 'REJECTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ReportType" ADD VALUE 'CPT_GENERAL_LEDGER';
ALTER TYPE "ReportType" ADD VALUE 'CPT_BALANCE_GENERAL';
ALTER TYPE "ReportType" ADD VALUE 'CPT_BALANCE_AUX_SUPPLIERS';
ALTER TYPE "ReportType" ADD VALUE 'CPT_BALANCE_AUX_CUSTOMERS';
ALTER TYPE "ReportType" ADD VALUE 'CPT_JOURNAL_CENTRALIZER';
ALTER TYPE "ReportType" ADD VALUE 'CPT_MONTHLY_SYNTHESIS';
ALTER TYPE "ReportType" ADD VALUE 'CPT_DSF_PREP';
ALTER TYPE "ReportType" ADD VALUE 'CPT_AGED_BALANCE_SUPPLIERS';
ALTER TYPE "ReportType" ADD VALUE 'CPT_AGED_BALANCE_CUSTOMERS';
ALTER TYPE "ReportType" ADD VALUE 'CPT_ANALYTICAL_CONSOLIDATED';
ALTER TYPE "ReportType" ADD VALUE 'CPT_SITE_LEDGER';
ALTER TYPE "ReportType" ADD VALUE 'CPT_SITE_BALANCE';
ALTER TYPE "ReportType" ADD VALUE 'CPT_SITE_EXPENSES';
ALTER TYPE "ReportType" ADD VALUE 'CPT_SITE_BILLINGS';
ALTER TYPE "ReportType" ADD VALUE 'CPT_SITE_MONTHLY';
ALTER TYPE "ReportType" ADD VALUE 'DT_WEEKLY_TECHNICAL';
ALTER TYPE "ReportType" ADD VALUE 'DT_MONTHLY_PRODUCTION';
ALTER TYPE "ReportType" ADD VALUE 'DT_QUARTERLY_TECHNICAL';
ALTER TYPE "ReportType" ADD VALUE 'DT_HSE_MONTHLY';
ALTER TYPE "ReportType" ADD VALUE 'DT_TENDERS_QUARTERLY';
ALTER TYPE "ReportType" ADD VALUE 'DT_ISO_ANNUAL';
ALTER TYPE "ReportType" ADD VALUE 'DT_MOA_MONTHLY';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ValidationType" ADD VALUE 'AMENDMENT';
ALTER TYPE "ValidationType" ADD VALUE 'SUBCONTRACTING';
ALTER TYPE "ValidationType" ADD VALUE 'EQUIPMENT';
ALTER TYPE "ValidationType" ADD VALUE 'SPECIAL_METHOD';
ALTER TYPE "ValidationType" ADD VALUE 'TECHNICAL_HANDOVER';

-- AlterTable
ALTER TABLE "sites" ADD COLUMN     "actualSpentAmount" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN     "contractTypeKind" "ContractTypeSite",
ADD COLUMN     "deviationPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "financialProgress" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "marginTarget" DOUBLE PRECISION NOT NULL DEFAULT 20,
ADD COLUMN     "moaName" TEXT,
ADD COLUMN     "moaTypeKind" "MoaType",
ADD COLUMN     "physicalProgress" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "suppliers" ADD COLUMN     "agreements" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "alertNotes" TEXT,
ADD COLUMN     "fiscalCompliance" JSONB,
ADD COLUMN     "internalRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "isSubcontractor" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ratingsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "specialties" "SubSpecialty"[] DEFAULT ARRAY[]::"SubSpecialty"[];

-- AlterTable
ALTER TABLE "user_preferences" ADD COLUMN     "cptAlerts" JSONB,
ADD COLUMN     "dtAlerts" JSONB;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "assignedSiteIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "validations" ADD COLUMN     "dtAttachments" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "dtComments" TEXT,
ADD COLUMN     "dtValidatedAt" TIMESTAMP(3),
ADD COLUMN     "dtValidatedBy" TEXT,
ADD COLUMN     "dtValidationRequired" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "role_promotion_requests" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "fromRole" "Role" NOT NULL,
    "toRole" "Role" NOT NULL,
    "requestedSiteIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "justification" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validatorRoles" "Role"[],
    "validations" JSONB NOT NULL DEFAULT '[]',
    "status" "PromotionStatus" NOT NULL DEFAULT 'PENDING',
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_promotion_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cpt_entries" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "siteId" TEXT,
    "journalCode" TEXT NOT NULL,
    "entryDate" TIMESTAMP(3) NOT NULL,
    "reference" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "CptEntryStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "validatedById" TEXT,
    "validatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cpt_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cpt_entry_lines" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "accountCode" TEXT NOT NULL,
    "thirdPartyId" TEXT,
    "description" TEXT NOT NULL,
    "debit" BIGINT NOT NULL DEFAULT 0,
    "credit" BIGINT NOT NULL DEFAULT 0,
    "siteId" TEXT,
    "lettering" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cpt_entry_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cpt_chart_of_accounts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "class" INTEGER NOT NULL,
    "type" "AccountType" NOT NULL,
    "requiresThirdParty" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cpt_chart_of_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cpt_supplier_invoices" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "amountHt" BIGINT NOT NULL,
    "vatAmount" BIGINT NOT NULL,
    "amountTtc" BIGINT NOT NULL,
    "siteId" TEXT,
    "poRef" TEXT,
    "deliveryRef" TEXT,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'RECEIVED',
    "entryId" TEXT,
    "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accountedAt" TIMESTAMP(3),
    "accountedBy" TEXT,
    "paidAt" TIMESTAMP(3),
    "disputeReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cpt_supplier_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cpt_progress_billings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "billingNumber" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "amountHt" BIGINT NOT NULL,
    "vatAmount" BIGINT NOT NULL,
    "amountTtc" BIGINT NOT NULL,
    "guaranteeRetention" BIGINT NOT NULL DEFAULT 0,
    "sourceWithholding" BIGINT NOT NULL DEFAULT 0,
    "netToReceive" BIGINT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "BillingStatus" NOT NULL DEFAULT 'DRAFT',
    "items" JSONB NOT NULL DEFAULT '[]',
    "pdfUrl" TEXT,
    "paidAt" TIMESTAMP(3),
    "paidAmount" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cpt_progress_billings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cpt_site_cashboxes" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "balance" BIGINT NOT NULL DEFAULT 0,
    "custodianId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cpt_site_cashboxes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cpt_cashbox_movements" (
    "id" TEXT NOT NULL,
    "cashboxId" TEXT NOT NULL,
    "direction" "CashDirection" NOT NULL,
    "amount" BIGINT NOT NULL,
    "reason" TEXT NOT NULL,
    "reference" TEXT,
    "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cpt_cashbox_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dt_settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "alertsConfig" JSONB,
    "dashboardLayout" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dt_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dt_alerts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "DtAlertType" NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "details" TEXT,
    "link" TEXT,
    "siteId" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dt_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenders" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "moaName" TEXT NOT NULL,
    "moaType" "MoaType" NOT NULL,
    "workType" "WorkType" NOT NULL,
    "estimatedBudget" BIGINT NOT NULL,
    "submissionDeadline" TIMESTAMP(3) NOT NULL,
    "stage" "TenderStage" NOT NULL DEFAULT 'OPPORTUNITY',
    "probability" INTEGER NOT NULL DEFAULT 0,
    "studyCost" BIGINT NOT NULL DEFAULT 0,
    "ourBidAmount" BIGINT,
    "ourMargin" DOUBLE PRECISION,
    "awarded" BOOLEAN,
    "awardedTo" TEXT,
    "studyOwnerId" TEXT NOT NULL,
    "documents" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tender_items" (
    "id" TEXT NOT NULL,
    "tenderId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitPrice" BIGINT NOT NULL,
    "totalPrice" BIGINT NOT NULL,

    CONSTRAINT "tender_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitors" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stats" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competitors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operating_methods" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "category" "MethodCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "description" TEXT,
    "procedure" TEXT NOT NULL,
    "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "authorId" TEXT NOT NULL,
    "status" "MethodStatus" NOT NULL DEFAULT 'ACTIVE',
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "lastReviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operating_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_plannings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "siteTypology" TEXT NOT NULL,
    "totalDuration" INTEGER NOT NULL,
    "phases" JSONB NOT NULL,
    "authorId" TEXT NOT NULL,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "template_plannings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reference_ratios" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workItem" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "refValue" DOUBLE PRECISION NOT NULL,
    "observedValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "observationsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reference_ratios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_rex" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "issues" TEXT NOT NULL,
    "solutions" TEXT NOT NULL,
    "recommendations" TEXT NOT NULL,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "closedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_rex_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crews" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "specialty" "CrewSpecialty" NOT NULL,
    "capacityHoursPerWeek" DOUBLE PRECISION NOT NULL DEFAULT 40,
    "leaderId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crew_assignments" (
    "id" TEXT NOT NULL,
    "crewId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "weekIso" TEXT NOT NULL,
    "plannedHours" DOUBLE PRECISION NOT NULL,
    "actualHours" DOUBLE PRECISION,
    "overloadPercent" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crew_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subcontractor_evaluations" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "evaluatorId" TEXT NOT NULL,
    "qualityScore" INTEGER NOT NULL,
    "delayScore" INTEGER NOT NULL,
    "safetyScore" INTEGER NOT NULL,
    "behaviorScore" INTEGER NOT NULL,
    "overallScore" DOUBLE PRECISION NOT NULL,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subcontractor_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hse_incidents" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "type" "IncidentType" NOT NULL,
    "severity" "IncidentSeverity" NOT NULL,
    "victimsCount" INTEGER NOT NULL DEFAULT 0,
    "workdaysLost" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL,
    "immediateActions" TEXT,
    "rootCause" TEXT,
    "correctiveActions" JSONB NOT NULL DEFAULT '[]',
    "reportedById" TEXT NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
    "declaredCnps" BOOLEAN NOT NULL DEFAULT false,
    "declaredCnpsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hse_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_audits" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "auditType" "AuditCategory" NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "auditorId" TEXT NOT NULL,
    "score" DOUBLE PRECISION,
    "findings" JSONB NOT NULL DEFAULT '[]',
    "reportUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "non_conformities" (
    "id" TEXT NOT NULL,
    "siteId" TEXT,
    "auditId" TEXT,
    "category" "NcCategory" NOT NULL,
    "criticality" "Criticality" NOT NULL,
    "description" TEXT NOT NULL,
    "correctiveAction" TEXT,
    "ownerId" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "status" "NcStatus" NOT NULL DEFAULT 'OPEN',
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "non_conformities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certifications" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "standard" TEXT NOT NULL,
    "scope" TEXT,
    "issuedBy" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "surveillanceAuditDate" TIMESTAMP(3),
    "openNcCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "role_promotion_requests_tenantId_status_idx" ON "role_promotion_requests"("tenantId", "status");

-- CreateIndex
CREATE INDEX "role_promotion_requests_targetUserId_idx" ON "role_promotion_requests"("targetUserId");

-- CreateIndex
CREATE INDEX "cpt_entries_tenantId_journalCode_entryDate_idx" ON "cpt_entries"("tenantId", "journalCode", "entryDate");

-- CreateIndex
CREATE INDEX "cpt_entries_siteId_idx" ON "cpt_entries"("siteId");

-- CreateIndex
CREATE UNIQUE INDEX "cpt_entries_tenantId_journalCode_reference_key" ON "cpt_entries"("tenantId", "journalCode", "reference");

-- CreateIndex
CREATE INDEX "cpt_entry_lines_accountCode_idx" ON "cpt_entry_lines"("accountCode");

-- CreateIndex
CREATE INDEX "cpt_entry_lines_entryId_idx" ON "cpt_entry_lines"("entryId");

-- CreateIndex
CREATE INDEX "cpt_entry_lines_siteId_idx" ON "cpt_entry_lines"("siteId");

-- CreateIndex
CREATE INDEX "cpt_chart_of_accounts_tenantId_class_idx" ON "cpt_chart_of_accounts"("tenantId", "class");

-- CreateIndex
CREATE UNIQUE INDEX "cpt_chart_of_accounts_tenantId_code_key" ON "cpt_chart_of_accounts"("tenantId", "code");

-- CreateIndex
CREATE INDEX "cpt_supplier_invoices_tenantId_status_idx" ON "cpt_supplier_invoices"("tenantId", "status");

-- CreateIndex
CREATE INDEX "cpt_supplier_invoices_siteId_idx" ON "cpt_supplier_invoices"("siteId");

-- CreateIndex
CREATE UNIQUE INDEX "cpt_progress_billings_billingNumber_key" ON "cpt_progress_billings"("billingNumber");

-- CreateIndex
CREATE INDEX "cpt_progress_billings_tenantId_status_idx" ON "cpt_progress_billings"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "cpt_site_cashboxes_siteId_key" ON "cpt_site_cashboxes"("siteId");

-- CreateIndex
CREATE INDEX "cpt_cashbox_movements_cashboxId_occurredAt_idx" ON "cpt_cashbox_movements"("cashboxId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "dt_settings_userId_key" ON "dt_settings"("userId");

-- CreateIndex
CREATE INDEX "dt_alerts_tenantId_resolved_idx" ON "dt_alerts"("tenantId", "resolved");

-- CreateIndex
CREATE INDEX "dt_alerts_tenantId_type_idx" ON "dt_alerts"("tenantId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "tenders_reference_key" ON "tenders"("reference");

-- CreateIndex
CREATE INDEX "tenders_tenantId_stage_idx" ON "tenders"("tenantId", "stage");

-- CreateIndex
CREATE INDEX "tenders_tenantId_submissionDeadline_idx" ON "tenders"("tenantId", "submissionDeadline");

-- CreateIndex
CREATE INDEX "tender_items_tenderId_idx" ON "tender_items"("tenderId");

-- CreateIndex
CREATE UNIQUE INDEX "competitors_tenantId_name_key" ON "competitors"("tenantId", "name");

-- CreateIndex
CREATE INDEX "operating_methods_tenantId_category_idx" ON "operating_methods"("tenantId", "category");

-- CreateIndex
CREATE INDEX "template_plannings_tenantId_idx" ON "template_plannings"("tenantId");

-- CreateIndex
CREATE INDEX "reference_ratios_tenantId_workItem_idx" ON "reference_ratios"("tenantId", "workItem");

-- CreateIndex
CREATE INDEX "site_rex_siteId_idx" ON "site_rex"("siteId");

-- CreateIndex
CREATE INDEX "crews_tenantId_active_idx" ON "crews"("tenantId", "active");

-- CreateIndex
CREATE INDEX "crew_assignments_crewId_weekIso_idx" ON "crew_assignments"("crewId", "weekIso");

-- CreateIndex
CREATE UNIQUE INDEX "crew_assignments_crewId_siteId_weekIso_key" ON "crew_assignments"("crewId", "siteId", "weekIso");

-- CreateIndex
CREATE INDEX "subcontractor_evaluations_supplierId_createdAt_idx" ON "subcontractor_evaluations"("supplierId", "createdAt");

-- CreateIndex
CREATE INDEX "hse_incidents_siteId_occurredAt_idx" ON "hse_incidents"("siteId", "occurredAt");

-- CreateIndex
CREATE INDEX "hse_incidents_severity_status_idx" ON "hse_incidents"("severity", "status");

-- CreateIndex
CREATE INDEX "site_audits_siteId_scheduledAt_idx" ON "site_audits"("siteId", "scheduledAt");

-- CreateIndex
CREATE INDEX "non_conformities_siteId_status_idx" ON "non_conformities"("siteId", "status");

-- CreateIndex
CREATE INDEX "certifications_tenantId_standard_idx" ON "certifications"("tenantId", "standard");

-- CreateIndex
CREATE INDEX "suppliers_tenantId_isSubcontractor_idx" ON "suppliers"("tenantId", "isSubcontractor");

-- AddForeignKey
ALTER TABLE "role_promotion_requests" ADD CONSTRAINT "role_promotion_requests_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_promotion_requests" ADD CONSTRAINT "role_promotion_requests_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cpt_entries" ADD CONSTRAINT "cpt_entries_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cpt_entries" ADD CONSTRAINT "cpt_entries_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cpt_entries" ADD CONSTRAINT "cpt_entries_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cpt_entry_lines" ADD CONSTRAINT "cpt_entry_lines_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "cpt_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cpt_entry_lines" ADD CONSTRAINT "cpt_entry_lines_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cpt_supplier_invoices" ADD CONSTRAINT "cpt_supplier_invoices_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cpt_supplier_invoices" ADD CONSTRAINT "cpt_supplier_invoices_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cpt_progress_billings" ADD CONSTRAINT "cpt_progress_billings_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cpt_site_cashboxes" ADD CONSTRAINT "cpt_site_cashboxes_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cpt_cashbox_movements" ADD CONSTRAINT "cpt_cashbox_movements_cashboxId_fkey" FOREIGN KEY ("cashboxId") REFERENCES "cpt_site_cashboxes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cpt_cashbox_movements" ADD CONSTRAINT "cpt_cashbox_movements_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dt_settings" ADD CONSTRAINT "dt_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dt_alerts" ADD CONSTRAINT "dt_alerts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenders" ADD CONSTRAINT "tenders_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenders" ADD CONSTRAINT "tenders_studyOwnerId_fkey" FOREIGN KEY ("studyOwnerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tender_items" ADD CONSTRAINT "tender_items_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "tenders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitors" ADD CONSTRAINT "competitors_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operating_methods" ADD CONSTRAINT "operating_methods_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operating_methods" ADD CONSTRAINT "operating_methods_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_plannings" ADD CONSTRAINT "template_plannings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_plannings" ADD CONSTRAINT "template_plannings_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reference_ratios" ADD CONSTRAINT "reference_ratios_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_rex" ADD CONSTRAINT "site_rex_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_rex" ADD CONSTRAINT "site_rex_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crews" ADD CONSTRAINT "crews_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crews" ADD CONSTRAINT "crews_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crew_assignments" ADD CONSTRAINT "crew_assignments_crewId_fkey" FOREIGN KEY ("crewId") REFERENCES "crews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crew_assignments" ADD CONSTRAINT "crew_assignments_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcontractor_evaluations" ADD CONSTRAINT "subcontractor_evaluations_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcontractor_evaluations" ADD CONSTRAINT "subcontractor_evaluations_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcontractor_evaluations" ADD CONSTRAINT "subcontractor_evaluations_evaluatorId_fkey" FOREIGN KEY ("evaluatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hse_incidents" ADD CONSTRAINT "hse_incidents_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hse_incidents" ADD CONSTRAINT "hse_incidents_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_audits" ADD CONSTRAINT "site_audits_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_audits" ADD CONSTRAINT "site_audits_auditorId_fkey" FOREIGN KEY ("auditorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "non_conformities" ADD CONSTRAINT "non_conformities_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "non_conformities" ADD CONSTRAINT "non_conformities_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certifications" ADD CONSTRAINT "certifications_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
