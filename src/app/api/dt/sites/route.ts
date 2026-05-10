import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getTenantScopeIds } from "@/lib/tenant";
import { Role, SiteStatus, SiteType } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.TECH_DIRECTOR, Role.DG, Role.TENANT_ADMIN];

export async function GET(req: NextRequest) {
  const session = getCurrentSession();
  if (!session?.tenantId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé Direction Technique" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim();
  const status = searchParams.get("status");
  const type = searchParams.get("type");
  const region = searchParams.get("region");
  const directorOfWorks = searchParams.get("directorOfWorks");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "10")));

  const scopeIds = await getTenantScopeIds(session.tenantId);

  const where: Parameters<typeof prisma.site.findMany>[0] extends { where?: infer W } ? W : never = {
    tenantId: { in: scopeIds },
  };
  if (status && Object.values(SiteStatus).includes(status as SiteStatus)) {
    (where as Record<string, unknown>).status = status;
  }
  if (type && Object.values(SiteType).includes(type as SiteType)) {
    (where as Record<string, unknown>).type = type;
  }
  if (region) (where as Record<string, unknown>).region = region;
  if (directorOfWorks) (where as Record<string, unknown>).managerId = directorOfWorks;
  if (search) {
    (where as Record<string, unknown>).OR = [
      { code: { contains: search, mode: "insensitive" } },
      { name: { contains: search, mode: "insensitive" } },
      { client: { contains: search, mode: "insensitive" } },
      { moaName: { contains: search, mode: "insensitive" } },
    ];
  }

  const [total, sites, allManagers, regions] = await Promise.all([
    prisma.site.count({ where }),
    prisma.site.findMany({
      where,
      include: {
        manager: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { code: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.findMany({
      where: { role: Role.WORKS_DIRECTOR, status: "ACTIVE" },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { lastName: "asc" },
    }),
    prisma.site.findMany({
      where: { tenantId: { in: scopeIds } },
      distinct: ["region"],
      select: { region: true },
    }),
  ]);

  // KPIs portefeuille (total)
  const allSitesForKpi = await prisma.site.findMany({
    where: { tenantId: { in: scopeIds }, status: { not: SiteStatus.ARCHIVED } },
    select: { budget: true, financialProgress: true, margin: true },
  });
  const totalBudget = allSitesForKpi.reduce((s, x) => s + Number(x.budget), 0);
  const totalProduction = allSitesForKpi.reduce(
    (s, x) => s + (Number(x.budget) * x.financialProgress) / 100,
    0
  );
  const totalRemaining = totalBudget - totalProduction;
  const avgMargin = totalBudget
    ? allSitesForKpi.reduce((s, x) => s + x.margin * Number(x.budget), 0) / totalBudget
    : 0;

  return NextResponse.json({
    items: sites.map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      client: s.client,
      moaName: s.moaName,
      moaTypeKind: s.moaTypeKind,
      contractTypeKind: s.contractTypeKind,
      type: s.type,
      region: s.region,
      budget: Number(s.budget),
      progress: s.physicalProgress,
      financialProgress: s.financialProgress,
      margin: s.margin,
      marginTarget: s.marginTarget,
      deviationPercent: s.deviationPercent,
      status: s.status,
      managerId: s.managerId,
      managerName: s.manager
        ? `${s.manager.firstName.charAt(0)}. ${s.manager.lastName}`
        : null,
      plannedEndDate: s.plannedEndDate.toISOString(),
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    facets: {
      managers: allManagers.map((m) => ({
        id: m.id,
        name: `${m.firstName} ${m.lastName}`,
      })),
      regions: regions
        .map((r) => r.region)
        .filter((r): r is string => Boolean(r))
        .sort(),
    },
    kpis: {
      portfolioValue: Math.round(totalBudget),
      production: Math.round(totalProduction),
      remaining: Math.round(totalRemaining),
      avgMargin: Number(avgMargin.toFixed(1)),
      activeCount: allSitesForKpi.length,
    },
  });
}
