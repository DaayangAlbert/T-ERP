import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getAccessibleSiteIds } from "@/lib/rbac/site-filter";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const DTRAV_ROLES: Role[] = [Role.WORKS_DIRECTOR, Role.DG, Role.DAF, Role.TECH_DIRECTOR, Role.SUPER_ADMIN];

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!DTRAV_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const allowed = await getAccessibleSiteIds(session.sub);

  const sites = await prisma.site.findMany({
    where: allowed === null ? { tenantId: session.tenantId } : { id: { in: allowed } },
    select: {
      id: true,
      code: true,
      name: true,
      client: true,
      type: true,
      region: true,
      progress: true,
      margin: true,
      status: true,
      budget: true,
      plannedEndDate: true,
    },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({
    items: sites.map((s) => ({
      ...s,
      budget: Number(s.budget),
      plannedEndDate: s.plannedEndDate.toISOString(),
    })),
    scope: { isDirection: allowed === null, totalAssigned: sites.length },
  });
}
