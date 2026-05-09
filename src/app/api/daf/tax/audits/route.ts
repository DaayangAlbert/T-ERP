import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.DAF, Role.DG, Role.TENANT_ADMIN];

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DAF / DG" }, { status: 403 });
  }

  const items = await prisma.taxAudit.findMany({
    where: { tenantId: session.tenantId },
    orderBy: [{ status: "asc" }, { startDate: "desc" }],
    take: 20,
  });

  return NextResponse.json({
    items: items.map((a) => ({
      id: a.id,
      type: a.type,
      authority: a.authority,
      period: a.period,
      auditor: a.auditor,
      status: a.status,
      startDate: a.startDate.toISOString(),
      endDate: a.endDate?.toISOString() ?? null,
      opinion: a.opinion,
      adjustmentsAmount: a.adjustmentsAmount?.toString() ?? null,
    })),
  });
}
