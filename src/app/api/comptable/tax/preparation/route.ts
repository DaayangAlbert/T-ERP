import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const DIRECTION_ROLES: Role[] = [Role.ACCOUNTANT, Role.DAF, Role.DG, Role.SUPER_ADMIN];

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!DIRECTION_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  // Comptable Chantier interdit
  if (session.role === Role.ACCOUNTANT) {
    const u = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { assignedSiteIds: true },
    });
    if (u && u.assignedSiteIds.length > 0) {
      return NextResponse.json({ error: "Réservé au Comptable Direction" }, { status: 403 });
    }
  }

  const today = new Date();
  const in30 = new Date(today.getTime() + 30 * 86_400_000);

  const deadlines = await prisma.taxDeadline.findMany({
    where: { tenantId: session.tenantId, dueDate: { gte: today, lte: in30 } },
    orderBy: { dueDate: "asc" },
  });

  return NextResponse.json({
    items: deadlines.map((d) => ({
      id: d.id,
      type: d.type,
      authority: d.authority,
      period: d.period,
      dueDate: d.dueDate.toISOString(),
      amount: d.amount ? Number(d.amount) : null,
      declarationStatus: d.declarationStatus,
      paymentStatus: d.paymentStatus,
    })),
  });
}
