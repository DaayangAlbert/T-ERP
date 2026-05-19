-- Ajout du champ `scope` (WarehouseScope) et `ownerDirection` (Role)
-- au modèle Warehouse pour permettre le filtrage par direction et par
-- chantier dans les espaces ADMIN/DAF du module magasin.
--
-- 3 valeurs possibles pour scope :
--   CHANTIER   → magasin rattaché à un chantier (Site), siteId requis
--   DIRECTION  → magasin rattaché à une direction (DG/DAF/HR/...),
--                ownerDirection requis, siteId null
--   CENTRAL    → magasin central groupe (transverse), siteId null
--
-- Migration idempotente : safe à rejouer.

-- 1) Création de l'enum WarehouseScope si absent.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WarehouseScope') THEN
    CREATE TYPE "WarehouseScope" AS ENUM ('CHANTIER', 'DIRECTION', 'CENTRAL');
  END IF;
END$$;

-- 2) Ajout des colonnes scope + ownerDirection sur warehouses.
ALTER TABLE "warehouses"
  ADD COLUMN IF NOT EXISTS "scope" "WarehouseScope" NOT NULL DEFAULT 'CHANTIER';

ALTER TABLE "warehouses"
  ADD COLUMN IF NOT EXISTS "ownerDirection" "Role";

-- 3) siteId devient nullable (un magasin DIRECTION/CENTRAL n'a pas de Site).
ALTER TABLE "warehouses" ALTER COLUMN "siteId" DROP NOT NULL;

-- 4) Index pour accélérer les filtrages côté UI.
CREATE INDEX IF NOT EXISTS "warehouses_tenantId_scope_idx"
  ON "warehouses" ("tenantId", "scope");

CREATE INDEX IF NOT EXISTS "warehouses_tenantId_ownerDirection_idx"
  ON "warehouses" ("tenantId", "ownerDirection");
