-- SG — Secrétaire Général (Bloc 0)
-- Profil SECRETARY_GENERAL (Élisabeth NDONGMO, BatimCAM SA OHADA) :
-- gouvernance corporate (CA/AG/registres), marchés clients (MOA), garanties
-- bancaires, contentieux juridiques, conformité réglementaire, courriers
-- officiels, relations institutionnelles. 11 nouveaux modèles + 22 enums.

-- AlterEnum: SECRETARY_GENERAL role
ALTER TYPE "Role" ADD VALUE 'SECRETARY_GENERAL';

-- AlterTable: User → 5 flags SG
ALTER TABLE "users"
  ADD COLUMN "canManageCorporateGovernance"    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "canManageMarketContracts"        BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "canManageLegalCases"             BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "canManageOfficialCorrespondence" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "canReadAllDashboards"            BOOLEAN NOT NULL DEFAULT false;

-- CreateEnum (SG)
CREATE TYPE "ContractingAuthorityType" AS ENUM ('PUBLIC_MINISTRY', 'PUBLIC_MUNICIPALITY', 'PUBLIC_INSTITUTION', 'PRIVATE_COMPANY', 'PRIVATE_INDIVIDUAL');
CREATE TYPE "ContractPhase" AS ENUM ('CALL_FOR_TENDERS_WATCH', 'STUDY_AND_SUBMISSION', 'AWAITING_ATTRIBUTION', 'CONTRACT_SIGNATURE', 'ORDER_SERVICE', 'EXECUTION', 'RECEPTION', 'GUARANTEE_PERIOD', 'CLOSED');
CREATE TYPE "LegalContractStatus" AS ENUM ('OK', 'LITIGATION', 'AMENDMENT_PENDING', 'EXPIRED_GUARANTEE');
CREATE TYPE "MarketContractStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ACTIVE', 'PAUSED', 'CLOSED', 'CANCELLED');
CREATE TYPE "MarketAmendmentStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'SIGNED', 'REJECTED');
CREATE TYPE "GuaranteeType" AS ENUM ('SUBMISSION', 'PERFORMANCE', 'RETENTION', 'ADVANCE_PAYMENT');
CREATE TYPE "GuaranteeStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'RELEASED', 'REVOKED');
CREATE TYPE "MeetingType" AS ENUM ('BOARD_MEETING', 'ORDINARY_AG', 'EXTRAORDINARY_AG');
CREATE TYPE "MeetingStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'POSTPONED');
CREATE TYPE "DecisionType" AS ENUM ('APPROVAL', 'RATIFICATION', 'AUTHORIZATION', 'NOMINATION', 'REVOCATION', 'OTHER');
CREATE TYPE "BoardMemberFunction" AS ENUM ('PRESIDENT_CEO', 'PRESIDENT_BOARD', 'DIRECTOR_GENERAL', 'ADMINISTRATOR', 'INDEPENDENT_DIRECTOR', 'BOARD_SECRETARY');
CREATE TYPE "BoardMemberStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'RESIGNED', 'REVOKED', 'DECEASED');
CREATE TYPE "ShareholderEntityType" AS ENUM ('INDIVIDUAL', 'CORPORATION', 'INVESTMENT_FUND', 'EMPLOYEE_PLAN');
CREATE TYPE "ShareholderStatus" AS ENUM ('ACTIVE', 'TRANSFERRED', 'INHERITED', 'DECEASED');
CREATE TYPE "LegalPosition" AS ENUM ('DEMANDEUR', 'DEFENDEUR', 'MEDIATION', 'ARBITRATION');
CREATE TYPE "LegalCaseStatus" AS ENUM ('OPEN', 'MEDIATION', 'COURT_PENDING', 'APPEAL', 'SUPREME_COURT', 'SETTLED', 'WON', 'LOST', 'ABANDONED');
CREATE TYPE "RegisterType" AS ENUM ('AG_DECISIONS', 'SHAREHOLDERS', 'BOARD_DECISIONS', 'PERSONNEL', 'HSE_SITES', 'REGULATED_AGREEMENTS', 'BANK_GUARANTEES', 'PUBLIC_MARKETS');
CREATE TYPE "RegisterStatus" AS ENUM ('UP_TO_DATE', 'TO_UPDATE', 'OVERDUE');
CREATE TYPE "CorrespondenceDirection" AS ENUM ('INCOMING', 'OUTGOING');
CREATE TYPE "CorrespondenceConfidentiality" AS ENUM ('PUBLIC', 'STANDARD', 'SENSITIVE', 'CONFIDENTIAL');
CREATE TYPE "CorrespondenceStatus" AS ENUM ('RECEIVED', 'IN_PROGRESS', 'AWAITING_DG_SIGNATURE', 'SIGNED', 'SENT', 'ARCHIVED');
CREATE TYPE "InstitutionType" AS ENUM ('MINISTRY', 'MUNICIPALITY', 'PUBLIC_INSTITUTION', 'PROFESSIONAL_ASSOCIATION', 'LAW_FIRM', 'AUDIT_FIRM', 'BANK', 'OTHER');
CREATE TYPE "InstitutionCategory" AS ENUM ('CLIENT', 'REGULATORY', 'ASSOCIATION', 'SUPPLIER', 'PARTNER');
CREATE TYPE "RelationshipStatus" AS ENUM ('ACTIVE', 'WATCH', 'SENSITIVE', 'INACTIVE');
CREATE TYPE "ApprovalStatus" AS ENUM ('VALID', 'EXPIRING_SOON', 'EXPIRED', 'RENEWED');

