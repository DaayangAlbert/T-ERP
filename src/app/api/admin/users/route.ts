import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role, UserStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const ADMIN_VIEW_ROLES: Role[] = [Role.SUPER_ADMIN, Role.DG, Role.DAF, Role.HR, Role.TENANT_ADMIN];
const PAGE_SIZE = 30;

export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ADMIN_VIEW_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
  const search = url.searchParams.get("q")?.trim();
  const role = url.searchParams.get("role") as Role | null;
  const status = url.searchParams.get("status") as UserStatus | null;
  const siteId = url.searchParams.get("siteId");

  const where: Record<string, unknown> = { tenantId: session.tenantId };
  if (role) where.role = role;
  if (status) where.status = status;
  if (siteId) where.assignedSiteIds = { has: siteId };
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { employeeId: { contains: search, mode: "insensitive" } },
    ];
  }

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: [{ status: "asc" }, { lastName: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        employeeId: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        status: true,
        position: true,
        assignedSiteIds: true,
        twoFactorEnabled: true,
        lastLoginAt: true,
      },
    }),
  ]);

  // Annoter les noms des sites assignés
  const allSiteIds = Array.from(new Set(users.flatMap((u) => u.assignedSiteIds)));
  const sites = allSiteIds.length
    ? await prisma.site.findMany({
        where: { id: { in: allSiteIds } },
        select: { id: true, code: true, name: true },
      })
    : [];
  const sitesById = new Map(sites.map((s) => [s.id, s]));

  return NextResponse.json({
    items: users.map((u) => ({
      ...u,
      lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
      assignedSites: u.assignedSiteIds.map((id) => sitesById.get(id)).filter(Boolean),
    })),
    page,
    pageSize: PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  });
}
