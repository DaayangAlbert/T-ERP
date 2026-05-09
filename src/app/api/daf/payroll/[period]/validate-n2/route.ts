import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.DAF];

export async function POST(_req: Request, { params }: { params: { period: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Validation N2 réservée DAF" }, { status: 403 });
  }

  const cycle = await prisma.payrollCycle.findFirst({
    where: { tenantId: session.tenantId, period: params.period },
  });
  if (!cycle) return NextResponse.json({ error: "Cycle introuvable" }, { status: 404 });
  if (cycle.status !== "N2_PENDING" && cycle.status !== "N1_PENDING") {
    return NextResponse.json({ error: "Le cycle n'est pas dans un statut validable N2" }, { status: 422 });
  }

  await prisma.payrollCycle.update({
    where: { id: cycle.id },
    data: { status: "N3_PENDING", n2ValidatedAt: new Date() },
  });

  // Notification au DG
  const dg = await prisma.user.findFirst({
    where: { tenantId: session.tenantId, role: Role.DG },
    select: { id: true },
  });
  if (dg) {
    await prisma.notification.create({
      data: {
        userId: dg.id,
        type: "payroll_n2_validated",
        title: `Paie ${cycle.period} validée N2 par DAF`,
        body: "À valider en N3 pour finalisation.",
        link: "/daf/paie",
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userId: session.sub,
      action: "payroll.validate_n2",
      entityType: "PayrollCycle",
      entityId: cycle.id,
      metadata: { period: cycle.period },
    },
  });

  return NextResponse.json({ ok: true });
}
