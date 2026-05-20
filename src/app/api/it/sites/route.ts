import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardIt, guardItMutation } from "@/lib/rbac/it-guard";
import { SiteStatus, SiteType, MoaType, ContractTypeSite } from "@prisma/client";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

const createSchema = z.object({
  code: z.string().min(2).max(40),
  name: z.string().min(2).max(160),
  client: z.string().min(2).max(160),
  type: z.nativeEnum(SiteType),
  region: z.string().max(80).optional(),
  budget: z.number().int().nonnegative(),
  startDate: z.string().min(8), // ISO
  plannedEndDate: z.string().min(8), // ISO
  status: z.nativeEnum(SiteStatus).default(SiteStatus.PLANNED),
  managerId: z.string().optional().nullable(),
  marginTarget: z.number().min(0).max(100).default(20),
  // MOA (maître d'ouvrage)
  moaName: z.string().max(160).optional(),
  moaTypeKind: z.nativeEnum(MoaType).optional(),
  contractTypeKind: z.nativeEnum(ContractTypeSite).optional(),
  // Géoloc optionnelle
  lat: z.number().optional(),
  lng: z.number().optional(),
});

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

export async function POST(req: Request) {
  const guard = await guardItMutation("canManageTenantSettings");
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  // Unicité du code sur le tenant
  const existing = await prisma.site.findFirst({
    where: { tenantId: session.tenantId, code: data.code },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json(
      { error: `Le code chantier "${data.code}" existe déjà pour ce tenant.` },
      { status: 409 },
    );
  }

  // Si managerId fourni, vérifier qu'il appartient bien au tenant
  if (data.managerId) {
    const manager = await prisma.user.findFirst({
      where: { id: data.managerId, tenantId: session.tenantId },
      select: { id: true },
    });
    if (!manager) {
      return NextResponse.json({ error: "Manager introuvable dans le tenant" }, { status: 404 });
    }
  }

  const created = await prisma.site.create({
    data: {
      tenantId: session.tenantId!,
      code: data.code,
      name: data.name,
      client: data.client,
      type: data.type,
      region: data.region ?? null,
      budget: BigInt(data.budget),
      startDate: new Date(data.startDate),
      plannedEndDate: new Date(data.plannedEndDate),
      status: data.status,
      managerId: data.managerId ?? null,
      marginTarget: data.marginTarget,
      moaName: data.moaName ?? null,
      moaTypeKind: data.moaTypeKind ?? null,
      contractTypeKind: data.contractTypeKind ?? null,
      lat: data.lat ?? null,
      lng: data.lng ?? null,
    },
    select: { id: true, code: true, name: true },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userId: session.sub,
      action: "it.site.create",
      entityType: "Site",
      entityId: created.id,
      metadata: { code: created.code, name: created.name },
    },
  });

  return NextResponse.json({ ok: true, site: created }, { status: 201 });
}
