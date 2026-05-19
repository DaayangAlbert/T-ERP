import type { Prisma } from "@prisma/client";
import type { CalculatedPayslip } from "./calculate-payslip";
import { asPercent } from "./payroll-rates";
import type { PayrollRates } from "./payroll-rates";

export interface PayslipLineDraft {
  code: string;
  label: string;
  quantity: number | null;
  base: bigint | null;
  rate: number | null;
  amountPlus: bigint | null;
  amountMinus: bigint | null;
  employerAmount: bigint | null;
  order: number;
}

function money(value: number): bigint | null {
  const rounded = Math.round(value);
  return rounded === 0 ? null : BigInt(rounded);
}

export function buildPayslipLines(
  calculated: CalculatedPayslip,
  rates: PayrollRates
): PayslipLineDraft[] {
  const lines: PayslipLineDraft[] = [
    {
      code: "A001",
      label: "Salaire de base",
      quantity: calculated.workedDays,
      base: money(calculated.baseSalary),
      rate: null,
      amountPlus: money(calculated.proratedBaseSalary),
      amountMinus: null,
      employerAmount: null,
      order: 10,
    },
    {
      code: "A002",
      label: "Indemnite transport",
      quantity: null,
      base: null,
      rate: null,
      amountPlus: money(calculated.transportAllowance),
      amountMinus: null,
      employerAmount: null,
      order: 20,
    },
    {
      code: "A005",
      label: "Heures supplementaires",
      quantity: calculated.overtimeHours,
      base: money(calculated.baseSalary),
      rate: 125,
      amountPlus: money(calculated.overtimeAmount),
      amountMinus: null,
      employerAmount: null,
      order: 50,
    },
    {
      code: "A099",
      label: "Autres primes et indemnites",
      quantity: null,
      base: null,
      rate: null,
      amountPlus: money(calculated.bonuses.reduce((sum, bonus) => sum + bonus.amount, 0)),
      amountMinus: null,
      employerAmount: null,
      order: 99,
    },
    {
      code: "B001",
      label: "CNPS salarie",
      quantity: null,
      base: money(calculated.cnpsBase),
      rate: asPercent(rates.cnpsEmployeeRate),
      amountPlus: null,
      amountMinus: money(calculated.cnpsEmployee),
      employerAmount: null,
      order: 110,
    },
    {
      code: "B002",
      label: "CFC salarie",
      quantity: null,
      base: money(calculated.taxableGross),
      rate: asPercent(rates.cfcEmployeeRate),
      amountPlus: null,
      amountMinus: money(calculated.cfcEmployee),
      employerAmount: null,
      order: 120,
    },
    {
      code: "B003",
      label: "IRPP",
      quantity: null,
      base: money(calculated.taxableGross),
      rate: null,
      amountPlus: null,
      amountMinus: money(calculated.monthlyIrpp),
      employerAmount: null,
      order: 130,
    },
    {
      code: "B004",
      label: "CAC",
      quantity: null,
      base: money(calculated.monthlyIrpp),
      rate: asPercent(rates.cacRate),
      amountPlus: null,
      amountMinus: money(calculated.cac),
      employerAmount: null,
      order: 140,
    },
    {
      code: "B005",
      label: "Avance sur salaire",
      quantity: null,
      base: null,
      rate: null,
      amountPlus: null,
      amountMinus: money(calculated.advances),
      employerAmount: null,
      order: 150,
    },
    {
      code: "B006",
      label: "Pret social",
      quantity: null,
      base: null,
      rate: null,
      amountPlus: null,
      amountMinus: money(calculated.loans),
      employerAmount: null,
      order: 160,
    },
    {
      code: "B007",
      label: "Absences et retards",
      quantity: null,
      base: null,
      rate: null,
      amountPlus: null,
      amountMinus: money(calculated.absenceDeductions),
      employerAmount: null,
      order: 170,
    },
    {
      code: "B099",
      label: "Autres retenues",
      quantity: null,
      base: null,
      rate: null,
      amountPlus: null,
      amountMinus: money(calculated.otherDeductions),
      employerAmount: null,
      order: 199,
    },
    {
      code: "C001",
      label: "CNPS employeur",
      quantity: null,
      base: money(calculated.cnpsBase),
      rate: asPercent(rates.cnpsEmployerRate),
      amountPlus: null,
      amountMinus: null,
      employerAmount: money(calculated.cnpsEmployer),
      order: 210,
    },
    {
      code: "C002",
      label: "Allocations familiales",
      quantity: null,
      base: money(calculated.cnpsBase),
      rate: asPercent(rates.familyAllowanceRate),
      amountPlus: null,
      amountMinus: null,
      employerAmount: money(calculated.familyAllowance),
      order: 220,
    },
    {
      code: "C003",
      label: "Accident travail",
      quantity: null,
      base: money(calculated.cnpsBase),
      rate: asPercent(rates.accidentWorkRate),
      amountPlus: null,
      amountMinus: null,
      employerAmount: money(calculated.accidentWork),
      order: 230,
    },
    {
      code: "C004",
      label: "CFC employeur",
      quantity: null,
      base: money(calculated.taxableGross),
      rate: asPercent(rates.cfcEmployerRate),
      amountPlus: null,
      amountMinus: null,
      employerAmount: money(calculated.cfcEmployer),
      order: 240,
    },
    {
      code: "C005",
      label: "FNE",
      quantity: null,
      base: money(calculated.taxableGross),
      rate: asPercent(rates.fneEmployerRate),
      amountPlus: null,
      amountMinus: null,
      employerAmount: money(calculated.fneEmployer),
      order: 250,
    },
  ];

  return lines.filter((line) => line.amountPlus || line.amountMinus || line.employerAmount || line.code === "A001");
}

export function toPrismaPayslipLineCreateMany(
  payslipId: string,
  lines: PayslipLineDraft[]
): Prisma.PayslipLineCreateManyInput[] {
  return lines.map((line) => ({ payslipId, ...line }));
}
