import type { PayrollEmployeeSnapshot, PayrollInput, Prisma } from "@prisma/client";
import { calculateCnpsBase, calculateCnpsEmployee, calculateCnpsEmployer } from "./cnps";
import { calculateMonthlyIrpp } from "./irpp";
import type { PayrollRates } from "./payroll-rates";

export interface CalculatedPayslip {
  baseSalary: number;
  proratedBaseSalary: number;
  transportAllowance: number;
  overtimeAmount: number;
  overtimeHours: number;
  bonuses: PayrollAmountLine[];
  advantagesInKind: number;
  salaryGross: number;
  taxableGross: number;
  cnpsBase: number;
  cnpsEmployee: number;
  cnpsEmployer: number;
  cfcEmployee: number;
  cfcEmployer: number;
  fneEmployer: number;
  familyAllowance: number;
  accidentWork: number;
  annualIrppBase: number;
  annualIrpp: number;
  monthlyIrpp: number;
  cac: number;
  advances: number;
  loans: number;
  absenceDeductions: number;
  otherDeductions: number;
  totalDeductions: number;
  netToPay: number;
  totalEmployerCharges: number;
  employerCost: number;
  workedDays: number;
  reportedHours: number;
  warnings: PayrollWarning[];
}

export interface PayrollAmountLine {
  code?: string;
  label: string;
  amount: number;
  taxable?: boolean;
}

export interface PayrollWarning {
  severity: "info" | "warning" | "error";
  code: string;
  message: string;
}

type JsonAmount = {
  code?: unknown;
  label?: unknown;
  amount?: unknown;
  taxable?: unknown;
};

function decimalToNumber(value: Prisma.Decimal | number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function parseAmount(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function parseAmountLines(value: Prisma.JsonValue | null | undefined): PayrollAmountLine[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry): PayrollAmountLine | null => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
      const item = entry as JsonAmount;
      const amount = Math.max(0, parseAmount(item.amount));
      if (amount <= 0) return null;
      return {
        code: typeof item.code === "string" ? item.code : undefined,
        label: typeof item.label === "string" ? item.label : "Montant",
        amount,
        taxable: typeof item.taxable === "boolean" ? item.taxable : true,
      };
    })
    .filter((entry): entry is PayrollAmountLine => Boolean(entry));
}

function sumDeductions(value: Prisma.JsonValue | null | undefined, codePrefix: string): number {
  return parseAmountLines(value)
    .filter((entry) => (entry.code ?? "").toUpperCase().startsWith(codePrefix))
    .reduce((sum, entry) => sum + entry.amount, 0);
}

function sumOtherDeductions(value: Prisma.JsonValue | null | undefined): number {
  return parseAmountLines(value)
    .filter((entry) => {
      const code = (entry.code ?? "").toUpperCase();
      return !code.startsWith("PRET") && !code.startsWith("ABS");
    })
    .reduce((sum, entry) => sum + entry.amount, 0);
}

