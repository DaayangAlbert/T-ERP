-- Fusion des doublons d'enum Role :
--   SG  → SECRETARY_GENERAL (version explicite, déjà privilégiée par le code récent)
--   GED → ARCHIVIST (version explicite, ARCHIVIST = canReadAllDocuments + sémantique métier)
--
-- Idempotente : safe à rejouer en cas de besoin (les UPDATE filtrent sur les
-- anciennes valeurs, la reconstruction du type vérifie l'existence préalable).

-- 1) Migration des données existantes vers les valeurs canoniques.
UPDATE "users" SET "role" = 'SECRETARY_GENERAL' WHERE "role"::text = 'SG';
UPDATE "users" SET "role" = 'ARCHIVIST' WHERE "role"::text = 'GED';

UPDATE "custom_roles" SET "basedOn" = 'SECRETARY_GENERAL' WHERE "basedOn"::text = 'SG';
UPDATE "custom_roles" SET "basedOn" = 'ARCHIVIST' WHERE "basedOn"::text = 'GED';

UPDATE "role_promotion_requests" SET "fromRole" = 'SECRETARY_GENERAL' WHERE "fromRole"::text = 'SG';
UPDATE "role_promotion_requests" SET "fromRole" = 'ARCHIVIST' WHERE "fromRole"::text = 'GED';
UPDATE "role_promotion_requests" SET "toRole" = 'SECRETARY_GENERAL' WHERE "toRole"::text = 'SG';
UPDATE "role_promotion_requests" SET "toRole" = 'ARCHIVIST' WHERE "toRole"::text = 'GED';

-- 2) Array validatorRoles : remplace toute occurrence SG/GED dans le tableau.
UPDATE "role_promotion_requests"
SET "validatorRoles" = array_replace(array_replace("validatorRoles"::text[], 'SG', 'SECRETARY_GENERAL'), 'GED', 'ARCHIVIST')::"Role"[]
WHERE 'SG' = ANY("validatorRoles"::text[]) OR 'GED' = ANY("validatorRoles"::text[]);

-- 3) Reconstruction du type enum sans SG/GED.
DO $$
BEGIN
  -- N'effectue le rebuild que si l'ancien type contient encore SG ou GED.
  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'Role' AND e.enumlabel IN ('SG', 'GED')
  ) THEN
    ALTER TYPE "Role" RENAME TO "Role_old";

    CREATE TYPE "Role" AS ENUM (
      'DG', 'DAF', 'SECRETARY_GENERAL', 'HR',
      'TECH_DIRECTOR', 'WORKS_DIRECTOR', 'WORKS_MANAGER', 'SITE_MANAGER', 'WORKER',
      'ACCOUNTANT', 'LOGISTICS', 'WAREHOUSE', 'ARCHIVIST', 'EMPLOYEE',
      'CANDIDATE',
      'TENANT_ADMIN', 'SUPER_ADMIN'
    );

    -- Le check `users_tenant_required_for_employees` référence l'ancien type
    -- via 'CANDIDATE'::"Role". On le drop, on switch les colonnes, on recreate.
    ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_tenant_required_for_employees";

    -- users.role : default 'EMPLOYEE'
    ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
    ALTER TABLE "users" ALTER COLUMN "role" TYPE "Role" USING "role"::text::"Role";
    ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'EMPLOYEE'::"Role";

    -- custom_roles.basedOn
    ALTER TABLE "custom_roles" ALTER COLUMN "basedOn" TYPE "Role" USING "basedOn"::text::"Role";

    -- role_promotion_requests : 3 colonnes (2 scalaires + 1 array)
    ALTER TABLE "role_promotion_requests" ALTER COLUMN "fromRole" TYPE "Role" USING "fromRole"::text::"Role";
    ALTER TABLE "role_promotion_requests" ALTER COLUMN "toRole" TYPE "Role" USING "toRole"::text::"Role";
    ALTER TABLE "role_promotion_requests" ALTER COLUMN "validatorRoles" TYPE "Role"[] USING "validatorRoles"::text[]::"Role"[];

    -- Recreate le check une fois la colonne sur le nouveau type.
    ALTER TABLE "users" ADD CONSTRAINT "users_tenant_required_for_employees"
      CHECK (("tenantId" IS NOT NULL) OR ("role" = 'CANDIDATE'::"Role") OR ("role" = 'SUPER_ADMIN'::"Role"));

    DROP TYPE "Role_old";
  END IF;
END $$;
