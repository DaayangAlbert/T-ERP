-- Suppression "pour tout le monde" des messages : colonne tombstone.
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
