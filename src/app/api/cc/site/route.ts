import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getAccessibleSiteIds } from "@/lib/rbac/site-filter";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const CC_ROLES: Role[] = [Role.SITE_MANAGER, Role.WORKS_DIRECTOR, Role.TECH_DIRECTOR, Role.DG, Role.SUPER_ADMIN];

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!CC_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const allowed = await getAccessibleSiteIds(session.sub);
  // Le Chef chantier a 1 chantier ; les rôles supérieurs voient le premier de la liste pour démo
  const where = allowed === null
    ? { tenantId: session.tenantId }
    : { id: { in: allowed } };

  const site = await prisma.site.findFirst({
    where,
    select: {
      id: true,
      code: true,
      name: true,
      client: true,
      region: true,
      progress: true,
      status: true,
    },
  });

  return NextResponse.json({ site });
}
