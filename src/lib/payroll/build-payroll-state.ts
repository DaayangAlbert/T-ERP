import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface PayrollStateData {
  cycle: {
    id: string;
    period: string;
    status: string;
    calculatedAt: string | null;
    n1ValidatedAt: string | null;
    n2ValidatedAt: string | null;
    n3ValidatedAt: string | null;
  };
  tenant: {
    id: string;
    name: string;
    taxId: string | null;
    cnpsId: string | null;
    logoUrl: string | null;
    primaryColor: string | null;
  };
  kpis: {
    grossPayroll: number;
    totalDeductions: number;
    employerCharges: number;
    netToPay: number;
    paidHeadcount: number;
  };
  recap: {
    grossSalaries: number;
    primesAndAllowances: number;
    benefitsInKind: number;
    taxableGross: number;
    salaryDeductions: number;
    cnpsEmployee: number;
    irpp: number;
    cac: number;
    advances: number;
    otherDeductions: number;
    netToPay: number;
    employerCharges: number;
    employerCost: number;
  };
  retentionDetails: {
    socialOrganizations: PayrollStateAmount[];
    taxes: PayrollStateAmount[];
    other: PayrollStateAmount[];
  };
  employerChargeDetails: {
    socialOrganizations: PayrollStateAmount[];
    other: PayrollStateAmount[];
  };
  categories: PayrollStateCategory[];
  fiscalSummary: PayrollFiscalSummary;
  rows: PayrollStateRow[];
  warnings: PayrollStateWarning[];
}

export interface PayrollStateAmount {
  label: string;
  amount: number;
}

export interface PayrollStateCategory {
  category: string;
  headcount: number;
  taxableGross: number;
  salaryDeductions: number;
  employerCharges: number;
  netToPay: number;
  employerCost: number;
}

export interface PayrollFiscalSummary {
  irppTaxableBase: number;
  irppWithheld: number;
  cnpsEmployeeDeclared: number;
  cnpsEmployerDeclared: number;
  cacDeclared: number;
  socialOrganizationsTotal: number;
}

export interface PayrollStateWarning {
  severity: "info" | "warning" | "error";
  code: string;
  message: string;
  count?: number;
}

export interface PayrollStateRow {
  payslipId: string;
  verificationUrl: string | null;
  matricule: string;
  photoUrl: string | null;
  fullName: string;
  position: string | null;
  site: string | null;
  category: string | null;
  contractType: string | null;
  workedDays: number;
  reportedHours: number;
  baseSalary: number;
  overtimeAmount: number;
  bonuses: number;
  benefits: number;
  gross: number;
  taxableGross: number;
  cnpsBase: number;
  cnpsEmployee: number;
  irpp: number;
  cac: number;
  advances: number;
  loans: number;
  otherDeductions: number;
  totalDeductions: number;
  netToPay: number;
  cnpsEmployer: number;
  familyAllowance: number;
  accidentWork: number;
  cfcEmployer: number;
  fneEmployer: number;
  employerCharges: number;
  employerCost: number;
  bankName: string | null;
  bankAccount: string | null;
  status: string;
  anomalies: PayrollStateWarning[];
}

type PayslipForState = Awaited<ReturnType<typeof fetchPayslipsForState>>[number];
type PayslipLineForState = PayslipForState["lines"][number];

function amount(value: bigint | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

function lineAmount(
  lines: PayslipLineForState[],
  code: string,
  field: "amountPlus" | "amountMinus" | "employerAmount" | "base"
): number {
  return lines
    .filter((line) => line.code === code)
    .reduce((sum, line) => sum + amount(line[field]), 0);
}

function lineGroupAmount(
  lines: PayslipLineForState[],
  codes: string[],
  field: "amountPlus" | "amountMinus" | "employerAmount" | "base"
): number {
  return codes.reduce((sum, code) => sum + lineAmount(lines, code, field), 0);
}

function normalizeWarnings(value: Prisma.JsonValue): PayrollStateWarning[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry): PayrollStateWarning | null => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
      const data = entry as Record<string, Prisma.JsonValue>;
      const severity = data.severity === "error" || data.severity === "warning" ? data.severity : "info";
      return {
        severity,
        code: typeof data.code === "string" ? data.code : "PAYROLL_WARNING",
        message: typeof data.message === "string" ? data.message : "Alerte paie",
        count: typeof data.count === "number" ? data.count : undefined,
      };
    })
    .filter((entry): entry is PayrollStateWarning => Boolean(entry));
}

