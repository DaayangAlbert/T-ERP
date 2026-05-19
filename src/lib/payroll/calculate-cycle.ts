import { PayslipPaymentMethod, Prisma, Role, UserStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildPayslipLines, toPrismaPayslipLineCreateMany } from "./build-payslip-lines";
import { calculatePayslip, type PayrollWarning } from "./calculate-payslip";
import { createPayslipVerification } from "./payroll-verification";
import { getPayrollRates, resolveBaseSalary } from "./payroll-rates";
import { writePayrollAudit } from "./payroll-audit";
import { aggregateOvertimeForCycle } from "./overtime-aggregator";

export interface CalculateCycleResult {
  cycleId: string;
  period: string;
  status: "CALCULATED";
  totalBulletins: number;
  grossAmount: string;
  employerCharges: string;
  netToPay: string;
  warnings: Array<PayrollWarning & { count?: number }>;
}

const EXCLUDED_PAYROLL_ROLES: Role[] = [Role.CANDIDATE, Role.SUPER_ADMIN, Role.TENANT_ADMIN];

function periodToDates(period: string): { periodDate: Date; periodEnd: Date; paymentDate: Date } {
  const [yearRaw, monthRaw] = period.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const periodDate = new Date(Date.UTC(year, month - 1, 1));
  const periodEnd = new Date(Date.UTC(year, month, 0));
  return { periodDate, periodEnd, paymentDate: periodEnd };
}

function warningKey(warning: PayrollWarning): string {
  return `${warning.severity}:${warning.code}:${warning.message}`;
}

function aggregateWarnings(
  current: Map<string, PayrollWarning & { count: number }>,
  warnings: PayrollWarning[]
): void {
  for (const warning of warnings) {
    const key = warningKey(warning);
    const existing = current.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      current.set(key, { ...warning, count: 1 });
    }
  }
}

function toBigInt(value: number): bigint {
  return BigInt(Math.round(value));
}

