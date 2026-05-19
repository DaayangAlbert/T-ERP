import { NextResponse } from "next/server";
import { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { guardGed, getArchivistBlockedPrefixes } from "@/lib/rbac/ged-guard";

export const dynamic = "force-dynamic";

const PAGE_SIZE_DEFAULT = 50;
const PAGE_SIZE_MAX = 200;

/**
 * GET /api/ged/documents/all
 *
 * Vue exhaustive du référent documentaire (ARCHIVIST). Retourne tous les
 * documents du tenant, peu importe le rôle qui les a déposés, à l'exception
 * des préfixes restreints (BS_, DRH_CTX) — cf. ged-guard.ts.
 *
 * Réservé ARCHIVIST avec `canReadAllDocuments=true`, TENANT_ADMIN, SUPER_ADMIN.
 *
 * Filtres query :
 *   - spaceId, classificationId, siteId, authorId, status (DocStatus),
 *     confidentiality, q (recherche texte name + ocrContent), from, to (ISO dates)
 *   - unclassified=1 (force classificationId null OU spaceId null)
 *   - page (>=1), pageSize (default 50, max 200)
 *   - sort = newest | oldest | name | size (default newest)
 */
export async function GET(req: Request) {
  const guard = await guardGed();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;

  if (
    session.role !== Role.ARCHIVIST &&
    session.role !== Role.TENANT_ADMIN &&
    session.role !== Role.SUPER_ADMIN
  ) {
    return NextResponse.json({ error: "Réservé référent documentaire" }, { status: 403 });
  }

  if (session.role === Role.ARCHIVIST) {
    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { canReadAllDocuments: true },
    });
    if (!user?.canReadAllDocuments) {
      return NextResponse.json(
        { error: "Le flag canReadAllDocuments n'est pas activé sur votre compte" },
        { status: 403 },
      );
    }
  }

  const url = new URL(req.url);
  const spaceId = url.searchParams.get("spaceId") || undefined;
  const classificationId = url.searchParams.get("classificationId") || undefined;
  const siteId = url.searchParams.get("siteId") || undefined;
  const authorId = url.searchParams.get("authorId") || undefined;
  const status = url.searchParams.get("status") || undefined;
  const confidentiality = url.searchParams.get("confidentiality") || undefined;
  const q = url.searchParams.get("q")?.trim() || undefined;
  const fromRaw = url.searchParams.get("from");
  const toRaw = url.searchParams.get("to");
  const unclassified = url.searchParams.get("unclassified") === "1";
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
  const pageSize = Math.min(
    PAGE_SIZE_MAX,
    Math.max(1, Number(url.searchParams.get("pageSize") ?? PAGE_SIZE_DEFAULT)),
  );
  const sort = url.searchParams.get("sort") ?? "newest";

  const blockedPrefixes = getArchivistBlockedPrefixes();

  const where: Prisma.DocumentWhereInput = {
    tenantId,
    AND: [
      {
        OR: [
          { classification: null },
          { classification: { prefix: { notIn: [...blockedPrefixes] } } },
        ],
      },
    ],
  };
  if (spaceId) where.spaceId = spaceId;
  if (classificationId) where.classificationId = classificationId;
  if (siteId) where.siteId = siteId;
  if (authorId) where.authorId = authorId;
  if (status) where.status = status as Prisma.DocumentWhereInput["status"];
  if (confidentiality)
    where.confidentiality = confidentiality as Prisma.DocumentWhereInput["confidentiality"];
  if (unclassified) {
    where.OR = [{ classificationId: null }, { spaceId: null }];
  }
  if (q) {
    where.AND = [
      ...((where.AND as Prisma.DocumentWhereInput[]) ?? []),
      {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { ocrContent: { contains: q, mode: "insensitive" } },
          { internalReference: { contains: q, mode: "insensitive" } },
        ],
      },
    ];
  }
  if (fromRaw) {
    const from = new Date(fromRaw);
    if (!isNaN(from.getTime())) where.createdAt = { ...(where.createdAt as object), gte: from };
  }
  if (toRaw) {
    const to = new Date(toRaw);
    if (!isNaN(to.getTime())) where.createdAt = { ...(where.createdAt as object), lte: to };
  }

  const orderBy: Prisma.DocumentOrderByWithRelationInput =
    sort === "oldest"
      ? { createdAt: "asc" }
      : sort === "name"
        ? { name: "asc" }
        : sort === "size"
          ? { sizeBytes: "desc" }
          : { createdAt: "desc" };

  const [items, total, facetsRaw] = await Promise.all([
    prisma.document.findMany({
      where,
      orderBy,
      take: pageSize,
      skip: (page - 1) * pageSize,
      select: {
        id: true,
        name: true,
        mimeType: true,
        sizeBytes: true,
        url: true,
        createdAt: true,
        status: true,
        confidentiality: true,
        category: true,
        folder: true,
        internalReference: true,
        authorId: true,
        siteId: true,
        space: { select: { id: true, code: true, name: true, icon: true } },
        classification: { select: { id: true, prefix: true, name: true, category: true } },
      },
    }),
    prisma.document.count({ where }),
    prisma.document.groupBy({
      by: ["spaceId"],
      where,
      _count: { _all: true },
    }),
  ]);

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

  const facetBySpace: Record<string, number> = {};
  for (const f of facetsRaw) {
    facetBySpace[f.spaceId ?? "__none__"] = f._count._all;
  }

  return NextResponse.json({
    page,
    pageSize,
    total,
    pages: Math.max(1, Math.ceil(total / pageSize)),
    items: items.map((d) => {
      const author = authorMap.get(d.authorId);
      const site = d.siteId ? siteMap.get(d.siteId) : null;
      return {
        id: d.id,
        name: d.name,
        mimeType: d.mimeType,
        sizeBytes: Number(d.sizeBytes),
        url: d.url,
        createdAt: d.createdAt.toISOString(),
        status: d.status,
        confidentiality: d.confidentiality,
        category: d.category,
        folder: d.folder,
        internalReference: d.internalReference,
        authorId: d.authorId,
        authorName: author ? `${author.firstName} ${author.lastName}` : "Inconnu",
        authorRole: author?.role ?? null,
        siteId: d.siteId,
        siteCode: site?.code ?? null,
        siteName: site?.name ?? null,
        spaceId: d.space?.id ?? null,
        spaceCode: d.space?.code ?? null,
        spaceName: d.space?.name ?? null,
        spaceIcon: d.space?.icon ?? null,
        classificationId: d.classification?.id ?? null,
        classificationPrefix: d.classification?.prefix ?? null,
        classificationName: d.classification?.name ?? null,
        classificationCategory: d.classification?.category ?? null,
      };
    }),
    facets: {
      bySpace: facetBySpace,
    },
  });
}
