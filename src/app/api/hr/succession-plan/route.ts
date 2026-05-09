import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const items = await prisma.successionPlan.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { positionTitle: "asc" },
    include: {
      incumbent: { select: { id: true, firstName: true, lastName: true, position: true, hireDate: true } },
      successor: { select: { id: true, firstName: true, lastName: true, position: true } },
    },
  });

  return NextResponse.json({
    items: items.map((p) => ({
      id: p.id,
      positionTitle: p.positionTitle,
      status: p.status,
      readyInMonths: p.readyInMonths,
      notes: p.notes,
      incumbent: {
        id: p.incumbent.id,
        name: `${p.incumbent.firstName} ${p.incumbent.lastName}`,
        position: p.incumbent.position,
        seniority: p.incumbent.hireDate
          ? Math.max(0, Math.floor((Date.now() - p.incumbent.hireDate.getTime()) / (365.25 * 86_400_000)))
          : 0,
      },
      successor: p.successor
        ? { id: p.successor.id, name: `${p.successor.firstName} ${p.successor.lastName}`, position: p.successor.position }
        : null,
    })),
  });
}
