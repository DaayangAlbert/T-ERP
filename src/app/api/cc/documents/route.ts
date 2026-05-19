import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { DocumentCategory, Role, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { saveSiteFile } from "@/lib/storage/local-files";
import { siteDocumentMetadataSchema } from "@/schemas/site-document";

export const dynamic = "force-dynamic";

const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 Mo

/**
 * Liste les documents des chantiers du Chef de Chantier connecté.
 * Filtres : ?siteId, ?category, ?archived=true|false, ?search
 */
export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.role !== Role.SITE_MANAGER) {
    return NextResponse.json({ error: "Accès réservé au Chef de Chantier" }, { status: 403 });
  }

  const me = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { assignedSiteIds: true, managedSites: { select: { id: true } } },
  });
  const allowedSiteIds = Array.from(
    new Set([...(me?.assignedSiteIds ?? []), ...(me?.managedSites ?? []).map((s) => s.id)]),
  );
  if (allowedSiteIds.length === 0) {
    return NextResponse.json({ items: [], summary: emptySummary() });
  }

  const url = new URL(req.url);
  const siteIdFilter = url.searchParams.get("siteId");
  const category = url.searchParams.get("category") as DocumentCategory | null;
  const archivedParam = url.searchParams.get("archived");
  const search = url.searchParams.get("search")?.trim();

  const where: Prisma.SiteDocumentWhereInput = {
    siteId:
      siteIdFilter && allowedSiteIds.includes(siteIdFilter)
        ? siteIdFilter
        : { in: allowedSiteIds },
    archived: archivedParam === "true" ? true : archivedParam === "false" ? false : undefined,
  };
  if (category) where.category = category;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { referenceNumber: { contains: search, mode: "insensitive" } },
      { relatedPartyName: { contains: search, mode: "insensitive" } },
    ];
  }

  const items = await prisma.siteDocument.findMany({
    where,
    orderBy: [{ archived: "asc" }, { uploadedAt: "desc" }],
    take: 300,
    include: {
      site: { select: { id: true, code: true, name: true } },
      uploadedBy: { select: { firstName: true, lastName: true } },
    },
  });

  // Résumé : compte par catégorie + total + cautions/assurances expirant <30j
  const totalActive = items.filter((d) => !d.archived).length;
  const totalArchived = items.filter((d) => d.archived).length;
  const now = Date.now();
  const in30d = now + 30 * 86_400_000;
  const expiringSoon = items.filter(
    (d) =>
      !d.archived &&
      d.validUntil &&
      d.validUntil.getTime() <= in30d &&
      d.validUntil.getTime() >= now,
  ).length;
  const expired = items.filter(
    (d) => !d.archived && d.validUntil && d.validUntil.getTime() < now,
  ).length;
  const totalGuaranteesValue = items
    .filter((d) => !d.archived && d.amount && d.category.startsWith("BANK_GUARANTEE_"))
    .reduce((acc, d) => acc + Number(d.amount), 0);

  return NextResponse.json({
    items: items.map((d) => ({
      id: d.id,
      title: d.title,
      description: d.description,
      category: d.category,
      subCategory: d.subCategory,
      fileUrl: d.fileUrl,
      fileName: d.fileName,
      fileSize: d.fileSize,
      mimeType: d.mimeType,
      thumbnailUrl: d.thumbnailUrl,
      referenceNumber: d.referenceNumber,
      issuedAt: d.issuedAt?.toISOString() ?? null,
      validUntil: d.validUntil?.toISOString() ?? null,
      amount: d.amount ? Number(d.amount) : null,
      relatedPartyName: d.relatedPartyName,
      archived: d.archived,
      archivedAt: d.archivedAt?.toISOString() ?? null,
      tags: d.tags,
      uploadedAt: d.uploadedAt.toISOString(),
      uploadedBy: `${d.uploadedBy.firstName} ${d.uploadedBy.lastName}`,
      site: d.site,
    })),
    summary: {
      totalActive,
      totalArchived,
      expiringSoon,
      expired,
      totalGuaranteesValue,
    },
  });
}

/**
 * Upload d'un document (multipart/form-data) :
 *   - `file` : le fichier
 *   - `siteId` : id du chantier
 *   - `metadata` : JSON serialisé (title, category, etc.)
 */
export async function POST(req: Request) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.role !== Role.SITE_MANAGER) {
    return NextResponse.json({ error: "Accès réservé au Chef de Chantier" }, { status: 403 });
  }

  try {
    const form = await req.formData();
    const file = form.get("file");
    const siteId = form.get("siteId");
    const metaRaw = form.get("metadata");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Fichier requis" }, { status: 400 });
    }
    if (typeof siteId !== "string" || !siteId) {
      return NextResponse.json({ error: "siteId requis" }, { status: 400 });
    }
    if (typeof metaRaw !== "string") {
      return NextResponse.json({ error: "metadata requise" }, { status: 400 });
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: `Fichier trop volumineux (max ${MAX_FILE_BYTES / 1_048_576} Mo)` },
        { status: 413 },
      );
    }

    const metadata = siteDocumentMetadataSchema.parse(JSON.parse(metaRaw));

    // Vérifie que le CC est autorisé sur ce site
    const site = await prisma.site.findUnique({
      where: { id: siteId },
      select: { id: true, tenantId: true },
    });
    if (!site) return NextResponse.json({ error: "Chantier introuvable" }, { status: 404 });

    const me = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { assignedSiteIds: true, managedSites: { select: { id: true } } },
    });
    const allowed = new Set([
      ...(me?.assignedSiteIds ?? []),
      ...(me?.managedSites ?? []).map((s) => s.id),
    ]);
    if (!allowed.has(siteId)) {
      return NextResponse.json({ error: "Chantier hors périmètre" }, { status: 403 });
    }

    const saved = await saveSiteFile(siteId, file);

    const created = await prisma.siteDocument.create({
      data: {
        siteId,
        category: metadata.category,
        subCategory: metadata.subCategory ?? null,
        title: metadata.title,
        description: metadata.description ?? null,
        referenceNumber: metadata.referenceNumber ?? null,
        issuedAt: metadata.issuedAt ? new Date(metadata.issuedAt) : null,
        validUntil: metadata.validUntil ? new Date(metadata.validUntil) : null,
        amount: metadata.amount ? BigInt(metadata.amount) : null,
        relatedPartyName: metadata.relatedPartyName ?? null,
        tags: metadata.tags ?? [],
        fileUrl: saved.fileUrl,
        fileName: saved.fileName,
        fileSize: saved.fileSize,
        mimeType: saved.mimeType,
        uploadedById: session.sub,
      },
      select: { id: true, title: true, fileUrl: true },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: "Métadonnées invalides", issues: err.flatten() },
        { status: 400 },
      );
    }
    console.error("[POST /api/cc/documents]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

function emptySummary() {
  return {
    totalActive: 0,
    totalArchived: 0,
    expiringSoon: 0,
    expired: 0,
    totalGuaranteesValue: 0,
  };
}
