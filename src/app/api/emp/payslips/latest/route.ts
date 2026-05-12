import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardEmp } from "@/lib/rbac/emp-guard";

export const dynamic = "force-dynamic";

/**
 * Dernier bulletin de paie disponible pour l'utilisateur connecté.
 * Renvoie un objet sérialisable (BigInt → Number) avec toutes les composantes
 * détaillées, exploitable directement par la CTA "Nouveau bulletin" du
 * dashboard ainsi que par la fonction 1.2 (historique paie).
 */
export async function GET() {
  const guard = guardEmp();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const payslip = await prisma.payslip.findFirst({
    where: { userId: session.sub },
    orderBy: { period: "desc" },
    select: {
      id: true,
      period: true,
      periodLabel: true,
      periodEnd: true,
      paymentDate: true,
      paymentMethod: true,
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
      grossAmount: true,
      cnpsAmount: true,
      irppAmount: true,
      otherDeductions: true,
      netAmount: true,
      workedDays: true,
      reportedHours: true,
      status: true,
    },
  });

  if (!payslip) return NextResponse.json({ payslip: null });

  return NextResponse.json({
    payslip: {
      ...payslip,
      baseSalary: payslip.baseSalary ? Number(payslip.baseSalary) : null,
      overtimeAmount: Number(payslip.overtimeAmount),
      seniorityBonus: Number(payslip.seniorityBonus),
      transportAllowance: Number(payslip.transportAllowance),
      grossAmount: Number(payslip.grossAmount),
      cnpsAmount: Number(payslip.cnpsAmount),
      irppAmount: Number(payslip.irppAmount),
      otherDeductions: Number(payslip.otherDeductions),
      netAmount: Number(payslip.netAmount),
    },
  });
}
