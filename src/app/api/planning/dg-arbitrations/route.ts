import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const items = await prisma.resourceConflict.findMany({
    where: { tenantId: session.tenantId, arbitration: true },
    orderBy: [{ arbitrationStatus: "asc" }, { periodStart: "asc" }],
  });

  return NextResponse.json({
    items: items.map((c) => ({
      id: c.id,
      resourceLabel: c.resourceLabel,
      resourceType: c.resourceType,
      periodStart: c.periodStart.toISOString(),
      periodEnd: c.periodEnd.toISOString(),
      demandLevel: c.demandLevel,
      siteIds: c.siteIds,
      arbitrationStatus: c.arbitrationStatus,
      arbitrationNote: c.arbitrationNote,
      resolved: c.resolved,
    })),
  });
}
