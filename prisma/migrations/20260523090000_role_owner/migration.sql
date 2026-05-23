-- Ajoute le rôle OWNER (Propriétaire / PCA) à l'enum Role.
-- Additif et idempotent : ALTER TYPE ... ADD VALUE ne touche pas aux données.
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'OWNER';
