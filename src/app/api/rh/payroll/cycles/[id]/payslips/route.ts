import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { canReadPayrollState } from "@/lib/payroll/payroll-access";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  if (!canReadPayrollState(session.role)) {
    return NextResponse.json({ error: "Acces paie refuse" }, { status: 403 });
  }

  const cycle = await prisma.payrollCycle.findFirst({
    where: { id: params.id, tenantId: session.tenantId },
    select: { id: true, period: true },
  });
  if (!cycle) return NextResponse.json({ error: "Cycle introuvable" }, { status: 404 });

  const payslips = await prisma.payslip.findMany({
    where: { payrollCycleId: cycle.id, tenantId: session.tenantId },
    include: {
      snapshot: true,
      user: { select: { firstName: true, lastName: true, employeeId: true, matricule: true } },
    },
    orderBy: [{ user: { lastName: "asc" } }, { user: { firstName: "asc" } }],
  });

  return NextResponse.json({
    cycleId: cycle.id,
    period: cycle.period,
    items: payslips.map((payslip) => ({
      id: payslip.id,
      employee: payslip.snapshot?.fullName ?? `${payslip.user.firstName} ${payslip.user.lastName}`,
      matricule: payslip.snapshot?.matricule ?? payslip.user.matricule ?? payslip.user.employeeId,
      grossAmount: payslip.grossAmount.toString(),
      netAmount: payslip.netAmount.toString(),
      employerCharges: payslip.employerCharges.toString(),
      status: payslip.status,
      verifiedPublicUrl: payslip.verifiedPublicUrl,
      pdfUrl: `/api/rh/payroll/cycles/${cycle.id}/payslips/${payslip.id}/pdf`,
    })),
  });
}
