import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardGed } from "@/lib/rbac/ged-guard";
import { Confidentiality } from "@prisma/client";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const guard = await guardGed();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;

  const space = await prisma.documentSpace.findFirst({
    where: { id: params.id, tenantId },
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      icon: true,
      spaceType: true,
      confidentiality: true,
      active: true,
      createdAt: true,
      responsible: { select: { id: true, firstName: true, lastName: true, email: true } },
      site: {
        select: {
          id: true,
          code: true,
          name: true,
          status: true,
          client: true,
          progress: true,
          plannedEndDate: true,
          manager: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  if (!space) {
    return NextResponse.json({ error: "Espace introuvable" }, { status: 404 });
  }

  // Arborescence : group documents par classification.category puis par classification.prefix
  const docs = await prisma.document.findMany({
    where: { tenantId, spaceId: params.id },
    select: {
      id: true,
      sizeBytes: true,
      classification: { select: { prefix: true, code: true, name: true, category: true } },
    },
  });

  // Agrégation 2-niveaux : category → prefix
  type LeafRow = { prefix: string; name: string; count: number; volumeBytes: number };
  type CategoryRow = { category: string; count: number; volumeBytes: number; leaves: LeafRow[] };
  const byCategory = new Map<string, CategoryRow>();

  let totalVolume = 0;
  for (const d of docs) {
    const cat = d.classification?.category ?? "OTHER";
    const prefix = d.classification?.prefix ?? "NON_CLASSE";
    const name = d.classification?.name ?? "Non classé";
    const size = Number(d.sizeBytes);
    totalVolume += size;
    let entry = byCategory.get(cat);
    if (!entry) {
      entry = { category: cat, count: 0, volumeBytes: 0, leaves: [] };
      byCategory.set(cat, entry);
    }
    entry.count++;
    entry.volumeBytes += size;
    let leaf = entry.leaves.find((l) => l.prefix === prefix);
    if (!leaf) {
      leaf = { prefix, name, count: 0, volumeBytes: 0 };
      entry.leaves.push(leaf);
    }
    leaf.count++;
    leaf.volumeBytes += size;
  }
  const tree = Array.from(byCategory.values())
    .map((c) => ({ ...c, leaves: c.leaves.sort((a, b) => b.count - a.count) }))
    .sort((a, b) => b.count - a.count);

  // Stats globales espace
  const indexedCount = docs.filter((d) => d.classification).length;
  const indexationRate = docs.length > 0 ? Math.round((indexedCount / docs.length) * 100) : 0;

  return NextResponse.json({
    space: {
      id: space.id,
      code: space.code,
      name: space.name,
      description: space.description,
      icon: space.icon,
      spaceType: space.spaceType,
      confidentiality: space.confidentiality,
      active: space.active,
      createdAt: space.createdAt.toISOString(),
      responsible: space.responsible
        ? { id: space.responsible.id, name: `${space.responsible.firstName} ${space.responsible.lastName}`, email: space.responsible.email }
        : null,
      site: space.site
        ? {
            id: space.site.id,
            code: space.site.code,
            name: space.site.name,
            status: space.site.status,
            client: space.site.client,
            progress: space.site.progress,
            plannedEndDate: space.site.plannedEndDate.toISOString(),
            manager: space.site.manager ? `${space.site.manager.firstName} ${space.site.manager.lastName}` : null,
          }
        : null,
    },
    stats: {
      documentsCount: docs.length,
      volumeBytes: totalVolume,
      indexationRate,
      categoriesCount: tree.length,
    },
    tree,
  });
}

const patchSchema = z.object({
  name: z.string().min(3).max(120).optional(),
  description: z.string().max(500).nullable().optional(),
  icon: z.string().max(8).nullable().optional(),
  confidentiality: z.nativeEnum(Confidentiality).optional(),
  responsibleId: z.string().cuid().nullable().optional(),
  active: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const guard = await guardGed();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;

  const existing = await prisma.documentSpace.findFirst({
    where: { id: params.id, tenantId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Espace introuvable" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const data = patchSchema.parse(body);
    await prisma.documentSpace.update({
      where: { id: params.id },
      data,
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Erreur de validation" }, { status: 400 });
  }
}
