import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getTenantScopeIds } from "@/lib/tenant";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.DAF, Role.DG, Role.TENANT_ADMIN];

// GET — liste des comptables du tenant + leur périmètre chantiers, et la liste
// des chantiers affectables. Sert l'écran DAF « Affectation comptables ».
export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DAF / DG" }, { status: 403 });
  }

  const scopeIds = await getTenantScopeIds(session.tenantId);

  const [accountants, sites] = await Promise.all([
    prisma.user.findMany({
      where: { tenantId: { in: scopeIds }, role: Role.ACCOUNTANT, status: "ACTIVE" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        position: true,
        avatarUrl: true,
        assignedSiteIds: true,
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.site.findMany({
      where: { tenantId: { in: scopeIds }, status: { not: "ARCHIVED" } },
      select: { id: true, code: true, name: true, client: true, status: true },
      orderBy: { code: "asc" },
    }),
  ]);

  return NextResponse.json({
    accountants: accountants.map((a) => ({
      id: a.id,
      firstName: a.firstName,
      lastName: a.lastName,
      email: a.email,
      position: a.position,
      avatarUrl: a.avatarUrl,
      assignedSiteIds: a.assignedSiteIds,
      isDirection: a.assignedSiteIds.length === 0,
    })),
    sites,
  });
}
