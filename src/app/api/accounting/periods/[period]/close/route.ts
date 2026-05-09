import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.DG, Role.DAF, Role.ACCOUNTANT];

export async function POST(_req: Request, { params }: { params: { period: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DG / DAF / Comptable" }, { status: 403 });
  }

  const p = await prisma.accountingPeriod.findFirst({
    where: { tenantId: session.tenantId, period: params.period },
  });
  if (!p) return NextResponse.json({ error: "Période introuvable" }, { status: 404 });
  if (p.status === "CLOSED" || p.status === "LOCKED") {
    return NextResponse.json({ error: "Période déjà clôturée" }, { status: 409 });
  }

  // Vérifier équilibre (synthèse)
  if (p.totalDebit !== p.totalCredit) {
    return NextResponse.json({
      error: "Période non équilibrée",
      detail: `Total débit ${p.totalDebit} ≠ total crédit ${p.totalCredit}`,
    }, { status: 422 });
  }

  await prisma.accountingPeriod.update({
    where: { id: p.id },
    data: {
      status: "CLOSED",
      closedAt: new Date(),
      closedBy: session.sub,
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userId: session.sub,
      action: "period.close",
      entityType: "AccountingPeriod",
      entityId: p.id,
      metadata: { period: params.period },
    },
  });

  return NextResponse.json({ ok: true });
}
