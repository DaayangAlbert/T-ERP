import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.HR, Role.TENANT_ADMIN];

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Validation N1 RH" }, { status: 403 });
  }

  const lr = await prisma.leaveRequest.findFirst({
    where: { id: params.id, tenantId: session.tenantId },
  });
  if (!lr) return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });

  // Si > 30 jours → passe en N1_APPROVED (en attente DAF), sinon RH_APPROVED direct
  const newStatus = lr.daysCount > 30 ? "N1_APPROVED" : "RH_APPROVED";

  await prisma.leaveRequest.update({
    where: { id: lr.id },
    data: {
      status: newStatus,
      rhValidatedBy: session.sub,
      rhValidatedAt: new Date(),
    },
  });

  // Maj solde si RH_APPROVED final
  if (newStatus === "RH_APPROVED" && lr.type === "PAID_LEAVE") {
    await prisma.leaveBalance.upsert({
      where: { employeeKey: lr.employeeKey },
      update: {
        paidLeaveTaken: { increment: lr.daysCount },
        lastTakenAt: new Date(),
      },
      create: {
        tenantId: session.tenantId,
        employeeKey: lr.employeeKey,
        employeeName: lr.employeeName,
        paidLeaveAcquired: 30,
        paidLeaveTaken: lr.daysCount,
        rttBalance: 0,
        lastTakenAt: new Date(),
      },
    });
  }

  return NextResponse.json({ ok: true, status: newStatus });
}
