-- CreateEnum
CREATE TYPE "MessagePriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "isStrategic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pinnedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "attachedDocumentIds" TEXT[],
ADD COLUMN     "mentions" TEXT[],
ADD COLUMN     "pollData" JSONB,
ADD COLUMN     "priority" "MessagePriority" NOT NULL DEFAULT 'NORMAL';

-- CreateTable
CREATE TABLE "voice_notes" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "audioUrl" TEXT NOT NULL,
    "durationSec" INTEGER NOT NULL,
    "transcript" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voice_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "voice_notes_messageId_key" ON "voice_notes"("messageId");

-- CreateIndex
CREATE INDEX "conversations_tenantId_isStrategic_idx" ON "conversations"("tenantId", "isStrategic");

-- CreateIndex
CREATE INDEX "messages_conversationId_priority_idx" ON "messages"("conversationId", "priority");

-- AddForeignKey
ALTER TABLE "voice_notes" ADD CONSTRAINT "voice_notes_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
