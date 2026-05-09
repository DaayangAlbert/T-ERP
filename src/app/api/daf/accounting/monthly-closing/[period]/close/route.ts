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
    return NextResponse.json({ error: "Clôture réservée DAF" }, { status: 403 });
  }

  const checklist = await prisma.monthlyClosingChecklist.findFirst({
    where: { tenantId: session.tenantId, period: params.period },
  });
  if (!checklist) return NextResponse.json({ error: "Checklist introuvable" }, { status: 404 });

  const items = (checklist.items as Array<{ status: string }>) ?? [];
  const allDone = items.every((i) => i.status === "DONE");
  if (!allDone) {
    return NextResponse.json({ error: "Toutes les opérations ne sont pas validées" }, { status: 422 });
  }

  await prisma.monthlyClosingChecklist.update({
    where: { id: checklist.id },
    data: { status: "CLOSED" },
  });

  await prisma.accountingPeriod.updateMany({
    where: { tenantId: session.tenantId, period: params.period, status: "OPEN" },
    data: { status: "CLOSED", closedAt: new Date(), closedBy: session.sub },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userId: session.sub,
      action: "accounting.monthly_close",
      entityType: "MonthlyClosingChecklist",
      entityId: checklist.id,
      metadata: { period: params.period },
    },
  });

  return NextResponse.json({ ok: true });
}
