import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.LOGISTICS, Role.DG, Role.DAF, Role.TENANT_ADMIN];

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé Logisticien" }, { status: 403 });
  }

  const yearStart = new Date(new Date().getFullYear(), 0, 1);

  const [pending, history, ytd] = await Promise.all([
    prisma.interSiteTransfer.findMany({
      where: { tenantId: session.tenantId, status: "PENDING" },
      include: {
        fromSite: { select: { code: true, name: true } },
        toSite: { select: { code: true, name: true } },
        items: true,
      },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    }),
    prisma.interSiteTransfer.findMany({
      where: { tenantId: session.tenantId, status: { in: ["COMPLETED", "APPROVED", "SCHEDULED", "IN_TRANSIT", "REJECTED"] } },
      include: {
        fromSite: { select: { code: true, name: true } },
        toSite: { select: { code: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.interSiteTransfer.findMany({
      where: { tenantId: session.tenantId, status: "COMPLETED", completedAt: { gte: yearStart } },
      select: { estimatedSavings: true },
    }),
  ]);

  const ytdSavings = ytd.reduce((s, t) => s + Number(t.estimatedSavings), 0);

  return NextResponse.json({
    kpis: {
      pendingCount: pending.length,
      validatedYtdCount: ytd.length,
      ytdSavings,
    },
    pending: pending.map((t) => ({
      id: t.id,
      reference: t.reference,
      category: t.category,
      priority: t.priority,
      status: t.status,
      estimatedSavings: Number(t.estimatedSavings),
      context: t.context,
      fromSite: t.fromSite.name,
      fromSiteCode: t.fromSite.code,
      toSite: t.toSite.name,
      toSiteCode: t.toSite.code,
      items: t.items.map((i) => ({ designation: i.designation, quantity: i.quantity, unit: i.unit })),
      createdAt: t.createdAt.toISOString(),
    })),
    history: history.map((t) => ({
      id: t.id,
      reference: t.reference,
      category: t.category,
      status: t.status,
      estimatedSavings: Number(t.estimatedSavings),
      fromSite: t.fromSite.name,
      toSite: t.toSite.name,
      completedAt: t.completedAt?.toISOString() ?? null,
      arbitratedAt: t.arbitratedAt?.toISOString() ?? null,
    })),
  });
}
