import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardOuv } from "@/lib/rbac/ouv-guard";

export const dynamic = "force-dynamic";

// GET /api/ouv/payslips/current — Bulletin courant (le plus récent émis).
// Renvoie la composition détaillée 6 lignes attendue par CurrentPayslipCard +
// PayslipBreakdown : Base / Sup / Prime / CNPS / IRPP / Net.
export async function GET() {
  const guard = guardOuv();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const p = await prisma.payslip.findFirst({
    where: { userId: session.sub },
    orderBy: { period: "desc" },
    select: {
      id: true,
      period: true,
      periodLabel: true,
      paymentDate: true,
      paymentReference: true,
      paymentBankAccount: true,
      paymentMode: true,
      status: true,
      baseSalary: true,
      overtimeAmount: true,
      overtimeHours: true,
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
    },
  });

  if (!p) {
    return NextResponse.json({ payslip: null });
  }

  return NextResponse.json({
    payslip: {
      id: p.id,
      period: p.period.toISOString(),
      periodLabel: p.periodLabel,
      paymentDate: p.paymentDate.toISOString(),
      paymentReference: p.paymentReference,
      paymentBankAccount: p.paymentBankAccount,
      paymentMode: p.paymentMode,
      status: p.status,
      baseSalary: p.baseSalary ? Number(p.baseSalary) : 0,
      overtimeAmount: Number(p.overtimeAmount),
      overtimeHours: p.overtimeHours,
      seniorityBonus: Number(p.seniorityBonus),
      transportAllowance: Number(p.transportAllowance),
      otherBonuses: p.otherBonuses,
      grossAmount: Number(p.grossAmount),
      cnpsAmount: Number(p.cnpsAmount),
      irppAmount: Number(p.irppAmount),
      otherDeductions: Number(p.otherDeductions),
      netAmount: Number(p.netAmount),
      workedDays: p.workedDays,
      reportedHours: p.reportedHours,
    },
  });
}
