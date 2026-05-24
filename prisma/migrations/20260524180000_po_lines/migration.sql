-- Lignes d'articles d'un bon de commande (multi-articles). Additif.
ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "lines" JSONB NOT NULL DEFAULT '[]';
