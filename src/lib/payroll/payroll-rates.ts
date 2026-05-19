import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface PayrollRates {
  cnpsCeilingMonthly: number;
  cnpsEmployeeRate: number;
  cnpsEmployerRate: number;
  cfcEmployeeRate: number;
  cfcEmployerRate: number;
  fneEmployerRate: number;
  familyAllowanceRate: number;
  accidentWorkRate: number;
  cacRate: number;
  defaultTransportAllowance: number;
  standardMonthlyHours: number;
  standardWorkedDays: number;
  baseSalaryByCategory: Record<string, number>;
}

export const DEFAULT_PAYROLL_RATES: PayrollRates = {
  cnpsCeilingMonthly: 750_000,
  cnpsEmployeeRate: 0.042,
  cnpsEmployerRate: 0.042,
  cfcEmployeeRate: 0.01,
  cfcEmployerRate: 0.015,
  fneEmployerRate: 0.01,
  familyAllowanceRate: 0.07,
  accidentWorkRate: 0.0175,
  cacRate: 0.1,
  defaultTransportAllowance: 30_000,
  standardMonthlyHours: 173.33,
  standardWorkedDays: 22,
  baseSalaryByCategory: {
    "OS N1": 187_000,
    "OS N2": 202_400,
    "OS N3": 242_000,
    "OQ N4": 319_000,
    "OQ N5": 374_000,
    "Maitrise M3": 484_000,
    "Maîtrise M3": 484_000,
    ETAM: 572_000,
    "Cadre M2": 836_000,
    "Cadre HC": 1_430_000,
    "Cadre Sup HC": 2_420_000,
  },
};

type JsonObject = Record<string, Prisma.JsonValue>;

function isObject(value: Prisma.JsonValue | null | undefined): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readNumber(source: JsonObject, key: keyof PayrollRates, fallback: number): number {
  const value = source[String(key)];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function readBaseSalaryByCategory(source: JsonObject): Record<string, number> {
  const raw = source.baseSalaryByCategory;
  if (!isObject(raw)) return DEFAULT_PAYROLL_RATES.baseSalaryByCategory;

  return Object.entries(raw).reduce<Record<string, number>>((acc, [key, value]) => {
    const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
    if (Number.isFinite(parsed)) acc[key] = parsed;
    return acc;
  }, { ...DEFAULT_PAYROLL_RATES.baseSalaryByCategory });
}

export function mergePayrollRates(raw: Prisma.JsonValue | null | undefined): PayrollRates {
  if (!isObject(raw)) return DEFAULT_PAYROLL_RATES;

  return {
    cnpsCeilingMonthly: readNumber(raw, "cnpsCeilingMonthly", DEFAULT_PAYROLL_RATES.cnpsCeilingMonthly),
    cnpsEmployeeRate: readNumber(raw, "cnpsEmployeeRate", DEFAULT_PAYROLL_RATES.cnpsEmployeeRate),
    cnpsEmployerRate: readNumber(raw, "cnpsEmployerRate", DEFAULT_PAYROLL_RATES.cnpsEmployerRate),
    cfcEmployeeRate: readNumber(raw, "cfcEmployeeRate", DEFAULT_PAYROLL_RATES.cfcEmployeeRate),
    cfcEmployerRate: readNumber(raw, "cfcEmployerRate", DEFAULT_PAYROLL_RATES.cfcEmployerRate),
    fneEmployerRate: readNumber(raw, "fneEmployerRate", DEFAULT_PAYROLL_RATES.fneEmployerRate),
    familyAllowanceRate: readNumber(raw, "familyAllowanceRate", DEFAULT_PAYROLL_RATES.familyAllowanceRate),
    accidentWorkRate: readNumber(raw, "accidentWorkRate", DEFAULT_PAYROLL_RATES.accidentWorkRate),
    cacRate: readNumber(raw, "cacRate", DEFAULT_PAYROLL_RATES.cacRate),
    defaultTransportAllowance: readNumber(
      raw,
      "defaultTransportAllowance",
      DEFAULT_PAYROLL_RATES.defaultTransportAllowance
    ),
    standardMonthlyHours: readNumber(raw, "standardMonthlyHours", DEFAULT_PAYROLL_RATES.standardMonthlyHours),
    standardWorkedDays: readNumber(raw, "standardWorkedDays", DEFAULT_PAYROLL_RATES.standardWorkedDays),
    baseSalaryByCategory: readBaseSalaryByCategory(raw),
  };
}

export async function getPayrollRates(tenantId: string): Promise<PayrollRates> {
  const settings = await prisma.tenantSettings.findUnique({
    where: { tenantId },
    select: { payrollRates: true },
  });
  return mergePayrollRates(settings?.payrollRates);
}

export function resolveBaseSalary(category: string | null | undefined, rates: PayrollRates): number {
  if (!category) return rates.baseSalaryByCategory.ETAM ?? 0;
  return rates.baseSalaryByCategory[category] ?? rates.baseSalaryByCategory.ETAM ?? 0;
}

export function asPercent(rate: number): number {
  return Math.round(rate * 10_000) / 100;
}