-- CreateTable: sg_client_contracts
CREATE TABLE "sg_client_contracts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "contractingAuthority" TEXT NOT NULL,
    "authorityType" "ContractingAuthorityType" NOT NULL,
    "amountHT" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "vatRate" DOUBLE PRECISION NOT NULL DEFAULT 19.25,
    "phase" "ContractPhase" NOT NULL,
    "callForTendersOpenDate" TIMESTAMP(3),
    "callForTendersCloseDate" TIMESTAMP(3),
    "submissionDate" TIMESTAMP(3),
    "notificationDate" TIMESTAMP(3),
    "signatureDate" TIMESTAMP(3),
    "orderServiceDate" TIMESTAMP(3),
    "executionStartDate" TIMESTAMP(3),
    "receptionPV" TIMESTAMP(3),
    "gpaEndDate" TIMESTAMP(3),
    "siteId" TEXT,
    "callForTendersDocUrl" TEXT,
    "submissionDocUrl" TEXT,
    "signedContractDocUrl" TEXT,
    "receptionPvDocUrl" TEXT,
    "submissionGuaranteeAmount" BIGINT,
    "performanceGuaranteeAmount" BIGINT,
    "retentionGuaranteeAmount" BIGINT,
    "legalStatus" "LegalContractStatus" NOT NULL DEFAULT 'OK',
    "status" "MarketContractStatus" NOT NULL DEFAULT 'DRAFT',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "sg_client_contracts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sg_client_contracts_reference_key" ON "sg_client_contracts"("reference");
CREATE INDEX "sg_client_contracts_tenantId_phase_idx" ON "sg_client_contracts"("tenantId", "phase");
CREATE INDEX "sg_client_contracts_tenantId_status_idx" ON "sg_client_contracts"("tenantId", "status");

-- CreateTable: sg_market_contract_amendments
CREATE TABLE "sg_market_contract_amendments" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "amendmentNumber" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "additionalAmount" BIGINT NOT NULL,
    "additionalDelayDays" INTEGER,
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "status" "MarketAmendmentStatus" NOT NULL DEFAULT 'DRAFT',
    "documentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "sg_market_contract_amendments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sg_market_contract_amendments_contractId_amendmentNumber_key" ON "sg_market_contract_amendments"("contractId", "amendmentNumber");
CREATE INDEX "sg_market_contract_amendments_contractId_status_idx" ON "sg_market_contract_amendments"("contractId", "status");

-- CreateTable: sg_bank_guarantees
CREATE TABLE "sg_bank_guarantees" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "type" "GuaranteeType" NOT NULL,
    "amount" BIGINT NOT NULL,
    "issuingBank" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "releaseDate" TIMESTAMP(3),
    "status" "GuaranteeStatus" NOT NULL DEFAULT 'ACTIVE',
    "documentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "sg_bank_guarantees_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "sg_bank_guarantees_contractId_status_idx" ON "sg_bank_guarantees"("contractId", "status");
CREATE INDEX "sg_bank_guarantees_status_expiryDate_idx" ON "sg_bank_guarantees"("status", "expiryDate");

