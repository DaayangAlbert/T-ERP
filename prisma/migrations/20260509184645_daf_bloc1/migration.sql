-- CreateEnum
CREATE TYPE "PayrollCycleStatus" AS ENUM ('DRAFT', 'CALCULATING', 'CALCULATED', 'N1_PENDING', 'N2_PENDING', 'N3_PENDING', 'PAID', 'DIPE_SUBMITTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ReceivableStatus" AS ENUM ('OPEN', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'LITIGATION', 'WRITEOFF');

-- CreateEnum
CREATE TYPE "ReminderLevel" AS ENUM ('R1_AMIABLE', 'R2_FIRM', 'R3_FORMAL_NOTICE', 'LITIGATION');

-- CreateEnum
CREATE TYPE "ReminderChannel" AS ENUM ('EMAIL', 'LETTER', 'REGISTERED_MAIL', 'PHONE', 'BAILIFF');

-- CreateEnum
CREATE TYPE "TaxType" AS ENUM ('VAT', 'IRPP', 'CNPS_DIPE', 'CFC', 'FNE', 'RAV', 'TC', 'CAC', 'IS_INSTALLMENT', 'IS_BALANCE', 'DSF_FILING', 'TAXES_ANNEXES', 'OTHER');

-- CreateEnum
CREATE TYPE "TaxAuthority" AS ENUM ('DGI', 'CNPS', 'COMMUNE', 'CNAM_OCCUPATIONAL', 'OTHER');

-- CreateEnum
CREATE TYPE "DeclarationStatus" AS ENUM ('PENDING', 'PREPARED', 'SUBMITTED', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SCHEDULED', 'PAID', 'OVERDUE');

-- CreateEnum
CREATE TYPE "AuditType" AS ENUM ('TAX_VERIFICATION', 'CNPS_CONTROL', 'EXTERNAL_AUDIT', 'CAC', 'INTERNAL');

-- CreateEnum
CREATE TYPE "AuditStatus" AS ENUM ('ANNOUNCED', 'IN_PROGRESS', 'CONTRADICTORY', 'CLOSED', 'CHALLENGED');

-- CreateEnum
CREATE TYPE "BankSyncStatus" AS ENUM ('LIVE', 'DELAYED', 'MANUAL', 'ERROR');

-- CreateEnum
CREATE TYPE "MovementDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- AlterTable
ALTER TABLE "bank_accounts" ADD COLUMN     "lastSyncAt" TIMESTAMP(3),
ADD COLUMN     "primaryColor" TEXT,
ADD COLUMN     "syncStatus" "BankSyncStatus" NOT NULL DEFAULT 'MANUAL';

-- CreateTable
CREATE TABLE "payroll_cycles" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "status" "PayrollCycleStatus" NOT NULL DEFAULT 'DRAFT',
    "totalBulletins" INTEGER NOT NULL DEFAULT 0,
    "grossAmount" BIGINT NOT NULL DEFAULT 0,
    "employerCharges" BIGINT NOT NULL DEFAULT 0,
    "netToPay" BIGINT NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "calculatedAt" TIMESTAMP(3),
    "n1ValidatedAt" TIMESTAMP(3),
    "n2ValidatedAt" TIMESTAMP(3),
    "n3ValidatedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "dipeSubmittedAt" TIMESTAMP(3),
    "warnings" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receivables" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invoiceRef" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientId" TEXT,
    "amount" BIGINT NOT NULL,
    "paidAmount" BIGINT NOT NULL DEFAULT 0,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "ReceivableStatus" NOT NULL DEFAULT 'OPEN',
    "siteId" TEXT,
    "daysOverdue" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "receivables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reminders" (
    "id" TEXT NOT NULL,
    "receivableId" TEXT NOT NULL,
    "level" "ReminderLevel" NOT NULL,
    "channel" "ReminderChannel" NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL,
    "sentBy" TEXT NOT NULL,
    "responseReceived" BOOLEAN NOT NULL DEFAULT false,
    "responseDate" TIMESTAMP(3),
    "responseNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_deadlines" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "TaxType" NOT NULL,
    "authority" "TaxAuthority" NOT NULL,
    "period" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "amount" BIGINT,
    "declarationStatus" "DeclarationStatus" NOT NULL DEFAULT 'PENDING',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "declaredAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "receiptUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_deadlines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_audits" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "AuditType" NOT NULL,
    "authority" "TaxAuthority" NOT NULL,
    "period" TEXT NOT NULL,
    "auditor" TEXT,
    "status" "AuditStatus" NOT NULL DEFAULT 'ANNOUNCED',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "opinion" TEXT,
    "adjustmentsAmount" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daf_settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "alertsConfig" JSONB,
    "dashboardLayout" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daf_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_movements" (
    "id" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "direction" "MovementDirection" NOT NULL,
    "amount" BIGINT NOT NULL,
    "label" TEXT NOT NULL,
    "reference" TEXT,
    "counterparty" TEXT,
    "siteId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payroll_cycles_tenantId_status_idx" ON "payroll_cycles"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_cycles_tenantId_period_key" ON "payroll_cycles"("tenantId", "period");

-- CreateIndex
CREATE INDEX "receivables_tenantId_status_idx" ON "receivables"("tenantId", "status");

-- CreateIndex
CREATE INDEX "receivables_tenantId_dueDate_idx" ON "receivables"("tenantId", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "receivables_tenantId_invoiceRef_key" ON "receivables"("tenantId", "invoiceRef");

-- CreateIndex
CREATE INDEX "reminders_receivableId_sentAt_idx" ON "reminders"("receivableId", "sentAt");

-- CreateIndex
CREATE INDEX "tax_deadlines_tenantId_dueDate_idx" ON "tax_deadlines"("tenantId", "dueDate");

-- CreateIndex
CREATE INDEX "tax_deadlines_tenantId_type_idx" ON "tax_deadlines"("tenantId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "tax_deadlines_tenantId_type_period_key" ON "tax_deadlines"("tenantId", "type", "period");

-- CreateIndex
CREATE INDEX "tax_audits_tenantId_status_idx" ON "tax_audits"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "daf_settings_userId_key" ON "daf_settings"("userId");

-- CreateIndex
CREATE INDEX "bank_movements_bankAccountId_occurredAt_idx" ON "bank_movements"("bankAccountId", "occurredAt");

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_receivableId_fkey" FOREIGN KEY ("receivableId") REFERENCES "receivables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daf_settings" ADD CONSTRAINT "daf_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_movements" ADD CONSTRAINT "bank_movements_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "bank_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
