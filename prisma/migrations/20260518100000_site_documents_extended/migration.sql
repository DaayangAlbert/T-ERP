-- Extension de SiteDocument pour le module CC "Documents chantier" :
--   - Nouveaux champs : subCategory, referenceNumber, issuedAt, validUntil,
--     amount, relatedPartyName, archived, archivedAt
--   - Nouvelles valeurs d'enum DocumentCategory (cautions, assurances,
--     décomptes, correspondances, BC, ordres de service…)
--
-- Idempotente : safe à rejouer.

-- 1) Ajout des nouvelles valeurs d'enum DocumentCategory
DO $$
BEGIN
  -- Helper : ajoute une valeur si absente
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'MEETING_MINUTES' AND enumtypid = 'public."DocumentCategory"'::regtype) THEN
    ALTER TYPE "DocumentCategory" ADD VALUE 'MEETING_MINUTES';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'CORRESPONDENCE' AND enumtypid = 'public."DocumentCategory"'::regtype) THEN
    ALTER TYPE "DocumentCategory" ADD VALUE 'CORRESPONDENCE';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'BANK_GUARANTEE_PERFORMANCE' AND enumtypid = 'public."DocumentCategory"'::regtype) THEN
    ALTER TYPE "DocumentCategory" ADD VALUE 'BANK_GUARANTEE_PERFORMANCE';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'BANK_GUARANTEE_ADVANCE' AND enumtypid = 'public."DocumentCategory"'::regtype) THEN
    ALTER TYPE "DocumentCategory" ADD VALUE 'BANK_GUARANTEE_ADVANCE';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'BANK_GUARANTEE_RETENTION' AND enumtypid = 'public."DocumentCategory"'::regtype) THEN
    ALTER TYPE "DocumentCategory" ADD VALUE 'BANK_GUARANTEE_RETENTION';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'INSURANCE_ALL_RISKS' AND enumtypid = 'public."DocumentCategory"'::regtype) THEN
    ALTER TYPE "DocumentCategory" ADD VALUE 'INSURANCE_ALL_RISKS';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'INSURANCE_CIVIL_LIABILITY' AND enumtypid = 'public."DocumentCategory"'::regtype) THEN
    ALTER TYPE "DocumentCategory" ADD VALUE 'INSURANCE_CIVIL_LIABILITY';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'INSURANCE_DECENNIAL' AND enumtypid = 'public."DocumentCategory"'::regtype) THEN
    ALTER TYPE "DocumentCategory" ADD VALUE 'INSURANCE_DECENNIAL';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'STATEMENT' AND enumtypid = 'public."DocumentCategory"'::regtype) THEN
    ALTER TYPE "DocumentCategory" ADD VALUE 'STATEMENT';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'PURCHASE_ORDER' AND enumtypid = 'public."DocumentCategory"'::regtype) THEN
    ALTER TYPE "DocumentCategory" ADD VALUE 'PURCHASE_ORDER';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'TECHNICAL_PLAN' AND enumtypid = 'public."DocumentCategory"'::regtype) THEN
    ALTER TYPE "DocumentCategory" ADD VALUE 'TECHNICAL_PLAN';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'PHOTO_SITE' AND enumtypid = 'public."DocumentCategory"'::regtype) THEN
    ALTER TYPE "DocumentCategory" ADD VALUE 'PHOTO_SITE';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'OFFICIAL_NOTIFICATION' AND enumtypid = 'public."DocumentCategory"'::regtype) THEN
    ALTER TYPE "DocumentCategory" ADD VALUE 'OFFICIAL_NOTIFICATION';
  END IF;
END$$;

-- 2) Ajout des nouveaux champs à site_documents
ALTER TABLE "site_documents"
  ADD COLUMN IF NOT EXISTS "subCategory"      TEXT,
  ADD COLUMN IF NOT EXISTS "referenceNumber"  TEXT,
  ADD COLUMN IF NOT EXISTS "issuedAt"         TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "validUntil"       TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "amount"           BIGINT,
  ADD COLUMN IF NOT EXISTS "relatedPartyName" TEXT,
  ADD COLUMN IF NOT EXISTS "archived"         BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "archivedAt"       TIMESTAMP(3);

-- 3) Index pour les filtres + alertes expiration
CREATE INDEX IF NOT EXISTS "site_documents_siteId_archived_idx"
  ON "site_documents" ("siteId", "archived");

CREATE INDEX IF NOT EXISTS "site_documents_validUntil_idx"
  ON "site_documents" ("validUntil");
