-- CreateEnum
CREATE TYPE "InterviewMode" AS ENUM ('ONSITE', 'PHONE', 'VIDEO');

-- CreateEnum
CREATE TYPE "InterviewDecision" AS ENUM ('GO', 'NO_GO', 'PENDING');

-- CreateTable
CREATE TABLE "interviews" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 60,
    "interviewers" TEXT[],
    "mode" "InterviewMode" NOT NULL DEFAULT 'ONSITE',
    "location" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "feedback" TEXT,
    "score" INTEGER,
    "decision" "InterviewDecision",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "interviews_applicationId_scheduledAt_idx" ON "interviews"("applicationId", "scheduledAt");
