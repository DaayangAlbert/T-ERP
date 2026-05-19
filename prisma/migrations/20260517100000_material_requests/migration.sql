-- Demandes de matériel : workflow Chef de Chantier → Magasin.
-- Le CC émet une demande pour son chantier, le magasinier (keeper du
-- Warehouse) l'honore (génère des mouvements OUT en transaction) ou la
-- refuse avec un motif.

-- 1) Enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MaterialRequestStatus') THEN
    CREATE TYPE "MaterialRequestStatus" AS ENUM ('PENDING', 'FULFILLED', 'PARTIAL', 'REJECTED', 'CANCELLED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MaterialRequestPriority') THEN
    CREATE TYPE "MaterialRequestPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
  END IF;
END$$;

-- 2) Table material_requests
CREATE TABLE IF NOT EXISTS "material_requests" (
  "id"               TEXT PRIMARY KEY,
  "tenantId"         TEXT NOT NULL,
  "requesterId"      TEXT NOT NULL,
  "siteId"           TEXT NOT NULL,
  "warehouseId"      TEXT NOT NULL,
  "reference"        TEXT NOT NULL UNIQUE,
  "status"           "MaterialRequestStatus" NOT NULL DEFAULT 'PENDING',
  "priority"         "MaterialRequestPriority" NOT NULL DEFAULT 'NORMAL',
  "reason"           TEXT,
  "notes"            TEXT,
  "fulfilledById"    TEXT,
  "fulfilledAt"      TIMESTAMP(3),
  "rejectionReason"  TEXT,
  "rejectedAt"       TIMESTAMP(3),
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL,

  CONSTRAINT "material_requests_requesterId_fkey"   FOREIGN KEY ("requesterId")   REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT "material_requests_siteId_fkey"        FOREIGN KEY ("siteId")        REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "material_requests_warehouseId_fkey"   FOREIGN KEY ("warehouseId")   REFERENCES "warehouses"("id") ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT "material_requests_fulfilledById_fkey" FOREIGN KEY ("fulfilledById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "material_requests_tenantId_status_idx"    ON "material_requests" ("tenantId", "status");
CREATE INDEX IF NOT EXISTS "material_requests_warehouseId_status_idx" ON "material_requests" ("warehouseId", "status");
CREATE INDEX IF NOT EXISTS "material_requests_requesterId_idx"        ON "material_requests" ("requesterId");
CREATE INDEX IF NOT EXISTS "material_requests_siteId_idx"             ON "material_requests" ("siteId");

-- 3) Table material_request_lines
CREATE TABLE IF NOT EXISTS "material_request_lines" (
  "id"                TEXT PRIMARY KEY,
  "requestId"         TEXT NOT NULL,
  "articleId"         TEXT NOT NULL,
  "quantityRequested" DOUBLE PRECISION NOT NULL,
  "quantityFulfilled" DOUBLE PRECISION,
  "notes"             TEXT,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL,

  CONSTRAINT "material_request_lines_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "material_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "material_request_lines_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "articles"("id") ON DELETE NO ACTION ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "material_request_lines_requestId_idx" ON "material_request_lines" ("requestId");
CREATE INDEX IF NOT EXISTS "material_request_lines_articleId_idx" ON "material_request_lines" ("articleId");
