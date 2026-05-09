-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- AlterTable
ALTER TABLE "sites" ADD COLUMN     "lat" DOUBLE PRECISION,
ADD COLUMN     "lng" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "site_contracts" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "initialAmount" BIGINT NOT NULL,
    "currentAmount" BIGINT NOT NULL,
    "amendments" JSONB NOT NULL DEFAULT '[]',
    "guarantees" JSONB NOT NULL DEFAULT '{}',
    "paymentTerms" TEXT,
    "publicMarket" BOOLEAN NOT NULL DEFAULT false,
    "procuringEntity" TEXT,
    "signedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_photos" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "takenAt" TIMESTAMP(3) NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_alerts" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_decisions" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "site_contracts_siteId_key" ON "site_contracts"("siteId");

-- CreateIndex
CREATE INDEX "site_photos_siteId_takenAt_idx" ON "site_photos"("siteId", "takenAt");

-- CreateIndex
CREATE INDEX "site_alerts_siteId_resolved_idx" ON "site_alerts"("siteId", "resolved");

-- CreateIndex
CREATE INDEX "site_decisions_siteId_createdAt_idx" ON "site_decisions"("siteId", "createdAt");

-- AddForeignKey
ALTER TABLE "site_contracts" ADD CONSTRAINT "site_contracts_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_photos" ADD CONSTRAINT "site_photos_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_alerts" ADD CONSTRAINT "site_alerts_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_decisions" ADD CONSTRAINT "site_decisions_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
