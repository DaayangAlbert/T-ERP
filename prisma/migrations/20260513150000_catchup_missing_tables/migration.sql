-- Migration catch-up : 18 tables + colonnes/FK poussées via prisma db push
-- sans migration formelle. Répare l'historique de migrations pour qu'un fresh
-- 'prisma migrate dev' fonctionne sur DB vierge.
--
-- Tout est idempotent (IF NOT EXISTS / DO blocks pour types et FK).
-- Safe sur fresh dev et sur dev/prod déjà patché via db push.

-- CreateEnum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LegalForm') THEN
    CREATE TYPE "LegalForm" AS ENUM ('SA', 'SARL', 'SAS', 'GIE', 'INDIVIDUAL', 'OTHER');
  END IF;
END $$;

-- CreateEnum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentMethod') THEN
    CREATE TYPE "PaymentMethod" AS ENUM ('BANK_TRANSFER', 'MOBILE_MONEY', 'CARD', 'INVOICE_30D');
  END IF;
END $$;

-- CreateEnum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PayslipPaymentMethod') THEN
    CREATE TYPE "PayslipPaymentMethod" AS ENUM ('BANK_TRANSFER', 'MOBILE_MONEY', 'CASH', 'CHECK');
  END IF;
END $$;

-- CreateEnum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TimeStatus') THEN
    CREATE TYPE "TimeStatus" AS ENUM ('PRESENT', 'ABSENT_JUSTIFIED', 'ABSENT_UNJUSTIFIED', 'HOLIDAY', 'LEAVE', 'SICK');
  END IF;
END $$;

-- CreateEnum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'IntegrationCategory') THEN
    CREATE TYPE "IntegrationCategory" AS ENUM ('SOCIAL_SECURITY', 'TAX_AUTHORITY', 'BANK', 'EMAIL', 'SMS_MESSAGING', 'STORAGE', 'MONITORING', 'OTHER');
  END IF;
END $$;

-- CreateEnum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'IntegrationStatus') THEN
    CREATE TYPE "IntegrationStatus" AS ENUM ('ACTIVE', 'ERROR', 'PAUSED', 'DEACTIVATED');
  END IF;
END $$;

-- CreateEnum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LogLevel') THEN
    CREATE TYPE "LogLevel" AS ENUM ('DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL');
  END IF;
END $$;

-- CreateEnum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PlatformAdminRole') THEN
    CREATE TYPE "PlatformAdminRole" AS ENUM ('CTO', 'SUPPORT_L3', 'BILLING_ADMIN', 'COMPLIANCE_OFFICER');
  END IF;
END $$;

-- CreateEnum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PlatformAdminStatus') THEN
    CREATE TYPE "PlatformAdminStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'REVOKED');
  END IF;
END $$;

-- CreateEnum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BillingCycle') THEN
    CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'ANNUAL');
  END IF;
END $$;

-- CreateEnum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SubscriptionStatus') THEN
    CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED');
  END IF;
END $$;

-- CreateEnum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SaasInvoiceStatus') THEN
    CREATE TYPE "SaasInvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PAID', 'OVERDUE', 'CANCELLED', 'REFUNDED');
  END IF;
END $$;

-- CreateEnum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PlatformIncidentSeverity') THEN
    CREATE TYPE "PlatformIncidentSeverity" AS ENUM ('P1_CRITICAL', 'P2_MAJOR', 'P3_MINOR', 'P4_INFO');
  END IF;
END $$;

-- CreateEnum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PlatformIncidentStatus') THEN
    CREATE TYPE "PlatformIncidentStatus" AS ENUM ('OPEN', 'INVESTIGATING', 'IDENTIFIED', 'MONITORING', 'RESOLVED', 'CLOSED');
  END IF;
END $$;

