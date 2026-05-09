import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const url = new URL(req.url);
  const days = Math.max(1, Math.min(365, parseInt(url.searchParams.get("days") ?? "30", 10)));
  const since = new Date(Date.now() - days * 86_400_000);

  const items = await prisma.auditLog.findMany({
    where: { userId: session.sub, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  // Agréger par jour pour stats rapides
  const byDay: Record<string, number> = {};
  for (const a of items) {
    const k = a.createdAt.toISOString().slice(0, 10);
    byDay[k] = (byDay[k] ?? 0) + 1;
  }

  // Agréger par module
  const byModule: Record<string, number> = {};
  for (const a of items) {
    const mod = a.action.split(".")[0];
    byModule[mod] = (byModule[mod] ?? 0) + 1;
  }

  return NextResponse.json({
    items: items.map((a) => ({
      id: a.id,
      action: a.action,
      entityType: a.entityType,
      entityId: a.entityId,
      ipAddress: a.ipAddress,
      createdAt: a.createdAt.toISOString(),
    })),
    summary: {
      total: items.length,
      days,
      byDay,
      byModule,
    },
  });
}