async function fetchPayslipsForState(cycleId: string) {
  return prisma.payslip.findMany({
    where: { payrollCycleId: cycleId },
    include: {
      snapshot: true,
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeId: true,
          matricule: true,
          position: true,
          category: true,
          contractType: true,
          cnpsNumber: true,
          bankName: true,
          rib: true,
          avatarUrl: true,
        },
      },
      lines: { orderBy: { order: "asc" } },
    },
    orderBy: [{ user: { lastName: "asc" } }, { user: { firstName: "asc" } }],
  });
}

export async function buildPayrollStateForCycle(input: {
  cycleId: string;
  tenantId?: string;
}): Promise<PayrollStateData> {
  const cycle = await prisma.payrollCycle.findFirst({
    where: {
      id: input.cycleId,
      ...(input.tenantId ? { tenantId: input.tenantId } : {}),
    },
  });
  if (!cycle) throw new Error("PAYROLL_CYCLE_NOT_FOUND");

  const [tenant, payslips] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: cycle.tenantId },
      select: { id: true, name: true, taxId: true, cnpsId: true, logoUrl: true, primaryColor: true },
    }),
    fetchPayslipsForState(cycle.id),
  ]);
  if (!tenant) throw new Error("TENANT_NOT_FOUND");

  const rows: PayrollStateRow[] = payslips.map((payslip) => {
    const snapshot = payslip.snapshot;
    const user = payslip.user;
    const lines = payslip.lines;
    const bonuses = lineGroupAmount(lines, ["A002", "A003", "A004", "A005", "A006", "A099"], "amountPlus");
    const totalDeductions = lines.reduce((sum, line) => sum + amount(line.amountMinus), 0);
    const cnpsEmployer = lineAmount(lines, "C001", "employerAmount");
    const familyAllowance = lineAmount(lines, "C002", "employerAmount");
    const accidentWork = lineAmount(lines, "C003", "employerAmount");
    const cfcEmployer = lineAmount(lines, "C004", "employerAmount");
    const fneEmployer = lineAmount(lines, "C005", "employerAmount");
    const photoUrl = snapshot?.profilePhotoUrl ?? user.avatarUrl ?? null;
    const bankName = snapshot?.bankName ?? user.bankName ?? null;
    const bankAccount = snapshot?.bankAccount ?? user.rib ?? null;
    const anomalies: PayrollStateWarning[] = [];

    if (!photoUrl) anomalies.push({ severity: "warning", code: "PHOTO_MISSING", message: "Photo manquante" });
    if (!(snapshot?.cnpsNumber ?? user.cnpsNumber)) {
      anomalies.push({ severity: "warning", code: "CNPS_MISSING", message: "Numero CNPS manquant" });
    }
    if (!bankName || !bankAccount) {
      anomalies.push({ severity: "warning", code: "BANK_MISSING", message: "Banque ou compte manquant" });
    }
    if (!snapshot?.userId) {
      anomalies.push({ severity: "warning", code: "EMPLOYEE_WITHOUT_USER", message: "Employe sans userId reel" });
    }
    if (amount(payslip.netAmount) < 0) {
      anomalies.push({ severity: "error", code: "NET_NEGATIVE", message: "Net a payer negatif" });
    }

    return {
      payslipId: payslip.id,
      verificationUrl: payslip.verifiedPublicUrl,
      matricule: snapshot?.matricule ?? user.matricule ?? user.employeeId ?? user.id.slice(0, 8),
      photoUrl,
      fullName: snapshot?.fullName ?? `${user.firstName} ${user.lastName}`,
      position: snapshot?.position ?? user.position,
      site: snapshot?.site ?? null,
      category: snapshot?.category ?? user.category,
      contractType: snapshot?.contractType ?? user.contractType,
      workedDays: payslip.workedDays,
      reportedHours: payslip.reportedHours,
      baseSalary: amount(payslip.baseSalary),
      overtimeAmount: amount(payslip.overtimeAmount),
      bonuses,
      benefits: 0,
      gross: amount(payslip.grossAmount),
      taxableGross: amount(payslip.taxableGross),
      cnpsBase: lineAmount(lines, "B001", "base"),
      cnpsEmployee: lineAmount(lines, "B001", "amountMinus"),
      irpp: lineAmount(lines, "B003", "amountMinus"),
      cac: lineAmount(lines, "B004", "amountMinus"),
      advances: lineAmount(lines, "B005", "amountMinus"),
      loans: lineAmount(lines, "B006", "amountMinus"),
      otherDeductions: lineGroupAmount(lines, ["B002", "B007", "B099"], "amountMinus"),
      totalDeductions,
      netToPay: amount(payslip.netAmount),
      cnpsEmployer,
      familyAllowance,
      accidentWork,
      cfcEmployer,
      fneEmployer,
      employerCharges: amount(payslip.employerCharges),
      employerCost: amount(payslip.grossAmount) + amount(payslip.employerCharges),
      bankName,
      bankAccount,
      status: payslip.status,
      anomalies,
    };
  });

  const sum = (selector: (row: PayrollStateRow) => number): number =>
    rows.reduce((total, row) => total + selector(row), 0);
  const byCategory = new Map<string, PayrollStateCategory>();

  for (const row of rows) {
    const category = row.category ?? "Non classe";
    const current =
      byCategory.get(category) ??
      ({
        category,
        headcount: 0,
        taxableGross: 0,
        salaryDeductions: 0,
        employerCharges: 0,
        netToPay: 0,
        employerCost: 0,
      } satisfies PayrollStateCategory);

    current.headcount += 1;
    current.taxableGross += row.taxableGross;
    current.salaryDeductions += row.totalDeductions;
    current.employerCharges += row.employerCharges;
    current.netToPay += row.netToPay;
    current.employerCost += row.employerCost;
    byCategory.set(category, current);
  }

  const cnpsEmployee = sum((row) => row.cnpsEmployee);
  const cnpsEmployer = sum((row) => row.cnpsEmployer);
  const cac = sum((row) => row.cac);
  const irpp = sum((row) => row.irpp);
  const employerCharges = sum((row) => row.employerCharges);
  const gross = sum((row) => row.gross);
  const totalDeductions = sum((row) => row.totalDeductions);
  const netToPay = sum((row) => row.netToPay);

  return {
    cycle: {
      id: cycle.id,
      period: cycle.period,
      status: cycle.status,
      calculatedAt: cycle.calculatedAt?.toISOString() ?? null,
      n1ValidatedAt: cycle.n1ValidatedAt?.toISOString() ?? null,
      n2ValidatedAt: cycle.n2ValidatedAt?.toISOString() ?? null,
      n3ValidatedAt: cycle.n3ValidatedAt?.toISOString() ?? null,
    },
    tenant,
    kpis: {
      grossPayroll: gross,
      totalDeductions,
      employerCharges,
      netToPay,
      paidHeadcount: rows.length,
    },
    recap: {
      grossSalaries: gross,
      primesAndAllowances: sum((row) => row.bonuses),
      benefitsInKind: sum((row) => row.benefits),
      taxableGross: sum((row) => row.taxableGross),
      salaryDeductions: totalDeductions,
      cnpsEmployee,
      irpp,
      cac,
      advances: sum((row) => row.advances),
      otherDeductions: sum((row) => row.otherDeductions + row.loans),
      netToPay,
      employerCharges,
      employerCost: gross + employerCharges,
    },
    retentionDetails: {
      socialOrganizations: [
        { label: "CNPS salarie", amount: cnpsEmployee },
        { label: "CAC social si applicable", amount: 0 },
      ],
      taxes: [
        { label: "IRPP", amount: irpp },
        { label: "CAC", amount: cac },
        { label: "Taxe communale", amount: 0 },
      ],
      other: [
        { label: "Avances sur salaire", amount: sum((row) => row.advances) },
        { label: "Prets sociaux", amount: sum((row) => row.loans) },
        { label: "Absences / retards / retenues diverses", amount: sum((row) => row.otherDeductions) },
      ],
    },
    employerChargeDetails: {
      socialOrganizations: [
        { label: "CNPS employeur", amount: cnpsEmployer },
        { label: "Allocations familiales", amount: sum((row) => row.familyAllowance) },
        { label: "FNE", amount: sum((row) => row.fneEmployer) },
        { label: "CFC employeur", amount: sum((row) => row.cfcEmployer) },
      ],
      other: [
        { label: "Accident travail", amount: sum((row) => row.accidentWork) },
        { label: "Medecine du travail", amount: 0 },
        { label: "Formation professionnelle", amount: 0 },
        { label: "Autres charges patronales", amount: 0 },
      ],
    },
    categories: Array.from(byCategory.values()).sort((a, b) => a.category.localeCompare(b.category)),
    fiscalSummary: {
      irppTaxableBase: sum((row) => row.taxableGross),
      irppWithheld: irpp,
      cnpsEmployeeDeclared: cnpsEmployee,
      cnpsEmployerDeclared: cnpsEmployer,
      cacDeclared: cac,
      socialOrganizationsTotal: cnpsEmployee + cnpsEmployer + sum((row) => row.familyAllowance),
    },
    rows,
    warnings: [
      ...normalizeWarnings(cycle.warnings),
      ...rows.flatMap((row) => row.anomalies),
    ],
  };
}