-- CreateEnum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'GlobalAuditAction') THEN
    CREATE TYPE "GlobalAuditAction" AS ENUM ('TENANT_PROVISIONED', 'TENANT_SUSPENDED', 'TENANT_REACTIVATED', 'TENANT_DELETED', 'PLAN_UPGRADED', 'PLAN_DOWNGRADED', 'INVOICE_ISSUED', 'INVOICE_CANCELLED', 'PAYMENT_RECORDED', 'CONFIG_MODIFIED', 'FEATURE_FLAG_TOGGLED', 'CROSS_TENANT_ACCESS', 'DATA_EXPORTED', 'GDPR_EXPORT', 'DB_MIGRATION', 'DEPLOYMENT', 'INTEGRATION_CONFIGURED', 'AUTH_MFA_SUCCESS', 'AUTH_MFA_FAILURE', 'ADMIN_CREATED', 'ADMIN_REVOKED', 'PERMISSIONS_CHANGED');
  END IF;
END $$;

-- CreateEnum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'GlobalIntegrationStatus') THEN
    CREATE TYPE "GlobalIntegrationStatus" AS ENUM ('ACTIVE', 'DEGRADED', 'DOWN', 'MAINTENANCE', 'DEPRECATED');
  END IF;
END $$;

-- CreateEnum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SalaryAdvanceStatus') THEN
    CREATE TYPE "SalaryAdvanceStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'RECOVERED', 'REJECTED', 'CANCELLED');
  END IF;
END $$;

-- CreateEnum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MissionPriority') THEN
    CREATE TYPE "MissionPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
  END IF;
END $$;

-- CreateEnum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MissionStatus') THEN
    CREATE TYPE "MissionStatus" AS ENUM ('PENDING_ACCEPTANCE', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
  END IF;
END $$;

-- CreateEnum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'HseIncidentType') THEN
    CREATE TYPE "HseIncidentType" AS ENUM ('CORPORAL_ACCIDENT', 'NEAR_MISS', 'EQUIPMENT_DEFECT', 'SITE_DANGER', 'THEFT_INTRUSION');
  END IF;
END $$;

-- CreateEnum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'HseIncidentSeverity') THEN
    CREATE TYPE "HseIncidentSeverity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');
  END IF;
END $$;

