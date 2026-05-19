import { NextResponse } from "next/server";
import { z } from "zod";
import { GedAuditAction, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { guardGedMutation } from "@/lib/rbac/ged-guard";

export const dynamic = "force-dynamic";

const MAX_IDS = 100;

const schema = z
  .object({
    documentIds: z.array(z.string().cuid()).min(1).max(MAX_IDS),
    spaceId: z.string().cuid().nullable().optional(),
    classificationId: z.string().cuid().nullable().optional(),
    folder: z.string().max(200).nullable().optional(),
  })
  .refine(
    (d) =>
      d.spaceId !== undefined || d.classificationId !== undefined || d.folder !== undefined,
    {
      message: "Au moins un champ (spaceId, classificationId, folder) requis",
    },
  );

/**
 * POST /api/ged/documents/bulk-classify
 *
 * Déplace/classe en masse plusieurs documents. Réservé ARCHIVIST / TENANT_ADMIN.
 *
 * Body :
 *   {
 *     documentIds: string[]   // 1 à 100 ids
 *     spaceId?: string|null   // espace cible (null pour retirer)
 *     classificationId?: string|null
 *     folder?: string|null    // chemin virtuel libre
 *   }
 *
 * Effets :
 *   - update many sur tous les documents (filtre tenantId + ids fournis)
 *   - 1 GedAuditEvent par document (MODIFICATION kind=BULK_CLASSIFY)
 */
export async function POST(req: Request) {
  const guard = await guardGedMutation();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;
  const userId = session.sub;

  if (session.role !== Role.ARCHIVIST && session.role !== Role.TENANT_ADMIN) {
    return NextResponse.json({ error: "Réservé ARCHIVIST" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { documentIds, spaceId, classificationId, folder } = parsed.data;

  if (spaceId) {
    const space = await prisma.documentSpace.findFirst({
      where: { id: spaceId, tenantId },
      select: { id: true },
    });
    if (!space) return NextResponse.json({ error: "Espace introuvable" }, { status: 400 });
  }

  if (classificationId) {
    const classif = await prisma.documentClassification.findFirst({
      where: { id: classificationId, tenantId, active: true },
      select: { id: true },
    });
    if (!classif)
      return NextResponse.json(
        { error: "Classification introuvable ou inactive" },
        { status: 400 },
      );
  }

  const existing = await prisma.document.findMany({
    where: { id: { in: documentIds }, tenantId },
    select: { id: true, spaceId: true, classificationId: true, folder: true },
  });
  const existingIds = new Set(existing.map((d) => d.id));
  const skipped = documentIds.filter((id) => !existingIds.has(id));

  if (existing.length === 0) {
    return NextResponse.json(
      { error: "Aucun document accessible parmi les ids fournis" },
      { status: 404 },
    );
  }

  const updateData: Record<string, unknown> = {};
  if (spaceId !== undefined) updateData.spaceId = spaceId;
  if (classificationId !== undefined) updateData.classificationId = classificationId;
  if (folder !== undefined) updateData.folder = folder;

  await prisma.$transaction(async (tx) => {
    await tx.document.updateMany({
      where: { id: { in: Array.from(existingIds) }, tenantId },
      data: updateData,
    });

    await tx.gedAuditEvent.createMany({
      data: existing.map((d) => ({
        tenantId,
        actorId: userId,
        action: GedAuditAction.MODIFICATION,
        documentId: d.id,
        spaceId: spaceId ?? d.spaceId ?? null,
        metadata: {
          kind: "BULK_CLASSIFY",
          previousSpaceId: d.spaceId,
          newSpaceId: spaceId === undefined ? d.spaceId : spaceId,
          previousClassificationId: d.classificationId,
          newClassificationId: classificationId === undefined ? d.classificationId : classificationId,
          previousFolder: d.folder,
          newFolder: folder === undefined ? d.folder : folder,
        },
      })),
    });
  });

  return NextResponse.json({
    ok: true,
    updated: existing.length,
    skipped: skipped.length,
    skippedIds: skipped,
  });
}
