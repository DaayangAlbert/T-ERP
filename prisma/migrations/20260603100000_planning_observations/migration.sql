-- Ajout du champ libre observations sur le planning chantier (saisie DTrav,
-- rendu dans le PDF à la place des lignes pointillées vides).

ALTER TABLE "site_plannings" ADD COLUMN IF NOT EXISTS "observations" TEXT;