export function calculatePayslip(
  employeeSnapshot: PayrollEmployeeSnapshot,
  payrollInput: PayrollInput | null,
  rates: PayrollRates
): CalculatedPayslip {
  const workedDays = Math.max(0, payrollInput?.daysWorked ?? rates.standardWorkedDays);
  const overtimeHours = Math.max(0, payrollInput?.overtimeHours ?? 0);
  const reportedHours = Math.max(
    0,
    payrollInput?.hoursWorked ?? (workedDays / rates.standardWorkedDays) * rates.standardMonthlyHours
  );

  const baseSalary = Math.round(decimalToNumber(employeeSnapshot.baseSalary));
  const proratedBaseSalary = Math.round(baseSalary * Math.min(1, workedDays / rates.standardWorkedDays));
  const hourlyRate = baseSalary > 0 ? baseSalary / rates.standardMonthlyHours : 0;
  const overtimeAmount = Math.round(overtimeHours * hourlyRate * 1.25);
  const transportAllowance = baseSalary > 0 ? rates.defaultTransportAllowance : 0;
  const bonuses = parseAmountLines(payrollInput?.bonuses);
  const taxableBonuses = bonuses
    .filter((bonus) => bonus.taxable !== false)
    .reduce((sum, bonus) => sum + bonus.amount, 0);
  const totalBonuses = bonuses.reduce((sum, bonus) => sum + bonus.amount, 0);
  const advantagesInKind = 0;

  const salaryGross = Math.round(proratedBaseSalary + transportAllowance + overtimeAmount + totalBonuses);
  const taxableGross = Math.round(proratedBaseSalary + overtimeAmount + taxableBonuses + advantagesInKind);
  const cnpsBase = calculateCnpsBase(salaryGross, rates);
  const cnpsEmployee = calculateCnpsEmployee(salaryGross, rates);
  const cnpsEmployer = calculateCnpsEmployer(salaryGross, rates);
  const cfcEmployee = Math.round(taxableGross * rates.cfcEmployeeRate);
  const cfcEmployer = Math.round(taxableGross * rates.cfcEmployerRate);
  const fneEmployer = Math.round(taxableGross * rates.fneEmployerRate);
  const familyAllowance = Math.round(cnpsBase * rates.familyAllowanceRate);
  const accidentWork = Math.round(cnpsBase * rates.accidentWorkRate);
  const irpp = calculateMonthlyIrpp(taxableGross);
  const cac = Math.round(irpp.monthlyIrpp * rates.cacRate);

  const advances = Number(payrollInput?.advances ?? 0n);
  const loans = sumDeductions(payrollInput?.deductions, "PRET");
  const absenceDeductions = sumDeductions(payrollInput?.deductions, "ABS");
  const otherDeductions = sumOtherDeductions(payrollInput?.deductions);
  const totalDeductions = Math.round(
    cnpsEmployee + cfcEmployee + irpp.monthlyIrpp + cac + advances + loans + absenceDeductions + otherDeductions
  );
  const netToPay = Math.round(salaryGross - totalDeductions);
  const totalEmployerCharges = Math.round(cnpsEmployer + cfcEmployer + fneEmployer + familyAllowance + accidentWork);
  const employerCost = Math.round(salaryGross + totalEmployerCharges);

  const warnings: PayrollWarning[] = [];
  if (!employeeSnapshot.profilePhotoUrl) {
    warnings.push({ severity: "warning", code: "PHOTO_MISSING", message: "Photo de profil manquante" });
  }
  if (!employeeSnapshot.cnpsNumber) {
    warnings.push({ severity: "warning", code: "CNPS_MISSING", message: "Numero CNPS manquant" });
  }
  if (!employeeSnapshot.bankName || !employeeSnapshot.bankAccount) {
    warnings.push({ severity: "warning", code: "BANK_MISSING", message: "Coordonnees bancaires incompletes" });
  }
  if (baseSalary <= 0) {
    warnings.push({ severity: "error", code: "BASE_SALARY_ZERO", message: "Salaire de base nul" });
  }
  if (netToPay < 0) {
    warnings.push({ severity: "error", code: "NET_NEGATIVE", message: "Net a payer negatif" });
  }
  if (!employeeSnapshot.userId) {
    warnings.push({ severity: "warning", code: "SYNTHETIC_EMPLOYEE", message: "Employe sans userId reel" });
  }

  return {
    baseSalary,
    proratedBaseSalary,
    transportAllowance,
    overtimeAmount,
    overtimeHours,
    bonuses,
    advantagesInKind,
    salaryGross,
    taxableGross,
    cnpsBase,
    cnpsEmployee,
    cnpsEmployer,
    cfcEmployee,
    cfcEmployer,
    fneEmployer,
    familyAllowance,
    accidentWork,
    annualIrppBase: irpp.annualBase,
    annualIrpp: irpp.annualIrpp,
    monthlyIrpp: irpp.monthlyIrpp,
    cac,
    advances,
    loans,
    absenceDeductions,
    otherDeductions,
    totalDeductions,
    netToPay,
    totalEmployerCharges,
    employerCost,
    workedDays,
    reportedHours,
    warnings,
  };
}
