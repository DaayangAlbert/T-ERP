import { NextResponse } from "next/server";
import { Role, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getTenantScopeIds } from "@/lib/tenant";

export const dynamic = "force-dynamic";

/**
 * Vue Documentaire condensée pour le DG : agrège les documents chantier
 * (`SiteDocument`) et les documents GED (`Document`), avec recherche
 * (titre / référence / catégorie) et filtres (catégorie, chantier, direction).
 */
export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.role !== Role.DG && session.role !== Role.SUPER_ADMIN && session.role !== Role.TENANT_ADMIN) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const url = new URL(req.url);
  const search = url.searchParams.get("q")?.trim();
  const categoryFilter = url.searchParams.get("category")?.trim();
  const siteIdFilter = url.searchParams.get("siteId")?.trim();
  const directionFilter = url.searchParams.get("direction")?.trim(); // "HR", "ACCOUNTING", ...
  const sourceFilter = url.searchParams.get("source")?.trim(); // "SITE" | "GED"

  const tenantIds = await getTenantScopeIds(session.tenantId);

  // ---- SiteDocument (toujours lié à un chantier) ----
  const siteDocsWhere: Prisma.SiteDocumentWhereInput = {
    site: { tenantId: { in: tenantIds } },
    archived: false,
  };
  if (search) siteDocsWhere.title = { contains: search, mode: "insensitive" };
  if (categoryFilter) siteDocsWhere.category = categoryFilter as Prisma.SiteDocumentWhereInput["category"];
  if (siteIdFilter) siteDocsWhere.siteId = siteIdFilter;

  const siteDocs =
    sourceFilter === "GED"
      ? []
      : await prisma.siteDocument.findMany({
          where: siteDocsWhere,
          orderBy: { uploadedAt: "desc" },
          take: 500,
          include: {
            site: { select: { id: true, code: true, name: true } },
            uploadedBy: { select: { firstName: true, lastName: true } },
          },
        });

  // ---- Document GED ----
  const gedWhere: Prisma.DocumentWhereInput = {
    tenantId: { in: tenantIds },
  };
  if (search) {
    gedWhere.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { internalReference: { contains: search, mode: "insensitive" } },
    ];
  }
  if (categoryFilter) gedWhere.category = categoryFilter;
  if (siteIdFilter) gedWhere.siteId = siteIdFilter;
  if (directionFilter) {
    gedWhere.space = { spaceType: directionFilter as Prisma.DocumentSpaceWhereInput["spaceType"] };
  }

  const gedDocs =
    sourceFilter === "SITE"
      ? []
      : await prisma.document.findMany({
          where: gedWhere,
          orderBy: { createdAt: "desc" },
          take: 500,
          include: {
            space: { select: { id: true, code: true, name: true, spaceType: true } },
          },
        });

  // Unification
  const unified = [
    ...siteDocs.map((d) => ({
      id: d.id,
      source: "SITE" as const,
      title: d.title,
      category: d.category,
      subCategory: d.subCategory,
      fileName: d.fileName,
      fileSize: d.fileSize,
      mimeType: d.mimeType,
      fileUrl: d.fileUrl,
      uploadedAt: d.uploadedAt.toISOString(),
      uploadedBy: `${d.uploadedBy.firstName} ${d.uploadedBy.lastName}`,
      site: d.site,
      direction: null as string | null,
      space: null as { code: string; name: string } | null,
      reference: d.referenceNumber,
    })),
    ...gedDocs.map((d) => ({
      id: d.id,
      source: "GED" as const,
      title: d.name,
      category: d.category,
      subCategory: null,
      fileName: d.name,
      fileSize: Number(d.sizeBytes),
      mimeType: d.mimeType,
      fileUrl: d.url,
      uploadedAt: d.createdAt.toISOString(),
      uploadedBy: "—",
      site: null,
      direction: d.space?.spaceType ?? null,
      space: d.space ? { code: d.space.code, name: d.space.name } : null,
      reference: d.internalReference,
    })),
  ].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));

  // Facettes (pour les filtres)
  const sitesAvailable = await prisma.site.findMany({
    where: { tenantId: { in: tenantIds } },
    orderBy: { code: "asc" },
    select: { id: true, code: true, name: true },
  });

  const categoriesCount = new Map<string, number>();
  for (const d of unified) {
    if (!d.category) continue;
    categoriesCount.set(d.category, (categoriesCount.get(d.category) ?? 0) + 1);
  }
  const categories = Array.from(categoriesCount.entries())
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count);

  // Stats par direction (depuis les GED docs)
  const dirCount = new Map<string, number>();
  for (const d of unified) {
    if (!d.direction) continue;
    dirCount.set(d.direction, (dirCount.get(d.direction) ?? 0) + 1);
  }
  const directions = Array.from(dirCount.entries())
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({
    items: unified.slice(0, 500),
    facets: {
      sites: sitesAvailable,
      categories,
      directions,
    },
    summary: {
      total: unified.length,
      siteDocs: siteDocs.length,
      gedDocs: gedDocs.length,
    },
  });
}
