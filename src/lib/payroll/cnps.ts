import type { PayrollRates } from "./payroll-rates";

export function calculateCnpsBase(grossAmount: number, rates: PayrollRates): number {
  return Math.round(Math.min(Math.max(0, grossAmount), rates.cnpsCeilingMonthly));
}

export function calculateCnpsEmployee(grossAmount: number, rates: PayrollRates): number {
  return Math.round(calculateCnpsBase(grossAmount, rates) * rates.cnpsEmployeeRate);
}

export function calculateCnpsEmployer(grossAmount: number, rates: PayrollRates): number {
  return Math.round(calculateCnpsBase(grossAmount, rates) * rates.cnpsEmployerRate);
}