-- CreateTable: sg_governance_meetings
CREATE TABLE "sg_governance_meetings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "MeetingType" NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL,
    "convocationsSentAt" TIMESTAMP(3),
    "convocationsRecipients" JSONB NOT NULL,
    "agenda" JSONB NOT NULL,
    "agendaApprovedBy" TEXT,
    "agendaApprovedAt" TIMESTAMP(3),
    "status" "MeetingStatus" NOT NULL DEFAULT 'SCHEDULED',
    "attendees" JSONB,
    "quorum" DOUBLE PRECISION,
    "pvDocumentUrl" TEXT,
    "pvSignedAt" TIMESTAMP(3),
    "pvSignedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "sg_governance_meetings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "sg_governance_meetings_tenantId_type_scheduledAt_idx" ON "sg_governance_meetings"("tenantId", "type", "scheduledAt");
CREATE INDEX "sg_governance_meetings_tenantId_status_idx" ON "sg_governance_meetings"("tenantId", "status");

-- CreateTable: sg_meeting_decisions
CREATE TABLE "sg_meeting_decisions" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "decisionNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "decisionType" "DecisionType" NOT NULL,
    "votingResult" JSONB,
    "followUpUserId" TEXT,
    "followUpStatus" TEXT,
    "decidedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "sg_meeting_decisions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sg_meeting_decisions_meetingId_decisionNumber_key" ON "sg_meeting_decisions"("meetingId", "decisionNumber");

-- CreateTable: sg_board_members
CREATE TABLE "sg_board_members" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "fullName" TEXT NOT NULL,
    "function" "BoardMemberFunction" NOT NULL,
    "representingEntity" TEXT,
    "isIndependent" BOOLEAN NOT NULL DEFAULT false,
    "mandateStartDate" TIMESTAMP(3) NOT NULL,
    "mandateEndDate" TIMESTAMP(3) NOT NULL,
    "mandateRenewable" BOOLEAN NOT NULL DEFAULT true,
    "biography" TEXT,
    "status" "BoardMemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "sg_board_members_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "sg_board_members_tenantId_status_idx" ON "sg_board_members"("tenantId", "status");

-- CreateTable: sg_shareholders
CREATE TABLE "sg_shareholders" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "entityType" "ShareholderEntityType" NOT NULL,
    "numberOfShares" INTEGER NOT NULL,
    "totalShares" INTEGER NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "nationality" TEXT,
    "idNumber" TEXT,
    "address" TEXT,
    "phoneEmail" TEXT,
    "acquisitionDate" TIMESTAMP(3) NOT NULL,
    "acquisitionPrice" BIGINT,
    "status" "ShareholderStatus" NOT NULL DEFAULT 'ACTIVE',
    "isVoting" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "sg_shareholders_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "sg_shareholders_tenantId_status_idx" ON "sg_shareholders"("tenantId", "status");

-- CreateTable: sg_legal_cases
CREATE TABLE "sg_legal_cases" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "ourPosition" "LegalPosition" NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "caseNumber" TEXT,
    "opposingParty" TEXT NOT NULL,
    "opposingPartyType" "ContractingAuthorityType",
    "amountAtStake" BIGINT NOT NULL,
    "provisionAmount" BIGINT NOT NULL,
    "lawyerName" TEXT NOT NULL,
    "lawFirm" TEXT NOT NULL,
    "lawyerContactInfo" JSONB,
    "status" "LegalCaseStatus" NOT NULL DEFAULT 'OPEN',
    "nextHearingDate" TIMESTAMP(3),
    "strategy" TEXT,
    "relatedContractId" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "sg_legal_cases_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sg_legal_cases_reference_key" ON "sg_legal_cases"("reference");
CREATE INDEX "sg_legal_cases_tenantId_status_idx" ON "sg_legal_cases"("tenantId", "status");

-- CreateTable: sg_legal_case_events
CREATE TABLE "sg_legal_case_events" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "documentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sg_legal_case_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "sg_legal_case_events_caseId_eventDate_idx" ON "sg_legal_case_events"("caseId", "eventDate");

-- CreateTable: sg_regulatory_registers
CREATE TABLE "sg_regulatory_registers" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "registerType" "RegisterType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "legalBasis" TEXT NOT NULL,
    "responsibleUserId" TEXT NOT NULL,
    "entriesCount" INTEGER NOT NULL DEFAULT 0,
    "lastEntryDate" TIMESTAMP(3),
    "status" "RegisterStatus" NOT NULL DEFAULT 'UP_TO_DATE',
    "nextReviewDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "sg_regulatory_registers_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "sg_regulatory_registers_tenantId_status_idx" ON "sg_regulatory_registers"("tenantId", "status");

