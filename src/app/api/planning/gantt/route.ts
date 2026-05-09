import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getTenantScopeIds } from "@/lib/tenant";
import { SiteStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const scopeIds = await getTenantScopeIds(session.tenantId);
  const sites = await prisma.site.findMany({
    where: { tenantId: { in: scopeIds }, status: { not: SiteStatus.ARCHIVED } },
    orderBy: { startDate: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      status: true,
      startDate: true,
      plannedEndDate: true,
      progress: true,
    },
  });

  return NextResponse.json({
    items: sites.map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      status: s.status,
      startDate: s.startDate.toISOString(),
      endDate: s.plannedEndDate.toISOString(),
      progress: s.progress,
    })),
  });
}
