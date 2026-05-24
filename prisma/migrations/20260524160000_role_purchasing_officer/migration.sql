-- Ajoute le rôle PURCHASING_OFFICER (Chargé des achats). Additif et idempotent.
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'PURCHASING_OFFICER';
