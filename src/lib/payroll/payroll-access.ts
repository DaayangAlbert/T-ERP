import { Role } from "@prisma/client";

export const PAYROLL_STATE_READ_ROLES: Role[] = [Role.HR, Role.DAF, Role.DG, Role.TENANT_ADMIN];
export const PAYROLL_CALCULATE_ROLES: Role[] = [Role.HR, Role.TENANT_ADMIN];
export const PAYROLL_N1_ROLES: Role[] = [Role.HR, Role.TENANT_ADMIN];
export const PAYROLL_N2_ROLES: Role[] = [Role.DAF];
export const PAYROLL_ADMIN_PDF_ROLES: Role[] = [Role.HR, Role.DAF, Role.DG, Role.TENANT_ADMIN];

export function hasPayrollRole(role: Role | string, allowed: Role[]): boolean {
  return allowed.includes(role as Role);
}

export function canReadPayrollState(role: Role | string): boolean {
  return hasPayrollRole(role, PAYROLL_STATE_READ_ROLES);
}

export function canCalculatePayroll(role: Role | string): boolean {
  return hasPayrollRole(role, PAYROLL_CALCULATE_ROLES);
}

export function canValidatePayrollN1(role: Role | string): boolean {
  return hasPayrollRole(role, PAYROLL_N1_ROLES);
}

export function canReadAdminPayslipPdf(role: Role | string): boolean {
  return hasPayrollRole(role, PAYROLL_ADMIN_PDF_ROLES);
}
