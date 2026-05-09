import { Role } from "@prisma/client";

export function canManageSites(role: Role): boolean {
  return role === Role.DG || role === Role.DAF || role === Role.TECH_DIRECTOR;
}

export function canViewAllPayslips(role: Role): boolean {
  return role === Role.DG || role === Role.DAF || role === Role.HR;
}

export function isSuperAdmin(role: Role): boolean {
  return role === Role.SUPER_ADMIN;
}
