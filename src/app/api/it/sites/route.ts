import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardIt } from "@/lib/rbac/it-guard";
import { SiteStatus, SiteType } from "@prisma/client";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

export async function GET(req: Request) {
  const guard = await guardIt();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
  const search = url.searchParams.get("search")?.trim();
  const status = url.searchParams.get("status") as SiteStatus | null;
  const type = url.searchParams.get("type") as SiteType | null;
  const region = url.searchParams.get("region")?.trim();

  const where: Record<string, unknown> = { tenantId: session.tenantId };
  if (status) where.status = status;
  if (type) where.type = type;
  if (region) where.region = region;
  if (search) {
    where.OR = [
      { code: { contains: search, mode: "insensitive" } },
      { name: { contains: search, mode: "insensitive" } },
      { client: { contains: search, mode: "insensitive" } },
    ];
  }

  const [total, items, totals] = await Promise.all([
    prisma.site.count({ where }),
    prisma.site.findMany({
      where,
      orderBy: [{ status: "asc" }, { startDate: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        code: true,
        name: true,
        client: true,
        type: true,
        region: true,
        budget: true,
        progress: true,
        margin: true,
        status: true,
        plannedEndDate: true,
        manager: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.site.groupBy({
      by: ["status"],
      where: { tenantId: session.tenantId! },
      _count: true,
    }),
  ]);

  return NextResponse.json({
    items: items.map((s) => ({
      ...s,
      budget: Number(s.budget),
      plannedEndDate: s.plannedEndDate.toISOString(),
    })),
    page,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    total,
    kpis: {
      active: totals.find((t) => t.status === SiteStatus.ACTIVE)?._count ?? 0,
      planned: totals.find((t) => t.status === SiteStatus.PLANNED)?._count ?? 0,
      completed: totals.find((t) => t.status === SiteStatus.COMPLETED)?._count ?? 0,
      archived: totals.find((t) => t.status === SiteStatus.ARCHIVED)?._count ?? 0,
      atRisk: totals.find((t) => t.status === SiteStatus.AT_RISK)?._count ?? 0,
      drifting: totals.find((t) => t.status === SiteStatus.DRIFTING)?._count ?? 0,
    },
  });
}
