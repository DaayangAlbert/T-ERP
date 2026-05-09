import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getTenantScopeIds } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const scopeIds = await getTenantScopeIds(session.tenantId);
  const site = await prisma.site.findFirst({
    where: { id: params.id, tenantId: { in: scopeIds } },
    select: { id: true },
  });
  if (!site) return NextResponse.json({ error: "Chantier introuvable" }, { status: 404 });

  const alerts = await prisma.siteAlert.findMany({
    where: { siteId: site.id },
    orderBy: [{ resolved: "asc" }, { severity: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({
    items: alerts.map((a) => ({
      id: a.id,
      severity: a.severity,
      type: a.type,
      message: a.message,
      resolved: a.resolved,
      resolvedAt: a.resolvedAt?.toISOString() ?? null,
      createdAt: a.createdAt.toISOString(),
    })),
  });
}
