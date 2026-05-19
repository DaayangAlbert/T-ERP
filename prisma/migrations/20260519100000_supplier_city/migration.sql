-- Ajoute la ville aux fournisseurs (utilisée par la vue DG pour le
-- regroupement géographique).

ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "city" TEXT;
CREATE INDEX IF NOT EXISTS "suppliers_tenantId_city_idx" ON "suppliers" ("tenantId", "city");
