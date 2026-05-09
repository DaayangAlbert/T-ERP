-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('MEETING', 'BOARD', 'AUDIT', 'VALIDATION_DEADLINE', 'PERSONAL', 'OTHER');

-- CreateEnum
CREATE TYPE "BenefitType" AS ENUM ('HOUSING', 'VEHICLE', 'FUEL', 'PHONE', 'INSURANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "BonusType" AS ENUM ('ANNUAL_RESULT', 'OBJECTIVES', 'SIGNING', 'RETENTION');

-- CreateEnum
CREATE TYPE "BonusStatus" AS ENUM ('TARGETED', 'PROVISIONED', 'VALIDATED', 'PAID');

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dashboardWidgets" JSONB NOT NULL DEFAULT '[]',
    "alertThresholds" JSONB NOT NULL DEFAULT '{}',
    "notificationChannels" JSONB NOT NULL DEFAULT '{}',
    "dailyReportEnabled" BOOLEAN NOT NULL DEFAULT false,
    "dailyReportTime" TEXT,
    "numberFormat" TEXT NOT NULL DEFAULT 'M_FCFA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_signatures" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "signatureUrl" TEXT,
    "initialsUrl" TEXT,
    "uploadedAt" TIMESTAMP(3),

    CONSTRAINT "user_signatures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agenda_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "type" "EventType" NOT NULL DEFAULT 'MEETING',
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agenda_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interest_declarations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "mandates" JSONB NOT NULL DEFAULT '[]',
    "shareholdings" JSONB NOT NULL DEFAULT '[]',
    "conflictsOfInterest" JSONB NOT NULL DEFAULT '[]',
    "declaredAt" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interest_declarations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "benefits_in_kind" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "BenefitType" NOT NULL,
    "description" TEXT NOT NULL,
    "monthlyValue" BIGINT NOT NULL,
    "fiscalValue" BIGINT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "benefits_in_kind_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_bonuses" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fiscalYear" INTEGER NOT NULL,
    "bonusType" "BonusType" NOT NULL,
    "formula" TEXT,
    "targetAmount" BIGINT NOT NULL,
    "actualAmount" BIGINT,
    "status" "BonusStatus" NOT NULL DEFAULT 'TARGETED',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "performance_bonuses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_userId_key" ON "user_preferences"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_signatures_userId_key" ON "user_signatures"("userId");

-- CreateIndex
CREATE INDEX "agenda_events_userId_startAt_idx" ON "agenda_events"("userId", "startAt");

-- CreateIndex
CREATE UNIQUE INDEX "interest_declarations_userId_year_key" ON "interest_declarations"("userId", "year");

-- CreateIndex
CREATE INDEX "benefits_in_kind_userId_type_idx" ON "benefits_in_kind"("userId", "type");

-- CreateIndex
CREATE INDEX "performance_bonuses_userId_fiscalYear_idx" ON "performance_bonuses"("userId", "fiscalYear");

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_signatures" ADD CONSTRAINT "user_signatures_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agenda_events" ADD CONSTRAINT "agenda_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interest_declarations" ADD CONSTRAINT "interest_declarations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benefits_in_kind" ADD CONSTRAINT "benefits_in_kind_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_bonuses" ADD CONSTRAINT "performance_bonuses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