-- CreateEnum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'HseIncidentStatus') THEN
    CREATE TYPE "HseIncidentStatus" AS ENUM ('OPEN', 'INVESTIGATING', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');
  END IF;
END $$;

-- CreateEnum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EpiType') THEN
    CREATE TYPE "EpiType" AS ENUM ('HELMET', 'HIGH_VIS_VEST', 'SAFETY_GLASSES', 'GLOVES', 'SAFETY_SHOES', 'HARNESS', 'DUST_MASK', 'EAR_PROTECTION');
  END IF;
END $$;

-- CreateEnum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EpiStatus') THEN
    CREATE TYPE "EpiStatus" AS ENUM ('OK', 'WORN_OUT', 'DEFECTIVE', 'REPLACED', 'LOST');
  END IF;
END $$;

-- CreateEnum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AttestationType') THEN
    CREATE TYPE "AttestationType" AS ENUM ('SALARY', 'EMPLOYMENT', 'PRESENCE', 'LEAVE_TAKEN', 'OTHER');
  END IF;
END $$;

-- CreateEnum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AttestationStatus') THEN
    CREATE TYPE "AttestationStatus" AS ENUM ('PENDING', 'IN_PREPARATION', 'READY', 'DELIVERED', 'REJECTED', 'CANCELLED');
  END IF;
END $$;

-- CreateEnum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ToolLoanStatus') THEN
    CREATE TYPE "ToolLoanStatus" AS ENUM ('REQUESTED', 'ISSUED', 'RETURNED', 'OVERDUE', 'LOST', 'CANCELLED');
  END IF;
END $$;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AppStage" ADD VALUE 'WITHDRAWN';
ALTER TYPE "AppStage" ADD VALUE 'EXPIRED';

-- AlterEnum
ALTER TYPE "LeaveType" ADD VALUE 'COMPENSATORY';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TenantStatus" ADD VALUE 'PROVISIONING';
ALTER TYPE "TenantStatus" ADD VALUE 'DEMO';
ALTER TYPE "TenantStatus" ADD VALUE 'TERMINATED';
ALTER TYPE "TenantStatus" ADD VALUE 'PURGED';

-- AlterTable
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS     "lastStageChangeAt" TIMESTAMP(3),
ADD COLUMN     "rhMessage" TEXT,
ADD COLUMN     "withdrawnAt" TIMESTAMP(3),
ADD COLUMN     "withdrawnReason" TEXT;

-- AlterTable
ALTER TABLE "interviews" ADD COLUMN IF NOT EXISTS     "candidateConfirmed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "candidateConfirmedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "job_offers" ADD COLUMN IF NOT EXISTS     "benefits" JSONB,
ADD COLUMN     "experienceMin" INTEGER,
ADD COLUMN     "hiringManagerId" TEXT,
ADD COLUMN     "missions" JSONB,
ADD COLUMN     "profileItems" JSONB,
ADD COLUMN     "siteId" TEXT,
ADD COLUMN     "slug" TEXT,
ADD COLUMN     "summary" TEXT,
ADD COLUMN     "viewCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "leave_balances" ADD COLUMN IF NOT EXISTS     "compensatoryDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "paidLeaveRemaining" DOUBLE PRECISION NOT NULL DEFAULT 30,
ADD COLUMN     "sickDaysUsed" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "unpaidLeaveUsed" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "userId" TEXT,
ADD COLUMN     "year" INTEGER NOT NULL DEFAULT 2026,
ALTER COLUMN "paidLeaveAcquired" SET DEFAULT 30;

-- AlterTable
ALTER TABLE "leave_requests" ADD COLUMN IF NOT EXISTS     "justificationDoc" TEXT,
ADD COLUMN     "userId" TEXT,
ADD COLUMN     "validatorUserId" TEXT;

-- AlterTable
ALTER TABLE "payslips" ADD COLUMN IF NOT EXISTS     "baseSalary" BIGINT,
ADD COLUMN     "cnpsAmount" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN     "irppAmount" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN     "otherBonuses" JSONB,
ADD COLUMN     "otherDeductions" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN     "overtimeAmount" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN     "overtimeHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "overtimeHours125" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "overtimeHours150" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "overtimeHours200" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "paymentBankAccount" TEXT,
ADD COLUMN     "paymentMethod" "PayslipPaymentMethod" NOT NULL DEFAULT 'BANK_TRANSFER',
ADD COLUMN     "paymentReference" TEXT,
ADD COLUMN     "periodEnd" TIMESTAMP(3),
ADD COLUMN     "periodLabel" TEXT,
ADD COLUMN     "reportedHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "seniorityBonus" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN     "transportAllowance" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN     "workedDays" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS     "billingAddress" TEXT,
ADD COLUMN     "billingContactEmail" TEXT,
ADD COLUMN     "billingContactName" TEXT,
ADD COLUMN     "country" TEXT NOT NULL DEFAULT 'CM',
ADD COLUMN     "dataRetentionEndAt" TIMESTAMP(3),
ADD COLUMN     "demoExpiresAt" TIMESTAMP(3),
ADD COLUMN     "isDemoTenant" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "legalForm" "LegalForm",
ADD COLUMN     "maxSites" INTEGER DEFAULT 10,
ADD COLUMN     "maxStorageGb" INTEGER DEFAULT 20,
ADD COLUMN     "maxUsers" INTEGER DEFAULT 50,
ADD COLUMN     "paymentMethod" "PaymentMethod",
ADD COLUMN     "provisionedAt" TIMESTAMP(3),
ADD COLUMN     "secondaryColor" TEXT,
ADD COLUMN     "subdomain" TEXT,
ADD COLUMN     "subscriptionPlanId" TEXT,
ADD COLUMN     "suspendedAt" TIMESTAMP(3),
ADD COLUMN     "suspensionReason" TEXT,
ADD COLUMN     "terminatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS     "address" TEXT,
ADD COLUMN     "availability" TEXT,
ADD COLUMN     "bankAgency" TEXT,
ADD COLUMN     "bankName" TEXT,
ADD COLUMN     "canManageIntegrations" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canManageRoles" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canManageTenantSettings" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canManageUsers" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canViewTechnicalLogs" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "candidateLanguages" JSONB,
ADD COLUMN     "candidateSkills" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "cniNumber" TEXT,
ADD COLUMN     "cvUrl" TEXT,
ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "desiredContractType" "ContractType",
ADD COLUMN     "desiredJob" TEXT,
ADD COLUMN     "desiredLocation" TEXT,
ADD COLUMN     "desiredSalaryMax" BIGINT,
ADD COLUMN     "desiredSalaryMin" BIGINT,
ADD COLUMN     "deviceFingerprints" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "emergencyContactName" TEXT,
ADD COLUMN     "emergencyContactPhone" TEXT,
ADD COLUMN     "familyStatus" TEXT,
ADD COLUMN     "gdprConsent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "gdprConsentAt" TIMESTAMP(3),
ADD COLUMN     "isGuard" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "matricule" TEXT,
ADD COLUMN     "mobilityDailyTravel" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mobilityExpatriation" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mobilityMissions" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "niu" TEXT,
ADD COLUMN     "notificationChannel" TEXT NOT NULL DEFAULT 'WHATSAPP',
ADD COLUMN     "personalEmail" TEXT,
ADD COLUMN     "phoneMobile" TEXT,
ADD COLUMN     "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pinFailedAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pinHash" TEXT,
ADD COLUMN     "pinLockedUntil" TIMESTAMP(3),
ADD COLUMN     "preferredLanguage" TEXT NOT NULL DEFAULT 'fr-CM',
ADD COLUMN     "professionalCategory" TEXT,
ADD COLUMN     "rib" TEXT,
ADD COLUMN     "teamLeader" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "workerQualification" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "time_reports" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "siteId" TEXT,
    "arrivalTime" TIMESTAMP(3),
    "departureTime" TIMESTAMP(3),
    "breakMinutes" INTEGER NOT NULL DEFAULT 60,
    "totalHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "standardHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overtimeHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overtimeType" TEXT,
    "status" "TimeStatus" NOT NULL DEFAULT 'PRESENT',
    "pointedBy" TEXT NOT NULL,
    "entryGeoLat" DOUBLE PRECISION,
    "entryGeoLng" DOUBLE PRECISION,
    "entryGeoAccuracyM" INTEGER,
    "entrySelfieUrl" TEXT,
    "exitGeoLat" DOUBLE PRECISION,
    "exitGeoLng" DOUBLE PRECISION,
    "exitGeoAccuracyM" INTEGER,
    "exitSelfieUrl" TEXT,
    "deviceFingerprint" TEXT,
    "outOfGeofence" BOOLEAN NOT NULL DEFAULT false,
    "contestedAt" TIMESTAMP(3),
    "contestReason" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "time_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "it_integrations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "IntegrationCategory" NOT NULL,
    "endpoint" TEXT,
    "credentials" JSONB,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastSyncAt" TIMESTAMP(3),
    "lastSyncSuccess" BOOLEAN,
    "lastError" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 5,
    "frequency" TEXT,
    "webhookSecret" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "it_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "it_api_keys" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ipWhitelist" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdById" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "it_api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "it_webhooks" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "events" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastDeliveryAt" TIMESTAMP(3),
    "lastDeliverySuccess" BOOLEAN,
    "deliveryCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "it_webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "it_technical_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "level" "LogLevel" NOT NULL,
    "service" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "details" JSONB,
    "userId" TEXT,
    "ipAddress" TEXT,

    CONSTRAINT "it_technical_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "job_matches" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "jobOfferId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "matchedSkills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "missingRequirements" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dismissedAt" TIMESTAMP(3),

    CONSTRAINT "job_matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "candidate_experiences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "location" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidate_experiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "candidate_formations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "diploma" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidate_formations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "demo_requests" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "position" TEXT,
    "companyName" TEXT NOT NULL,
    "employeesRange" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "message" TEXT,
    "source" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "demo_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "platform_admins" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "PlatformAdminRole" NOT NULL,
    "mfaSecret" TEXT,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "yubikeyId" TEXT,
    "whitelistedIps" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "canCreateTenants" BOOLEAN NOT NULL DEFAULT false,
    "canSuspendTenants" BOOLEAN NOT NULL DEFAULT false,
    "canDeleteTenants" BOOLEAN NOT NULL DEFAULT false,
    "canManageBilling" BOOLEAN NOT NULL DEFAULT false,
    "canManagePlatformConfig" BOOLEAN NOT NULL DEFAULT false,
    "canViewAllTenantsData" BOOLEAN NOT NULL DEFAULT false,
    "canManageGlobalIntegrations" BOOLEAN NOT NULL DEFAULT false,
    "canViewGlobalAudit" BOOLEAN NOT NULL DEFAULT false,
    "status" "PlatformAdminStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastLoginAt" TIMESTAMP(3),
    "lastLoginIp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "platform_admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "subscription_plans" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "monthlyPriceXAF" BIGINT NOT NULL,
    "annualPriceXAF" BIGINT,
    "maxUsers" INTEGER NOT NULL,
    "maxSites" INTEGER NOT NULL,
    "maxStorageGb" INTEGER NOT NULL,
    "enabledModules" TEXT[],
    "hasWhatsAppBusiness" BOOLEAN NOT NULL DEFAULT false,
    "hasJobPortal" BOOLEAN NOT NULL DEFAULT false,
    "hasSgModule" BOOLEAN NOT NULL DEFAULT false,
    "supportSlaHours" INTEGER NOT NULL DEFAULT 24,
    "isRecommended" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "subscriptions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "billingCycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "mrrXAF" BIGINT NOT NULL DEFAULT 0,
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "saas_invoices" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "amountHT" BIGINT NOT NULL,
    "vatRate" DOUBLE PRECISION NOT NULL DEFAULT 19.25,
    "vatAmount" BIGINT NOT NULL,
    "amountTTC" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "status" "SaasInvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "paidAmount" BIGINT,
    "paymentMethod" "PaymentMethod",
    "paymentReference" TEXT,
    "pdfUrl" TEXT,
    "reminderCount" INTEGER NOT NULL DEFAULT 0,
    "lastReminderAt" TIMESTAMP(3),

    CONSTRAINT "saas_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "saas_metrics" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "mrrXAF" BIGINT NOT NULL,
    "arrXAF" BIGINT NOT NULL,
    "activeTenants" INTEGER NOT NULL,
    "newTenants" INTEGER NOT NULL,
    "churnedTenants" INTEGER NOT NULL,
    "activeUsers" INTEGER NOT NULL,
    "dau" INTEGER NOT NULL,
    "mau" INTEGER NOT NULL,
    "arpuXAF" BIGINT NOT NULL,
    "conversionRate" DOUBLE PRECISION,

    CONSTRAINT "saas_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "platform_incidents" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "PlatformIncidentSeverity" NOT NULL,
    "status" "PlatformIncidentStatus" NOT NULL DEFAULT 'OPEN',
    "affectedTenants" TEXT[],
    "tenantId" TEXT,
    "module" TEXT,
    "usersImpacted" INTEGER,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "postmortemUrl" TEXT,
    "assignedTo" TEXT,
    "hypothesis" TEXT,
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "global_audit_logs" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "platformAdminId" TEXT,
    "actorEmail" TEXT NOT NULL,
    "actorRole" "PlatformAdminRole",
    "action" "GlobalAuditAction" NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "targetDescription" TEXT,
    "tenantId" TEXT,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT,
    "justification" TEXT,
    "ticketReference" TEXT,
    "beforeState" JSONB,
    "afterState" JSONB,

    CONSTRAINT "global_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "tenant_feature_flags" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "flagKey" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "enabledBy" TEXT NOT NULL,
    "enabledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "tenant_feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "global_integrations" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" "GlobalIntegrationStatus" NOT NULL DEFAULT 'ACTIVE',
    "apiVersion" TEXT,
    "credentialsRef" TEXT,
    "lastHealthCheckAt" TIMESTAMP(3),
    "metricsLast24h" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "global_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "salary_advance_requests" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amountXAF" BIGINT NOT NULL,
    "reason" TEXT,
    "maxAllowedXAF" BIGINT NOT NULL,
    "status" "SalaryAdvanceStatus" NOT NULL DEFAULT 'PENDING',
    "validatedById" TEXT,
    "validatedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "payoutAt" TIMESTAMP(3),
    "payoutMethod" TEXT,
    "recoveryMonth" TEXT,
    "recoveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "salary_advance_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "mission_assignments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "instructions" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "estimatedDays" INTEGER,
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "priority" "MissionPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "MissionStatus" NOT NULL DEFAULT 'PENDING_ACCEPTANCE',
    "workerAcceptedAt" TIMESTAMP(3),
    "workerQuestionsRaised" TEXT,
    "completedAt" TIMESTAMP(3),
    "completionNotes" TEXT,
    "progressPhotoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mission_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "hse_incident_reports" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "reportedById" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "type" "HseIncidentType" NOT NULL,
    "severity" "HseIncidentSeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "incidentGeoLat" DOUBLE PRECISION,
    "incidentGeoLng" DOUBLE PRECISION,
    "locationDetail" TEXT,
    "injuredPersonIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "witnessIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "photosUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "status" "HseIncidentStatus" NOT NULL DEFAULT 'OPEN',
    "assignedToId" TEXT,
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "reportedToCnps" BOOLEAN NOT NULL DEFAULT false,
    "reportedToCnpsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hse_incident_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "epi_assignments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "epiType" "EpiType" NOT NULL,
    "name" TEXT NOT NULL,
    "serialNumber" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedReplacementAt" TIMESTAMP(3),
    "status" "EpiStatus" NOT NULL DEFAULT 'OK',
    "replacedAt" TIMESTAMP(3),
    "replacementReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "epi_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "attestation_requests" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "AttestationType" NOT NULL,
    "purpose" TEXT,
    "status" "AttestationStatus" NOT NULL DEFAULT 'PENDING',
    "preparedById" TEXT,
    "preparedAt" TIMESTAMP(3),
    "documentUrl" TEXT,
    "expectedReadyAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attestation_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "tool_loans" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "toolCategory" TEXT,
    "serialNumber" TEXT,
    "status" "ToolLoanStatus" NOT NULL DEFAULT 'REQUESTED',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestReason" TEXT,
    "issuedAt" TIMESTAMP(3),
    "issuedById" TEXT,
    "dueDate" TIMESTAMP(3),
    "isPermanent" BOOLEAN NOT NULL DEFAULT false,
    "returnedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tool_loans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "time_reports_tenantId_date_idx" ON "time_reports"("tenantId", "date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "time_reports_siteId_date_idx" ON "time_reports"("siteId", "date");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "time_reports_userId_date_key" ON "time_reports"("userId", "date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "it_integrations_tenantId_status_idx" ON "it_integrations"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "it_integrations_tenantId_code_key" ON "it_integrations"("tenantId", "code");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "it_api_keys_tenantId_idx" ON "it_api_keys"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "it_api_keys_tenantId_keyPrefix_key" ON "it_api_keys"("tenantId", "keyPrefix");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "it_webhooks_tenantId_idx" ON "it_webhooks"("tenantId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "it_technical_logs_tenantId_timestamp_idx" ON "it_technical_logs"("tenantId", "timestamp");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "it_technical_logs_tenantId_level_idx" ON "it_technical_logs"("tenantId", "level");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "it_technical_logs_tenantId_service_idx" ON "it_technical_logs"("tenantId", "service");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "job_matches_candidateId_score_idx" ON "job_matches"("candidateId", "score");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "job_matches_candidateId_jobOfferId_key" ON "job_matches"("candidateId", "jobOfferId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "candidate_experiences_userId_order_idx" ON "candidate_experiences"("userId", "order");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "candidate_formations_userId_order_idx" ON "candidate_formations"("userId", "order");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "demo_requests_status_createdAt_idx" ON "demo_requests"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "platform_admins_email_key" ON "platform_admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "subscription_plans_code_key" ON "subscription_plans"("code");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "subscriptions_tenantId_status_idx" ON "subscriptions"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "saas_invoices_reference_key" ON "saas_invoices"("reference");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "saas_invoices_tenantId_status_idx" ON "saas_invoices"("tenantId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "saas_invoices_status_dueAt_idx" ON "saas_invoices"("status", "dueAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "saas_metrics_date_key" ON "saas_metrics"("date");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "platform_incidents_reference_key" ON "platform_incidents"("reference");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "platform_incidents_status_severity_idx" ON "platform_incidents"("status", "severity");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "global_audit_logs_timestamp_idx" ON "global_audit_logs"("timestamp");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "global_audit_logs_platformAdminId_timestamp_idx" ON "global_audit_logs"("platformAdminId", "timestamp");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "global_audit_logs_tenantId_timestamp_idx" ON "global_audit_logs"("tenantId", "timestamp");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "global_audit_logs_action_timestamp_idx" ON "global_audit_logs"("action", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "tenant_feature_flags_tenantId_flagKey_key" ON "tenant_feature_flags"("tenantId", "flagKey");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "global_integrations_code_key" ON "global_integrations"("code");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "salary_advance_requests_tenantId_status_idx" ON "salary_advance_requests"("tenantId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "salary_advance_requests_userId_createdAt_idx" ON "salary_advance_requests"("userId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "mission_assignments_tenantId_status_idx" ON "mission_assignments"("tenantId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "mission_assignments_userId_status_idx" ON "mission_assignments"("userId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "mission_assignments_siteId_status_idx" ON "mission_assignments"("siteId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "hse_incident_reports_tenantId_status_idx" ON "hse_incident_reports"("tenantId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "hse_incident_reports_reportedById_createdAt_idx" ON "hse_incident_reports"("reportedById", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "hse_incident_reports_siteId_severity_idx" ON "hse_incident_reports"("siteId", "severity");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "epi_assignments_tenantId_status_idx" ON "epi_assignments"("tenantId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "epi_assignments_userId_epiType_idx" ON "epi_assignments"("userId", "epiType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "attestation_requests_tenantId_status_idx" ON "attestation_requests"("tenantId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "attestation_requests_userId_createdAt_idx" ON "attestation_requests"("userId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tool_loans_tenantId_status_idx" ON "tool_loans"("tenantId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tool_loans_userId_status_idx" ON "tool_loans"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "job_offers_tenantId_slug_key" ON "job_offers"("tenantId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "leave_balances_userId_key" ON "leave_balances"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "leave_requests_userId_startDate_idx" ON "leave_requests"("userId", "startDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "payslips_userId_period_idx" ON "payslips"("userId", "period");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "users_matricule_key" ON "users"("matricule");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "users_tenantId_phone_idx" ON "users"("tenantId", "phone");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tenants_subscriptionPlanId_fkey') THEN
    ALTER TABLE "tenants" ADD CONSTRAINT "tenants_subscriptionPlanId_fkey" FOREIGN KEY ("subscriptionPlanId") REFERENCES "subscription_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leave_requests_userId_fkey') THEN
    ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leave_requests_validatorUserId_fkey') THEN
    ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_validatorUserId_fkey" FOREIGN KEY ("validatorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leave_balances_userId_fkey') THEN
    ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'time_reports_userId_fkey') THEN
    ALTER TABLE "time_reports" ADD CONSTRAINT "time_reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'time_reports_pointedBy_fkey') THEN
    ALTER TABLE "time_reports" ADD CONSTRAINT "time_reports_pointedBy_fkey" FOREIGN KEY ("pointedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'time_reports_resolvedBy_fkey') THEN
    ALTER TABLE "time_reports" ADD CONSTRAINT "time_reports_resolvedBy_fkey" FOREIGN KEY ("resolvedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'it_api_keys_createdById_fkey') THEN
    ALTER TABLE "it_api_keys" ADD CONSTRAINT "it_api_keys_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'it_api_keys_revokedById_fkey') THEN
    ALTER TABLE "it_api_keys" ADD CONSTRAINT "it_api_keys_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'it_technical_logs_userId_fkey') THEN
    ALTER TABLE "it_technical_logs" ADD CONSTRAINT "it_technical_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'job_matches_candidateId_fkey') THEN
    ALTER TABLE "job_matches" ADD CONSTRAINT "job_matches_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'job_matches_jobOfferId_fkey') THEN
    ALTER TABLE "job_matches" ADD CONSTRAINT "job_matches_jobOfferId_fkey" FOREIGN KEY ("jobOfferId") REFERENCES "job_offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'candidate_experiences_userId_fkey') THEN
    ALTER TABLE "candidate_experiences" ADD CONSTRAINT "candidate_experiences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'candidate_formations_userId_fkey') THEN
    ALTER TABLE "candidate_formations" ADD CONSTRAINT "candidate_formations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_tenantId_fkey') THEN
    ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_planId_fkey') THEN
    ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'saas_invoices_tenantId_fkey') THEN
    ALTER TABLE "saas_invoices" ADD CONSTRAINT "saas_invoices_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'saas_invoices_subscriptionId_fkey') THEN
    ALTER TABLE "saas_invoices" ADD CONSTRAINT "saas_invoices_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'platform_incidents_tenantId_fkey') THEN
    ALTER TABLE "platform_incidents" ADD CONSTRAINT "platform_incidents_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'global_audit_logs_platformAdminId_fkey') THEN
    ALTER TABLE "global_audit_logs" ADD CONSTRAINT "global_audit_logs_platformAdminId_fkey" FOREIGN KEY ("platformAdminId") REFERENCES "platform_admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'global_audit_logs_tenantId_fkey') THEN
    ALTER TABLE "global_audit_logs" ADD CONSTRAINT "global_audit_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tenant_feature_flags_tenantId_fkey') THEN
    ALTER TABLE "tenant_feature_flags" ADD CONSTRAINT "tenant_feature_flags_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'salary_advance_requests_tenantId_fkey') THEN
    ALTER TABLE "salary_advance_requests" ADD CONSTRAINT "salary_advance_requests_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'salary_advance_requests_userId_fkey') THEN
    ALTER TABLE "salary_advance_requests" ADD CONSTRAINT "salary_advance_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'salary_advance_requests_validatedById_fkey') THEN
    ALTER TABLE "salary_advance_requests" ADD CONSTRAINT "salary_advance_requests_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mission_assignments_tenantId_fkey') THEN
    ALTER TABLE "mission_assignments" ADD CONSTRAINT "mission_assignments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mission_assignments_userId_fkey') THEN
    ALTER TABLE "mission_assignments" ADD CONSTRAINT "mission_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mission_assignments_siteId_fkey') THEN
    ALTER TABLE "mission_assignments" ADD CONSTRAINT "mission_assignments_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mission_assignments_assignedById_fkey') THEN
    ALTER TABLE "mission_assignments" ADD CONSTRAINT "mission_assignments_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hse_incident_reports_tenantId_fkey') THEN
    ALTER TABLE "hse_incident_reports" ADD CONSTRAINT "hse_incident_reports_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hse_incident_reports_reportedById_fkey') THEN
    ALTER TABLE "hse_incident_reports" ADD CONSTRAINT "hse_incident_reports_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hse_incident_reports_siteId_fkey') THEN
    ALTER TABLE "hse_incident_reports" ADD CONSTRAINT "hse_incident_reports_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hse_incident_reports_assignedToId_fkey') THEN
    ALTER TABLE "hse_incident_reports" ADD CONSTRAINT "hse_incident_reports_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'epi_assignments_tenantId_fkey') THEN
    ALTER TABLE "epi_assignments" ADD CONSTRAINT "epi_assignments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'epi_assignments_userId_fkey') THEN
    ALTER TABLE "epi_assignments" ADD CONSTRAINT "epi_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'attestation_requests_tenantId_fkey') THEN
    ALTER TABLE "attestation_requests" ADD CONSTRAINT "attestation_requests_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'attestation_requests_userId_fkey') THEN
    ALTER TABLE "attestation_requests" ADD CONSTRAINT "attestation_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'attestation_requests_preparedById_fkey') THEN
    ALTER TABLE "attestation_requests" ADD CONSTRAINT "attestation_requests_preparedById_fkey" FOREIGN KEY ("preparedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tool_loans_tenantId_fkey') THEN
    ALTER TABLE "tool_loans" ADD CONSTRAINT "tool_loans_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tool_loans_userId_fkey') THEN
    ALTER TABLE "tool_loans" ADD CONSTRAINT "tool_loans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tool_loans_issuedById_fkey') THEN
    ALTER TABLE "tool_loans" ADD CONSTRAINT "tool_loans_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

