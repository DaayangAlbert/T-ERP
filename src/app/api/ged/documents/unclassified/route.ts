import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardGed } from "@/lib/rbac/ged-guard";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

/**
 * GET /api/ged/documents/unclassified
 *
 * Liste les documents qui nécessitent une intervention manuelle de l'archiviste :
 *   - classificationId null (auto-classif échouée)
 *   - OU spaceId null (pas rangé)
 *
 * Retourne uniquement les documents importés depuis > 24h pour éviter de
 * polluer la liste avec les uploads très récents (le temps qu'un workflow
 * éventuel se boucle).
 */
export async function GET(req: Request) {
  const guard = await guardGed();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
  const includeRecent = url.searchParams.get("includeRecent") === "1";

  const where: any = {
    tenantId,
    OR: [{ classificationId: null }, { spaceId: null }],
  };
  if (!includeRecent) {
    where.createdAt = { lt: new Date(Date.now() - 24 * 3600 * 1000) };
  }

  const [items, total] = await Promise.all([
    prisma.document.findMany({
      where,
      orderBy: { createdAt: "asc" }, // les plus vieux d'abord (urgents)
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      select: {
        id: true,
        name: true,
        mimeType: true,
        sizeBytes: true,
        url: true,
        createdAt: true,
        confidentiality: true,
        authorId: true,
        siteId: true,
        space: { select: { id: true, name: true, icon: true } },
        classification: { select: { id: true, prefix: true, name: true } },
      },
    }),
    prisma.document.count({ where }),
  ]);

  // Lookup auteurs + sites en parallèle (pas de relations Prisma sur Document)
  const authorIds = Array.from(new Set(items.map((d) => d.authorId)));
  const siteIds = Array.from(new Set(items.map((d) => d.siteId).filter(Boolean) as string[]));
  const [authors, sites] = await Promise.all([
    authorIds.length
      ? prisma.user.findMany({
          where: { id: { in: authorIds } },
          select: { id: true, firstName: true, lastName: true, role: true },
        })
      : Promise.resolve([]),
    siteIds.length
      ? prisma.site.findMany({
          where: { id: { in: siteIds } },
          select: { id: true, code: true, name: true },
        })
      : Promise.resolve([]),
  ]);
  const authorMap = new Map(authors.map((a) => [a.id, a]));
  const siteMap = new Map(sites.map((s) => [s.id, s]));

  return NextResponse.json({
    page,
    pageSize: PAGE_SIZE,
    total,
    pages: Math.ceil(total / PAGE_SIZE),
    documents: items.map((d) => {
      const author = authorMap.get(d.authorId);
      const site = d.siteId ? siteMap.get(d.siteId) : null;
      return {
        id: d.id,
        name: d.name,
        mimeType: d.mimeType,
        sizeBytes: Number(d.sizeBytes),
        url: d.url,
        createdAt: d.createdAt.toISOString(),
        ageDays: Math.floor((Date.now() - d.createdAt.getTime()) / 86_400_000),
        confidentiality: d.confidentiality,
        authorName: author ? `${author.firstName} ${author.lastName}` : "Système",
        authorRole: author?.role ?? null,
        siteCode: site?.code ?? null,
        siteName: site?.name ?? null,
        spaceId: d.space?.id ?? null,
        spaceName: d.space?.name ?? null,
        spaceIcon: d.space?.icon ?? null,
        classificationId: d.classification?.id ?? null,
        classificationPrefix: d.classification?.prefix ?? null,
        classificationName: d.classification?.name ?? null,
        missing: {
          classification: !d.classification,
          space: !d.space,
        },
      };
    }),
  });
}
