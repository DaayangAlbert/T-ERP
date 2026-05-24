-- Marque un engin comme loué à un tiers (coût récurrent). Additif.
ALTER TABLE "equipment" ADD COLUMN IF NOT EXISTS "isRented" BOOLEAN NOT NULL DEFAULT false;
