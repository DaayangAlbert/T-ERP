import { Role } from "@prisma/client";

export function canManageSites(role: Role): boolean {
  // TENANT_ADMIN (IT) inclus : c'est lui qui crée les marchés/chantiers depuis
  // l'espace Informatique, il doit donc aussi pouvoir les éditer et gérer leurs
  // contrats (cohérence création ↔ modification).
  return (
    role === Role.DG ||
    role === Role.DAF ||
    role === Role.TECH_DIRECTOR ||
    role === Role.TENANT_ADMIN
  );
}

export function canViewAllPayslips(role: Role): boolean {
  return role === Role.DG || role === Role.DAF || role === Role.HR;
}

export function isSuperAdmin(role: Role): boolean {
  return role === Role.SUPER_ADMIN;
}
