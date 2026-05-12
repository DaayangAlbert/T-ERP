import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardGed } from "@/lib/rbac/ged-guard";
import { ClassificationCategory, Role } from "@prisma/client";
import { getArchivistBlockedPrefixes } from "@/lib/rbac/ged-guard";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const guard = await guardGed();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;

  const url = new URL(req.url);
  const category = url.searchParams.get("category") as ClassificationCategory | null;
  const prefix = url.searchParams.get("prefix");
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));

  const space = await prisma.documentSpace.findFirst({
    where: { id: params.id, tenantId },
    select: { id: true },
  });
  if (!space) {
    return NextResponse.json({ error: "Espace introuvable" }, { status: 404 });
  }

  const where: any = { tenantId, spaceId: params.id };
  if (category) where.classification = { ...(where.classification ?? {}), category };
  if (prefix) where.classification = { ...(where.classification ?? {}), prefix };

  // ARCHIVIST sans accès aux préfixes interdits (BS_, DRH_CTX)
  if (session.role === Role.ARCHIVIST) {
    const blocked = getArchivistBlockedPrefixes();
    if (blocked.length > 0) {
      where.NOT = [{ classification: { prefix: { in: [...blocked] } } }];
    }
  }

  const [total, docs] = await Promise.all([
    prisma.document.count({ where }),
    prisma.document.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      select: {
        id: true,
        name: true,
        internalReference: true,
        confidentiality: true,
        sizeBytes: true,
        createdAt: true,
        status: true,
        classification: { select: { prefix: true, name: true, category: true } },
        retentionRecord: { select: { archivalStatus: true, duaEndDate: true } },
      },
    }),
  ]);

  return NextResponse.json({
    page,
    pageSize: PAGE_SIZE,
    total,
    documents: docs.map((d) => ({
      id: d.id,
      name: d.name,
      reference: d.internalReference,
      confidentiality: d.confidentiality,
      sizeBytes: Number(d.sizeBytes),
      createdAt: d.createdAt.toISOString(),
      status: d.status,
      classificationPrefix: d.classification?.prefix ?? null,
      classificationName: d.classification?.name ?? null,
      category: d.classification?.category ?? null,
      archivalStatus: d.retentionRecord?.archivalStatus ?? null,
      duaEndDate: d.retentionRecord?.duaEndDate.toISOString() ?? null,
    })),
  });
}
