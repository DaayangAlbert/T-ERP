import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardGed, guardGedMutation } from "@/lib/rbac/ged-guard";
import { Confidentiality, SpaceType } from "@prisma/client";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const guard = await guardGed();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const conf = url.searchParams.get("confidentiality") as Confidentiality | null;
  const minIndexationRaw = url.searchParams.get("minIndexation");
  const minIndexation = minIndexationRaw ? Math.max(0, Math.min(100, Number(minIndexationRaw))) : null;
  const tab = url.searchParams.get("tab"); // "transverse" | "sites" | "all"

  const where: any = { tenantId, active: true };
  if (conf) where.confidentiality = conf;
  if (q) where.OR = [{ name: { contains: q, mode: "insensitive" } }, { code: { contains: q, mode: "insensitive" } }];
  if (tab === "transverse") where.spaceType = { not: SpaceType.CONSTRUCTION_SITE };
  if (tab === "sites") where.spaceType = SpaceType.CONSTRUCTION_SITE;

  const spaces = await prisma.documentSpace.findMany({
    where,
    orderBy: [{ spaceType: "asc" }, { name: "asc" }],
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      icon: true,
      spaceType: true,
      confidentiality: true,
      siteId: true,
      responsible: { select: { id: true, firstName: true, lastName: true } },
      site: { select: { id: true, code: true, name: true, status: true, manager: { select: { firstName: true, lastName: true } } } },
      _count: { select: { documents: true } },
    },
  });

  const sumsRaw = await prisma.document.groupBy({
    by: ["spaceId"],
    where: { tenantId, spaceId: { not: null } },
    _sum: { sizeBytes: true },
  });
  const sumBySpace = new Map<string, number>(
    sumsRaw.filter((r) => r.spaceId).map((r) => [r.spaceId!, Number(r._sum.sizeBytes ?? 0n)]),
  );

  const indexedRaw = await prisma.document.groupBy({
    by: ["spaceId"],
    where: { tenantId, spaceId: { not: null }, classificationId: { not: null } },
    _count: { _all: true },
  });
  const indexedBySpace = new Map<string, number>(
    indexedRaw.filter((r) => r.spaceId).map((r) => [r.spaceId!, r._count._all]),
  );

  const rows = spaces.map((s) => {
    const docs = s._count.documents;
    const indexed = indexedBySpace.get(s.id) ?? 0;
    const indexationRate = docs > 0 ? Math.round((indexed / docs) * 100) : 0;
    return {
      id: s.id,
      code: s.code,
      name: s.name,
      description: s.description,
      icon: s.icon,
      spaceType: s.spaceType,
      confidentiality: s.confidentiality,
      siteCode: s.site?.code ?? null,
      siteStatus: s.site?.status ?? null,
      siteManager: s.site?.manager ? `${s.site.manager.firstName} ${s.site.manager.lastName}` : null,
      responsibleName: s.responsible ? `${s.responsible.firstName} ${s.responsible.lastName}` : null,
      documentsCount: docs,
      volumeBytes: sumBySpace.get(s.id) ?? 0,
      indexationRate,
    };
  });

  const filtered = minIndexation !== null ? rows.filter((r) => r.indexationRate >= minIndexation) : rows;
  const transverse = filtered.filter((r) => r.spaceType !== SpaceType.CONSTRUCTION_SITE);
  const sites = filtered.filter((r) => r.spaceType === SpaceType.CONSTRUCTION_SITE);

  return NextResponse.json({
    counts: {
      total: rows.length,
      transverse: transverse.length,
      sites: sites.length,
    },
    transverse,
    sites,
  });
}

const createSchema = z.object({
  code: z.string().min(2).max(60).regex(/^[A-Z0-9_]+$/, "Format : MAJUSCULES_UNDERSCORES_CHIFFRES"),
  name: z.string().min(3).max(120),
  description: z.string().max(500).optional(),
  icon: z.string().max(8).optional(),
  spaceType: z.nativeEnum(SpaceType),
  confidentiality: z.nativeEnum(Confidentiality),
  siteId: z.string().cuid().optional().nullable(),
  responsibleId: z.string().cuid().optional().nullable(),
});

export async function POST(req: Request) {
  const guard = await guardGedMutation();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;

  try {
    const body = await req.json();
    const data = createSchema.parse(body);
    const space = await prisma.documentSpace.create({
      data: {
        tenantId,
        code: data.code,
        name: data.name,
        description: data.description ?? null,
        icon: data.icon ?? null,
        spaceType: data.spaceType,
        confidentiality: data.confidentiality,
        siteId: data.siteId ?? null,
        responsibleId: data.responsibleId ?? null,
      },
      select: { id: true },
    });
    return NextResponse.json({ id: space.id }, { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json({ error: "Code d'espace déjà utilisé" }, { status: 409 });
    }
    return NextResponse.json({ error: e?.message ?? "Erreur de validation" }, { status: 400 });
  }
}