export async function calculatePayrollCycle(input: {
  cycleId: string;
  tenantId: string;
  actorUserId: string;
}): Promise<CalculateCycleResult> {
  const rates = await getPayrollRates(input.tenantId);
  const { cycleId, tenantId, actorUserId } = input;

  const result = await prisma.$transaction(async (tx) => {
    const cycle = await tx.payrollCycle.findFirst({
      where: { id: cycleId, tenantId },
    });

    if (!cycle) throw new Error("PAYROLL_CYCLE_NOT_FOUND");
    if (cycle.status !== "DRAFT" && cycle.status !== "CALCULATED") {
      throw new Error("PAYROLL_CYCLE_LOCKED");
    }
    if (cycle.n1ValidatedAt || cycle.n2ValidatedAt || cycle.n3ValidatedAt) {
      throw new Error("PAYROLL_CYCLE_ALREADY_VALIDATED");
    }

    await tx.payrollCycle.update({
      where: { id: cycle.id },
      data: { status: "CALCULATING" },
    });

    const { periodDate, periodEnd, paymentDate } = periodToDates(cycle.period);

    // Remontée automatique des heures sup depuis les pointages TimeReport :
    // tout PayrollInput sans overtimeHours saisi manuellement par RH est
    // enrichi par l'agrégation des pointages valides du mois.
    const overtimeByUser = await aggregateOvertimeForCycle(tx, tenantId, cycle.period);

    const [users, inputs, sites] = await Promise.all([
      tx.user.findMany({
        where: {
          tenantId,
          status: UserStatus.ACTIVE,
          role: { notIn: EXCLUDED_PAYROLL_ROLES },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeId: true,
          matricule: true,
          position: true,
          category: true,
          professionalCategory: true,
          contractType: true,
          hireDate: true,
          cnpsNumber: true,
          niu: true,
          bankName: true,
          rib: true,
          avatarUrl: true,
          baseSalary: true,
          assignedSiteIds: true,
        },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      }),
      tx.payrollInput.findMany({ where: { payrollCycleId: cycle.id } }),
      tx.site.findMany({
        where: { tenantId },
        select: { id: true, name: true, code: true },
      }),
    ]);

    const siteMap = new Map(sites.map((site) => [site.id, `${site.code} - ${site.name}`]));
    const inputMap = new Map(inputs.map((line) => [line.employeeKey, line]));
    const syntheticInputCount = inputs.filter((line) => line.employeeKey.startsWith("syn_")).length;
    const warningsMap = new Map<string, PayrollWarning & { count: number }>();

    let grossTotal = 0;
    let employerChargesTotal = 0;
    let netTotal = 0;
    let generated = 0;

    for (const user of users) {
      const employeeKey = user.id;
      let payrollInput =
        inputMap.get(user.id) ??
        (user.employeeId ? inputMap.get(user.employeeId) : undefined) ??
        (user.matricule ? inputMap.get(user.matricule) : undefined) ??
        null;

      // Remontée automatique des heures sup depuis les pointages : si pas
      // de saisie manuelle RH (overtimeHours = 0 ou input absent), on agrège
      // les TimeReport validés du mois. La saisie manuelle reste prioritaire.
      const pointedOvertime = overtimeByUser.get(user.id);
      if (pointedOvertime && pointedOvertime.total > 0 && (!payrollInput || payrollInput.overtimeHours === 0)) {
        // Upsert un PayrollInput avec les heures pointées
        payrollInput = await tx.payrollInput.upsert({
          where: {
            payrollCycleId_employeeKey: { payrollCycleId: cycle.id, employeeKey: user.id },
          },
          create: {
            payrollCycleId: cycle.id,
            employeeKey: user.id,
            category: user.category ?? "Heures sup permanents",
            overtimeHours: pointedOvertime.total,
            savedAt: new Date(),
            savedBy: "AUTO_FROM_CLOCK",
          },
          update: {
            overtimeHours: pointedOvertime.total,
            savedAt: new Date(),
            savedBy: "AUTO_FROM_CLOCK",
          },
        });
      }

      const category = user.category ?? user.professionalCategory ?? "ETAM";
      // Salaire de base : priorité au montant contractuel personnel
      // (User.baseSalary, modifiable via fiche RH avec SalaryHistory).
      // À défaut, fallback sur le barème générique de la catégorie.
      const baseSalary = user.baseSalary !== null && user.baseSalary !== undefined
        ? Number(user.baseSalary)
        : resolveBaseSalary(category, rates);
      const site = user.assignedSiteIds[0] ? siteMap.get(user.assignedSiteIds[0]) ?? null : null;
      const fullName = `${user.firstName} ${user.lastName}`.trim();

      const snapshot = await tx.payrollEmployeeSnapshot.upsert({
        where: {
          payrollCycleId_employeeKey: {
            payrollCycleId: cycle.id,
            employeeKey,
          },
        },
        update: {
          userId: user.id,
          matricule: user.matricule ?? user.employeeId ?? user.id.slice(0, 8).toUpperCase(),
          firstName: user.firstName,
          lastName: user.lastName,
          fullName,
          position: user.position,
          category,
          echelon: user.professionalCategory,
          site,
          contractType: user.contractType,
          hireDate: user.hireDate,
          cnpsNumber: user.cnpsNumber,
          taxNumber: user.niu,
          bankName: user.bankName,
          bankAccount: user.rib,
          profilePhotoUrl: user.avatarUrl,
          baseSalary: new Prisma.Decimal(baseSalary),
        },
        create: {
          tenantId,
          payrollCycleId: cycle.id,
          employeeKey,
          userId: user.id,
          matricule: user.matricule ?? user.employeeId ?? user.id.slice(0, 8).toUpperCase(),
          firstName: user.firstName,
          lastName: user.lastName,
          fullName,
          position: user.position,
          category,
          echelon: user.professionalCategory,
          site,
          contractType: user.contractType,
          hireDate: user.hireDate,
          cnpsNumber: user.cnpsNumber,
          taxNumber: user.niu,
          bankName: user.bankName,
          bankAccount: user.rib,
          profilePhotoUrl: user.avatarUrl,
          baseSalary: new Prisma.Decimal(baseSalary),
        },
      });

      const calculated = calculatePayslip(snapshot, payrollInput, rates);
      aggregateWarnings(warningsMap, calculated.warnings);

      const existingPayslip = await tx.payslip.findUnique({
        where: {
          tenantId_userId_period: {
            tenantId,
            userId: user.id,
            period: periodDate,
          },
        },
        select: {
          id: true,
          verificationUuid: true,
          verificationCode: true,
          verificationHash: true,
          verifiedPublicUrl: true,
        },
      });

      const verification =
        existingPayslip?.verificationUuid &&
        existingPayslip.verificationCode &&
        existingPayslip.verificationHash &&
        existingPayslip.verifiedPublicUrl
          ? {
              verificationUuid: existingPayslip.verificationUuid,
              verificationCode: existingPayslip.verificationCode,
              verificationHash: existingPayslip.verificationHash,
              verifiedPublicUrl: existingPayslip.verifiedPublicUrl,
            }
          : createPayslipVerification({
              tenantId,
              userId: user.id,
              periodIso: periodDate.toISOString(),
            });

      const otherBonuses = calculated.bonuses.map((bonus) => ({
        code: bonus.code ?? "A099",
        label: bonus.label,
        amount: bonus.amount,
        taxable: bonus.taxable ?? true,
      })) as Prisma.InputJsonValue;
      const paymentBankAccount =
        user.bankName || user.rib ? [user.bankName, user.rib].filter(Boolean).join(" - ") : null;

      const payslip = await tx.payslip.upsert({
        where: {
          tenantId_userId_period: {
            tenantId,
            userId: user.id,
            period: periodDate,
          },
        },
        update: {
          payrollCycleId: cycle.id,
          snapshotId: snapshot.id,
          periodLabel: cycle.period,
          periodEnd,
          paymentDate,
          paymentMode: "VIREMENT",
          paymentMethod: PayslipPaymentMethod.BANK_TRANSFER,
          grossAmount: toBigInt(calculated.salaryGross),
          taxableGross: toBigInt(calculated.taxableGross),
          netAmount: toBigInt(calculated.netToPay),
          socialCharges: toBigInt(calculated.cnpsEmployee + calculated.cfcEmployee),
          fiscalCharges: toBigInt(calculated.monthlyIrpp + calculated.cac),
          employerCharges: toBigInt(calculated.totalEmployerCharges),
          baseSalary: toBigInt(calculated.baseSalary),
          overtimeAmount: toBigInt(calculated.overtimeAmount),
          overtimeHours: calculated.overtimeHours,
          transportAllowance: toBigInt(calculated.transportAllowance),
          otherBonuses,
          cnpsAmount: toBigInt(calculated.cnpsEmployee),
          irppAmount: toBigInt(calculated.monthlyIrpp),
          otherDeductions: toBigInt(
            calculated.cfcEmployee +
              calculated.cac +
              calculated.advances +
              calculated.loans +
              calculated.absenceDeductions +
              calculated.otherDeductions
          ),
          paymentBankAccount,
          workedDays: calculated.workedDays,
          reportedHours: calculated.reportedHours,
          status: "CALCULATED",
          issuedAt: new Date(),
          ...verification,
        },
        create: {
          tenantId,
          userId: user.id,
          payrollCycleId: cycle.id,
          snapshotId: snapshot.id,
          period: periodDate,
          periodLabel: cycle.period,
          periodEnd,
          paymentDate,
          paymentMode: "VIREMENT",
          paymentMethod: PayslipPaymentMethod.BANK_TRANSFER,
          grossAmount: toBigInt(calculated.salaryGross),
          taxableGross: toBigInt(calculated.taxableGross),
          netAmount: toBigInt(calculated.netToPay),
          socialCharges: toBigInt(calculated.cnpsEmployee + calculated.cfcEmployee),
          fiscalCharges: toBigInt(calculated.monthlyIrpp + calculated.cac),
          employerCharges: toBigInt(calculated.totalEmployerCharges),
          baseSalary: toBigInt(calculated.baseSalary),
          overtimeAmount: toBigInt(calculated.overtimeAmount),
          overtimeHours: calculated.overtimeHours,
          transportAllowance: toBigInt(calculated.transportAllowance),
          otherBonuses,
          cnpsAmount: toBigInt(calculated.cnpsEmployee),
          irppAmount: toBigInt(calculated.monthlyIrpp),
          otherDeductions: toBigInt(
            calculated.cfcEmployee +
              calculated.cac +
              calculated.advances +
              calculated.loans +
              calculated.absenceDeductions +
              calculated.otherDeductions
          ),
          paymentBankAccount,
          paymentReference: `BS-${cycle.period}-${user.employeeId ?? user.id.slice(0, 6)}`,
          workedDays: calculated.workedDays,
          reportedHours: calculated.reportedHours,
          status: "CALCULATED",
          issuedAt: new Date(),
          ...verification,
        },
      });

      const lines = buildPayslipLines(calculated, rates);
      await tx.payslipLine.deleteMany({ where: { payslipId: payslip.id } });
      if (lines.length > 0) {
        await tx.payslipLine.createMany({
          data: toPrismaPayslipLineCreateMany(payslip.id, lines),
        });
      }

      grossTotal += calculated.salaryGross;
      employerChargesTotal += calculated.totalEmployerCharges;
      netTotal += calculated.netToPay;
      generated += 1;
    }

    if (syntheticInputCount > 0) {
      warningsMap.set("info:SYNTHETIC_INPUT_SKIPPED:Saisies demo non converties en bulletins officiels", {
        severity: "info",
        code: "SYNTHETIC_INPUT_SKIPPED",
        message: "Saisies demo non converties en bulletins officiels",
        count: syntheticInputCount,
      });
    }

    const warnings = Array.from(warningsMap.values());
    await tx.payrollCycle.update({
      where: { id: cycle.id },
      data: {
        status: "CALCULATED",
        totalBulletins: generated,
        grossAmount: toBigInt(grossTotal),
        employerCharges: toBigInt(employerChargesTotal),
        netToPay: toBigInt(netTotal),
        calculatedAt: new Date(),
        warnings: warnings as unknown as Prisma.InputJsonValue,
      },
    });

    return {
      cycleId: cycle.id,
      period: cycle.period,
      status: "CALCULATED" as const,
      totalBulletins: generated,
      grossAmount: String(Math.round(grossTotal)),
      employerCharges: String(Math.round(employerChargesTotal)),
      netToPay: String(Math.round(netTotal)),
      warnings,
    };
  });

  await writePayrollAudit({
    tenantId,
    userId: actorUserId,
    action: "payroll.calculate",
    entityType: "PayrollCycle",
    entityId: cycleId,
    metadata: result as unknown as Prisma.InputJsonValue,
  });

  return result;
}
