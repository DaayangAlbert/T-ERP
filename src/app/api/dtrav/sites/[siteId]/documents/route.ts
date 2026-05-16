import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardDtravSite, guardDtravSiteMutation } from "@/lib/rbac/dtrav-guard";
import { DocumentCategory } from "@prisma/client";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  category: z.nativeEnum(DocumentCategory),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  fileUrl: z.string().url().or(z.string().startsWith("/")),
  fileName: z.string().min(1),
  fileSize: z.coerce.number().int().nonnegative(),
  mimeType: z.string().min(1),
  thumbnailUrl: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
  metadata: z.unknown().optional().nullable(),
});

export async function GET(req: Request, { params }: { params: { siteId: string } }) {
  const guard = await guardDtravSite(params.siteId);
  if (guard instanceof NextResponse) return guard;

  const url = new URL(req.url);
  const category = url.searchParams.get("category") as DocumentCategory | null;
  const search = url.searchParams.get("search")?.trim();
  const where: Record<string, unknown> = { siteId: params.siteId };
  if (category) where.category = category;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { ocrContent: { contains: search, mode: "insensitive" } },
    ];
  }

  const items = await prisma.siteDocument.findMany({
    where,
    orderBy: { uploadedAt: "desc" },
    take: 100,
    include: { uploadedBy: { select: { firstName: true, lastName: true } } },
  });

  // Compteurs par catégorie
  const allDocs = await prisma.siteDocument.groupBy({
    by: ["category"],
    where: { siteId: params.siteId },
    _count: { _all: true },
  });
  const countsByCategory: Record<string, number> = {};
  for (const c of allDocs) {
    countsByCategory[c.category] = c._count._all;
  }

  return NextResponse.json({
    items: items.map((d) => ({
      id: d.id,
      category: d.category,
      title: d.title,
      description: d.description,
      fileUrl: d.fileUrl,
      fileName: d.fileName,
      fileSize: d.fileSize,
      mimeType: d.mimeType,
      thumbnailUrl: d.thumbnailUrl,
      uploadedBy: d.uploadedBy,
      uploadedAt: d.uploadedAt.toISOString(),
      tags: d.tags,
    })),
    countsByCategory,
  });
}

export async function POST(req: Request, { params }: { params: { siteId: string } }) {
  const guard = await guardDtravSiteMutation(params.siteId);
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation", issues: parsed.error.flatten() }, { status: 400 });
  }

  const created = await prisma.siteDocument.create({
    data: {
      siteId: params.siteId,
      category: parsed.data.category,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      fileUrl: parsed.data.fileUrl,
      fileName: parsed.data.fileName,
      fileSize: parsed.data.fileSize,
      mimeType: parsed.data.mimeType,
      thumbnailUrl: parsed.data.thumbnailUrl ?? null,
      tags: parsed.data.tags,
      metadata: (parsed.data.metadata as object) ?? undefined,
      uploadedById: session.sub,
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId!,
      userId: session.sub,
      action: "dtrav.document.upload",
      entityType: "SiteDocument",
      entityId: created.id,
      metadata: { siteId: params.siteId, category: parsed.data.category },
    },
  });

  return NextResponse.json({ id: created.id }, { status: 201 });
}
