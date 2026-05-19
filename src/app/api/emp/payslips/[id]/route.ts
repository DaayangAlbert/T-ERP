import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardEmp } from "@/lib/rbac/emp-guard";
import { createPayslipVerification } from "@/lib/payroll/payroll-verification";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: { id: string } }) {
  const guard = guardEmp();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const payslip = await prisma.payslip.findFirst({
    where: { id: ctx.params.id, userId: session.sub },
    select: {
      id: true,
      tenantId: true,
      userId: true,
      period: true,
      periodLabel: true,
      periodEnd: true,
      paymentDate: true,
      paymentMethod: true,
      paymentMode: true,
      paymentBankAccount: true,
      paymentReference: true,
      baseSalary: true,
      overtimeAmount: true,
      overtimeHours: true,
      overtimeHours125: true,
      overtimeHours150: true,
      overtimeHours200: true,
      seniorityBonus: true,
      transportAllowance: true,
      otherBonuses: true,
      grossAmount: true,
      cnpsAmount: true,
      irppAmount: true,
      otherDeductions: true,
      netAmount: true,
      workedDays: true,
      reportedHours: true,
      status: true,
      validatedN1At: true,
      validatedN2At: true,
      paidAt: true,
      verificationUuid: true,
      verificationCode: true,
      verificationHash: true,
      verifiedPublicUrl: true,
      user: {
        select: {
          firstName: true,
          lastName: true,
          matricule: true,
          employeeId: true,
          position: true,
          professionalCategory: true,
          cnpsNumber: true,
          niu: true,
          hireDate: true,
          bankName: true,
          bankAgency: true,
          rib: true,
        },
      },
    },
  });

  if (!payslip) {
    return NextResponse.json({ error: "Bulletin introuvable ou hors perimetre" }, { status: 403 });
  }

  const hasVerification = Boolean(
    payslip.verificationUuid && payslip.verificationCode && payslip.verificationHash && payslip.verifiedPublicUrl
  );
  const verification = hasVerification
    ? { verifiedPublicUrl: payslip.verifiedPublicUrl! }
    : createPayslipVerification({
        tenantId: payslip.tenantId,
        userId: payslip.userId,
        periodIso: payslip.period.toISOString(),
      });

  if (!hasVerification) {
    await prisma.payslip.update({
      where: { id: payslip.id },
      data: {
        verificationUuid: "verificationUuid" in verification ? verification.verificationUuid : undefined,
        verificationCode: "verificationCode" in verification ? verification.verificationCode : undefined,
        verificationHash: "verificationHash" in verification ? verification.verificationHash : undefined,
        verifiedPublicUrl: verification.verifiedPublicUrl,
      },
    });
  }

  return NextResponse.json({
    payslip: {
      id: payslip.id,
      period: payslip.period,
      periodLabel: payslip.periodLabel,
      periodEnd: payslip.periodEnd,
      paymentDate: payslip.paymentDate,
      paymentMethod: payslip.paymentMethod,
      paymentMode: payslip.paymentMode,
      paymentBankAccount: payslip.paymentBankAccount,
      paymentReference: payslip.paymentReference,
      baseSalary: payslip.baseSalary ? Number(payslip.baseSalary) : null,
      overtimeAmount: Number(payslip.overtimeAmount),
      overtimeHours: payslip.overtimeHours,
      overtimeHours125: payslip.overtimeHours125,
      overtimeHours150: payslip.overtimeHours150,
      overtimeHours200: payslip.overtimeHours200,
      seniorityBonus: Number(payslip.seniorityBonus),
      transportAllowance: Number(payslip.transportAllowance),
      otherBonuses: payslip.otherBonuses,
      grossAmount: Number(payslip.grossAmount),
      cnpsAmount: Number(payslip.cnpsAmount),
      irppAmount: Number(payslip.irppAmount),
      otherDeductions: Number(payslip.otherDeductions),
      netAmount: Number(payslip.netAmount),
      workedDays: payslip.workedDays,
      reportedHours: payslip.reportedHours,
      status: payslip.status,
      validatedN1At: payslip.validatedN1At,
      validatedN2At: payslip.validatedN2At,
      paidAt: payslip.paidAt,
      verifiedPublicUrl: verification.verifiedPublicUrl,
      user: payslip.user,
    },
  });
}
