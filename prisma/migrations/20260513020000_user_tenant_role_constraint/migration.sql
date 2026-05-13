-- Contrainte d'intégrité multi-tenant :
--   Tout user DOIT être lié à une entreprise (tenantId) ET avoir un rôle (post),
--   SAUF :
--     - CANDIDATE (chercheurs d'emploi externes, pas encore embauchés)
--     - SUPER_ADMIN (admin SaaS Anthropic-style, transverse à tous tenants)
--
-- Pour `position` (libellé texte) : pas de contrainte stricte (peut rester null
-- si l'employé n'a pas encore de poste assigné nominativement, ex: nouvel ouvrier
-- sans intitulé précis). Mais l'audit data actuel montre 100% rempli.

-- D'abord vérifier qu'aucun user existant ne viole la contrainte (sécurité)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM users
    WHERE "tenantId" IS NULL
      AND role NOT IN ('CANDIDATE', 'SUPER_ADMIN')
  ) THEN
    RAISE EXCEPTION 'Migration bloquée : des users non-CANDIDATE/SUPER_ADMIN ont tenantId=NULL. Corriger les données avant.';
  END IF;
END $$;

-- Pose la contrainte CHECK
ALTER TABLE "users"
  ADD CONSTRAINT "users_tenant_required_for_employees"
  CHECK (
    "tenantId" IS NOT NULL
    OR role = 'CANDIDATE'
    OR role = 'SUPER_ADMIN'
  );

-- Index partiel sur (tenantId, role) pour accélérer les requêtes fréquentes
-- "tous les ARCHIVIST du tenant X" qui contournent l'index principal (tenantId, email)
CREATE INDEX IF NOT EXISTS "users_tenantId_role_idx" ON "users"("tenantId", "role")
  WHERE "tenantId" IS NOT NULL;
