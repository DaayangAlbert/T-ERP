-- Gestion des comptes financiers : cycle de vie (clôture) des comptes
-- bancaires et des caisses chantier. Additif et idempotent.

-- BankAccount
ALTER TABLE "bank_accounts" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "bank_accounts" ADD COLUMN IF NOT EXISTS "closedAt" TIMESTAMP(3);

-- SiteCashbox
ALTER TABLE "cpt_site_cashboxes" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "cpt_site_cashboxes" ADD COLUMN IF NOT EXISTS "closedAt" TIMESTAMP(3);
