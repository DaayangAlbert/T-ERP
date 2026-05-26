-- Ajout du rôle QHSE_MANAGER (Responsable QHSE) à l'enum Role.
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'QHSE_MANAGER';
