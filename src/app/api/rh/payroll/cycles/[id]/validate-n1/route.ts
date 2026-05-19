import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { canValidatePayrollN1 } from "@/lib/payroll/payroll-access";
import { writePayrollAudit } from "@/lib/payroll/payroll-audit";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  if (!canValidatePayrollN1(session.role)) {
    return NextResponse.json({ error: "Validation N1 reservee RH" }, { status: 403 });
  }

  const cycle = await prisma.payrollCycle.findFirst({
    where: { id: params.id, tenantId: session.tenantId },
    select: { id: true, period: true, status: true },
  });
  if (!cycle) return NextResponse.json({ error: "Cycle introuvable" }, { status: 404 });
  if (cycle.status !== "CALCULATED") {
    return NextResponse.json({ error: "Le cycle doit etre calcule avant validation RH" }, { status: 422 });
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.payrollCycle.update({
      where: { id: cycle.id },
      data: { status: "N2_PENDING", n1ValidatedAt: now },
    }),
    prisma.payslip.updateMany({
      where: { payrollCycleId: cycle.id, tenantId: session.tenantId },
      data: { status: "VALIDATED_N1", validatedN1At: now },
    }),
  ]);

  await writePayrollAudit({
    tenantId: session.tenantId,
    userId: session.sub,
    action: "payroll.validate_n1",
    entityType: "PayrollCycle",
    entityId: cycle.id,
    metadata: { period: cycle.period, nextStatus: "N2_PENDING" },
  });

  return NextResponse.json({ ok: true, status: "N2_PENDING" });
}