-- CreateTable: sg_official_correspondences
CREATE TABLE "sg_official_correspondences" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "direction" "CorrespondenceDirection" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "correspondentName" TEXT NOT NULL,
    "correspondentEntity" TEXT,
    "subject" TEXT NOT NULL,
    "summary" TEXT,
    "confidentiality" "CorrespondenceConfidentiality" NOT NULL DEFAULT 'STANDARD',
    "assignedToUserId" TEXT,
    "status" "CorrespondenceStatus" NOT NULL DEFAULT 'RECEIVED',
    "dueDate" TIMESTAMP(3),
    "handledAt" TIMESTAMP(3),
    "requiresDgSignature" BOOLEAN NOT NULL DEFAULT false,
    "submittedToDgAt" TIMESTAMP(3),
    "signedByDgAt" TIMESTAMP(3),
    "dgSignatureRef" TEXT,
    "documentUrl" TEXT,
    "archivedInGedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "sg_official_correspondences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sg_official_correspondences_reference_key" ON "sg_official_correspondences"("reference");
CREATE INDEX "sg_official_correspondences_tenantId_direction_date_idx" ON "sg_official_correspondences"("tenantId", "direction", "date");
CREATE INDEX "sg_official_correspondences_tenantId_status_idx" ON "sg_official_correspondences"("tenantId", "status");

-- CreateTable: sg_institutions
CREATE TABLE "sg_institutions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "InstitutionType" NOT NULL,
    "category" "InstitutionCategory" NOT NULL,
    "primaryContactName" TEXT,
    "primaryContactRole" TEXT,
    "primaryContactPhone" TEXT,
    "primaryContactEmail" TEXT,
    "address" TEXT,
    "website" TEXT,
    "relationshipStatus" "RelationshipStatus" NOT NULL DEFAULT 'ACTIVE',
    "relationshipNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "sg_institutions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "sg_institutions_tenantId_type_idx" ON "sg_institutions"("tenantId", "type");
CREATE INDEX "sg_institutions_tenantId_category_idx" ON "sg_institutions"("tenantId", "category");

-- CreateTable: sg_professional_approvals
CREATE TABLE "sg_professional_approvals" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "approvalName" TEXT NOT NULL,
    "deliveringAuthority" TEXT NOT NULL,
    "approvalNumber" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "renewable" BOOLEAN NOT NULL DEFAULT true,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'VALID',
    "documentUrl" TEXT,
    "renewalReminderSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "sg_professional_approvals_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "sg_professional_approvals_tenantId_status_idx" ON "sg_professional_approvals"("tenantId", "status");
CREATE INDEX "sg_professional_approvals_status_expiresAt_idx" ON "sg_professional_approvals"("status", "expiresAt");

-- AddForeignKey
ALTER TABLE "sg_client_contracts" ADD CONSTRAINT "sg_client_contracts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sg_client_contracts" ADD CONSTRAINT "sg_client_contracts_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "sg_market_contract_amendments" ADD CONSTRAINT "sg_market_contract_amendments_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "sg_client_contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sg_bank_guarantees" ADD CONSTRAINT "sg_bank_guarantees_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "sg_client_contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sg_governance_meetings" ADD CONSTRAINT "sg_governance_meetings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sg_meeting_decisions" ADD CONSTRAINT "sg_meeting_decisions_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "sg_governance_meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sg_board_members" ADD CONSTRAINT "sg_board_members_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sg_board_members" ADD CONSTRAINT "sg_board_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "sg_shareholders" ADD CONSTRAINT "sg_shareholders_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sg_legal_cases" ADD CONSTRAINT "sg_legal_cases_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sg_legal_cases" ADD CONSTRAINT "sg_legal_cases_relatedContractId_fkey" FOREIGN KEY ("relatedContractId") REFERENCES "sg_client_contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "sg_legal_case_events" ADD CONSTRAINT "sg_legal_case_events_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "sg_legal_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sg_regulatory_registers" ADD CONSTRAINT "sg_regulatory_registers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sg_regulatory_registers" ADD CONSTRAINT "sg_regulatory_registers_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "sg_official_correspondences" ADD CONSTRAINT "sg_official_correspondences_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sg_official_correspondences" ADD CONSTRAINT "sg_official_correspondences_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "sg_institutions" ADD CONSTRAINT "sg_institutions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sg_professional_approvals" ADD CONSTRAINT "sg_professional_approvals_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
