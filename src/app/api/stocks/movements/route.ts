import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { MovementType } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const url = new URL(req.url);
  const type = url.searchParams.get("type") as MovementType | null;
  const anomalous = url.searchParams.get("anomalous") === "true";

  const where: Record<string, unknown> = { tenantId: session.tenantId };
  if (type) where.type = type;
  if (anomalous) where.anomalous = true;

  const items = await prisma.stockMovement.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  // Récup les noms d'initiateurs pour affichage
  const userIds = Array.from(new Set(items.map((m) => m.initiatorId)));
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, firstName: true, lastName: true },
  });
  const byId = new Map(users.map((u) => [u.id, `${u.firstName} ${u.lastName}`]));

  return NextResponse.json({
    items: items.map((m) => ({
      id: m.id,
      type: m.type,
      itemCode: m.itemCode,
      itemLabel: m.itemLabel,
      quantity: m.quantity,
      unitValue: m.unitValue.toString(),
      totalValue: m.totalValue.toString(),
      fromSiteId: m.fromSiteId,
      toSiteId: m.toSiteId,
      reason: m.reason,
      initiator: byId.get(m.initiatorId) ?? "—",
      anomalous: m.anomalous,
      anomalyReason: m.anomalyReason,
      createdAt: m.createdAt.toISOString(),
    })),
    summary: {
      total: items.length,
      anomalousCount: items.filter((m) => m.anomalous).length,
    },
  });
}
