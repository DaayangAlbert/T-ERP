import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getTenantScopeIds } from "@/lib/tenant";
import { canManageSites } from "@/lib/permissions";
import { createSiteSchema } from "@/schemas/site";
import { Role, SiteStatus, SiteType } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!session.tenantId) return NextResponse.json({ error: "Tenant requis" }, { status: 403 });

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") ?? "20", 10) || 20));
  const status = url.searchParams.get("status") as SiteStatus | null;
  const type = url.searchParams.get("type") as SiteType | null;
  const region = url.searchParams.get("region")?.trim() || undefined;
  const q = url.searchParams.get("q")?.trim() || undefined;

  // Phase 2 / fn 1.2 — agréger les sites de la mère + filiales si tenant isGroup.
  const scopeIds = await getTenantScopeIds(session.tenantId);

  const where = {
    tenantId: { in: scopeIds },
    ...(status ? { status } : { status: { not: SiteStatus.ARCHIVED } }),
    ...(type ? { type } : {}),
    ...(region ? { region: { contains: region, mode: "insensitive" as const } } : {}),
    ...(q
      ? {
          OR: [
            { code: { contains: q, mode: "insensitive" as const } },
            { name: { contains: q, mode: "insensitive" as const } },
            { client: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, items] = await Promise.all([
    prisma.site.count({ where }),
    prisma.site.findMany({
      where,
      orderBy: [{ status: "asc" }, { plannedEndDate: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
      include: {
        manager: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
  ]);

  // Pre-compute page-level stats so the listing page can render KPIs without a 2nd round-trip.
  const aggregate = await prisma.site.aggregate({
    where: { tenantId: { in: scopeIds }, status: { not: SiteStatus.ARCHIVED } },
    _count: { _all: true },
    _sum: { budget: true },
    _avg: { margin: true },
  });

  const alertsCount = await prisma.site.count({
    where: {
      tenantId: { in: scopeIds },
      status: { in: [SiteStatus.DRIFTING, SiteStatus.AT_RISK] },
    },
  });

  return NextResponse.json({
    items: items.map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      client: s.client,
      type: s.type,
      region: s.region,
      budget: s.budget.toString(),
      startDate: s.startDate.toISOString(),
      plannedEndDate: s.plannedEndDate.toISOString(),
      actualEndDate: s.actualEndDate?.toISOString() ?? null,
      progress: s.progress,
      margin: s.margin,
      status: s.status,
      manager: s.manager,
    })),
    page,
    limit,
    total,
    pages: Math.max(1, Math.ceil(total / limit)),
    summary: {
      activeCount: aggregate._count._all,
      totalBudget: aggregate._sum.budget?.toString() ?? "0",
      avgMargin: aggregate._avg.margin ?? 0,
      alertsCount,
    },
  });
}

export async function POST(req: Request) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!session.tenantId) return NextResponse.json({ error: "Tenant requis" }, { status: 403 });
  if (!canManageSites(session.role as Role)) {
    return NextResponse.json(
      { error: "Réservé à la direction (DG / DAF / Directeur technique)" },
      { status: 403 }
    );
  }

  try {
    const data = createSiteSchema.parse(await req.json());

    const duplicate = await prisma.site.findFirst({
      where: { tenantId: session.tenantId, code: data.code },
    });
    if (duplicate) {
      return NextResponse.json({ error: `Code ${data.code} déjà utilisé` }, { status: 409 });
    }

    const created = await prisma.site.create({
      data: {
        tenantId: session.tenantId,
        code: data.code,
        name: data.name,
        client: data.client,
        type: data.type,
        region: data.region || null,
        budget: BigInt(data.budget),
        startDate: data.startDate,
        plannedEndDate: data.plannedEndDate,
        progress: data.progress,
        margin: data.margin,
        status: data.status,
        managerId: data.managerId || null,
      },
    });

    return NextResponse.json(
      { id: created.id, code: created.code, name: created.name },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    }
    console.error("[POST /api/sites]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
