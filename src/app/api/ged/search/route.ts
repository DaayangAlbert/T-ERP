import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role, Confidentiality } from "@prisma/client";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [
  Role.ARCHIVIST,
  Role.DG,
  Role.DAF,
  Role.HR,
  Role.TECH_DIRECTOR,
  Role.WORKS_DIRECTOR,
  Role.WORKS_MANAGER,
  Role.TENANT_ADMIN,
  Role.SUPER_ADMIN,
];

interface SearchBody {
  query?: string;
  filters?: {
    classificationId?: string;
    spaceId?: string;
    siteId?: string;
    authorId?: string;
    periodFrom?: string;
    periodTo?: string;
    archivalStatus?: string;
    confidentiality?: Confidentiality;
  };
  page?: number;
  perPage?: number;
}

export async function POST(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as SearchBody;
  const page = Math.max(1, body.page ?? 1);
  const perPage = Math.min(50, Math.max(5, body.perPage ?? 20));
  const skip = (page - 1) * perPage;

  const q = (body.query ?? "").trim();
  const filters = body.filters ?? {};

  const where: Prisma.DocumentWhereInput = {
    tenantId: session.tenantId,
    ...(q ? {
      OR: [
        { name: { contains: q, mode: "insensitive" as const } },
        { internalReference: { contains: q, mode: "insensitive" as const } },
        { ocrContent: { contains: q, mode: "insensitive" as const } },
      ],
    } : {}),
    ...(filters.classificationId ? { classificationId: filters.classificationId } : {}),
    ...(filters.spaceId ? { spaceId: filters.spaceId } : {}),
    ...(filters.siteId ? { siteId: filters.siteId } : {}),
    ...(filters.authorId ? { authorId: filters.authorId } : {}),
    ...(filters.confidentiality ? { confidentiality: filters.confidentiality } : {}),
    ...(filters.periodFrom || filters.periodTo
      ? {
          createdAt: {
            ...(filters.periodFrom ? { gte: new Date(filters.periodFrom) } : {}),
            ...(filters.periodTo ? { lte: new Date(filters.periodTo) } : {}),
          },
        }
      : {}),
    ...(filters.archivalStatus
      ? { retentionRecord: { archivalStatus: filters.archivalStatus as "ACTIVE" | "SEMI_ACTIVE" | "FINAL_ARCHIVE" | "PENDING_DESTRUCTION" | "DESTROYED" } }
      : {}),
  };

  // Permission ARCHIVIST hors BS_ et contentieux : ne pas montrer les BS individuels confidentiels
  // (sauf si role HR ou DG)
  const role = session.role as Role;
  if (role === Role.ARCHIVIST) {
    where.NOT = [
      { confidentiality: Confidentiality.CONFIDENTIAL, classification: { prefix: "BS_" } },
      { confidentiality: Confidentiality.CONFIDENTIAL, classification: { prefix: "CON_J" } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.document.findMany({
      where,
      select: {
        id: true,
        name: true,
        authorId: true,
        internalReference: true,
        confidentiality: true,
        sizeBytes: true,
        createdAt: true,
        classification: { select: { prefix: true, name: true, dua: true } },
        space: { select: { code: true, name: true } },
        retentionRecord: { select: { archivalStatus: true, duaEndDate: true, legalHold: true } },
      },
      orderBy: { createdAt: "desc" },
      take: perPage,
      skip,
    }),
    prisma.document.count({ where }),
  ]);

  const authorIds = Array.from(new Set(items.map((d) => d.authorId)));
  const authors = await prisma.user.findMany({
    where: { id: { in: authorIds } },
    select: { id: true, firstName: true, lastName: true },
  });
  const authorMap = new Map(authors.map((u) => [u.id, `${u.firstName} ${u.lastName}`]));

  return NextResponse.json({
    page,
    perPage,
    total,
    pages: Math.ceil(total / perPage),
    items: items.map((d) => ({
      id: d.id,
      name: d.name,
      internalReference: d.internalReference,
      confidentiality: d.confidentiality,
      sizeBytes: Number(d.sizeBytes),
      sizeMb: Math.round((Number(d.sizeBytes) / 1_000_000) * 10) / 10,
      createdAt: d.createdAt.toISOString(),
      author: authorMap.get(d.authorId) ?? null,
      classificationPrefix: d.classification?.prefix ?? null,
      classificationName: d.classification?.name ?? null,
      classificationDua: d.classification?.dua ?? null,
      spaceCode: d.space?.code ?? null,
      spaceName: d.space?.name ?? null,
      archivalStatus: d.retentionRecord?.archivalStatus ?? null,
      duaEndDate: d.retentionRecord?.duaEndDate?.toISOString() ?? null,
      legalHold: d.retentionRecord?.legalHold ?? false,
    })),
  });
}
