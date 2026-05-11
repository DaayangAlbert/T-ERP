-- CreateEnum
CREATE TYPE "AttendanceSession" AS ENUM ('MORNING', 'EVENING');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'JUSTIFIED_ABSENT', 'LATE', 'LEFT_EARLY');

-- CreateEnum
CREATE TYPE "ReceiptStatus" AS ENUM ('CONFORM', 'PARTIAL_REJECTION', 'FULL_REJECTION', 'DAMAGED');

-- AlterTable
ALTER TABLE "hse_incidents" ADD COLUMN     "bodyPartAffected" TEXT,
ADD COLUMN     "clientUuid" TEXT,
ADD COLUMN     "declaredByFieldUserId" TEXT,
ADD COLUMN     "declaredViaApp" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "geoLocation" JSONB,
ADD COLUMN     "immediateActionsList" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "photoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "cc_attendances" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "session" "AttendanceSession" NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "checkedInAt" TIMESTAMP(3),
    "reason" TEXT,
    "recordedById" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "syncedFromOffline" BOOLEAN NOT NULL DEFAULT false,
    "clientUuid" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cc_attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cc_attendance_completions" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "session" "AttendanceSession" NOT NULL,
    "completedById" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL,
    "presentCount" INTEGER NOT NULL,
    "absentCount" INTEGER NOT NULL,
    "totalCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cc_attendance_completions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cc_task_realizations" (
    "id" TEXT NOT NULL,
    "dailyReportId" TEXT NOT NULL,
    "taskId" TEXT,
    "designation" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "unitPrice" BIGINT NOT NULL DEFAULT 0,
    "totalValue" BIGINT NOT NULL DEFAULT 0,
    "teamId" TEXT,
    "clientUuid" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cc_task_realizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cc_material_consumptions" (
    "id" TEXT NOT NULL,
    "dailyReportId" TEXT NOT NULL,
    "articleCode" TEXT NOT NULL,
    "articleLabel" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cc_material_consumptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cc_delivery_receipts" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "receivedById" TEXT NOT NULL,
    "blPhotoUrl" TEXT,
    "blNumber" TEXT,
    "items" JSONB NOT NULL DEFAULT '[]',
    "overallStatus" "ReceiptStatus" NOT NULL DEFAULT 'CONFORM',
    "notes" TEXT,
    "signature" TEXT,
    "clientUuid" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cc_delivery_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cc_hse_safety_talks" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "weekIso" TEXT NOT NULL,
    "theme" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "completedById" TEXT,
    "attendeesCount" INTEGER,
    "attendeesIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cc_hse_safety_talks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cc_attendances_siteId_date_idx" ON "cc_attendances"("siteId", "date");

-- CreateIndex
CREATE INDEX "cc_attendances_userId_date_idx" ON "cc_attendances"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "cc_attendances_siteId_userId_date_session_key" ON "cc_attendances"("siteId", "userId", "date", "session");

-- CreateIndex
CREATE UNIQUE INDEX "cc_attendance_completions_siteId_date_session_key" ON "cc_attendance_completions"("siteId", "date", "session");

-- CreateIndex
CREATE INDEX "cc_task_realizations_dailyReportId_idx" ON "cc_task_realizations"("dailyReportId");

-- CreateIndex
CREATE INDEX "cc_material_consumptions_dailyReportId_idx" ON "cc_material_consumptions"("dailyReportId");

-- CreateIndex
CREATE UNIQUE INDEX "cc_delivery_receipts_deliveryId_key" ON "cc_delivery_receipts"("deliveryId");

-- CreateIndex
CREATE UNIQUE INDEX "cc_hse_safety_talks_siteId_weekIso_key" ON "cc_hse_safety_talks"("siteId", "weekIso");

-- AddForeignKey
ALTER TABLE "cc_attendances" ADD CONSTRAINT "cc_attendances_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cc_attendances" ADD CONSTRAINT "cc_attendances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cc_attendances" ADD CONSTRAINT "cc_attendances_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cc_attendance_completions" ADD CONSTRAINT "cc_attendance_completions_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cc_attendance_completions" ADD CONSTRAINT "cc_attendance_completions_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cc_task_realizations" ADD CONSTRAINT "cc_task_realizations_dailyReportId_fkey" FOREIGN KEY ("dailyReportId") REFERENCES "site_daily_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cc_task_realizations" ADD CONSTRAINT "cc_task_realizations_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "site_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cc_material_consumptions" ADD CONSTRAINT "cc_material_consumptions_dailyReportId_fkey" FOREIGN KEY ("dailyReportId") REFERENCES "site_daily_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cc_delivery_receipts" ADD CONSTRAINT "cc_delivery_receipts_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cc_delivery_receipts" ADD CONSTRAINT "cc_delivery_receipts_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cc_hse_safety_talks" ADD CONSTRAINT "cc_hse_safety_talks_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cc_hse_safety_talks" ADD CONSTRAINT "cc_hse_safety_talks_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
