import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardGedMutation } from "@/lib/rbac/ged-guard";
import { GedAuditAction, Role } from "@prisma/client";
import { z } from "zod";
import { computeDuaEndDate, nextInternalReference } from "@/lib/ged/auto-classify";

export const dynamic = "force-dynamic";

const schema = z.object({
  classificationId: z.string().cuid(),
  spaceId: z.string().cuid().nullable().optional(),
  notes: z.string().max(1000).optional(),
});

/**
 * PATCH /api/ged/documents/[id]/classify
 *
 * Classification manuelle d'un document (utile pour les documents importés
 * sans classification détectée, ou pour requalifier un document mal classé).
 *
 * Effets :
 *   - Met à jour `classificationId` (+ optionnellement `spaceId`)
 *   - Génère une nouvelle `internalReference` si elle était nulle
 *   - Recalcule `duaEndDate` du `DocumentRetentionRecord` (en respectant la
 *     nouvelle DUA de la classification)
 *   - Émet un `GedAuditEvent action=MODIFICATION kind=RECLASSIFY`
 *
 * Réservé ARCHIVIST / TENANT_ADMIN.
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const guard = await guardGedMutation();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;
  const userId = session.sub;

  if (session.role !== Role.ARCHIVIST && session.role !== Role.TENANT_ADMIN) {
    return NextResponse.json({ error: "Réservé ARCHIVIST" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation", issues: parsed.error.flatten() }, { status: 400 });
  }
  const { classificationId, spaceId: rawSpaceId, notes } = parsed.data;

  const doc = await prisma.document.findFirst({
    where: { id: params.id, tenantId },
    select: {
      id: true,
      name: true,
      siteId: true,
      classificationId: true,
      spaceId: true,
      internalReference: true,
      createdAt: true,
      retentionRecord: { select: { id: true } },
    },
  });
  if (!doc) {
    return NextResponse.json({ error: "Document introuvable" }, { status: 404 });
  }

  const newClassif = await prisma.documentClassification.findFirst({
    where: { id: classificationId, tenantId, active: true },
    select: { id: true, prefix: true, duaYears: true, duaTrigger: true },
  });
  if (!newClassif) {
    return NextResponse.json({ error: "Classification introuvable ou inactive" }, { status: 400 });
  }

  // Si le nouveau spaceId est fourni, vérifier qu'il appartient au tenant
  let validatedSpaceId: string | null | undefined = rawSpaceId;
  if (rawSpaceId) {
    const sp = await prisma.documentSpace.findFirst({
      where: { id: rawSpaceId, tenantId },
      select: { id: true },
    });
    if (!sp) {
      return NextResponse.json({ error: "Espace introuvable" }, { status: 400 });
    }
  }

  // Référence interne : on en attribue une si elle était nulle
  const internalReference =
    doc.internalReference ?? (await nextInternalReference(tenantId, newClassif.prefix));

  // Recalcul DUA
  const newDuaEnd = await computeDuaEndDate(
    doc.createdAt,
    newClassif.duaYears,
    newClassif.duaTrigger,
    doc.siteId,
  );

  await prisma.$transaction(async (tx) => {
    await tx.document.update({
      where: { id: doc.id },
      data: {
        classificationId,
        ...(validatedSpaceId !== undefined ? { spaceId: validatedSpaceId } : {}),
        ...(doc.internalReference ? {} : { internalReference }),
      },
    });

    // Mise à jour du retention record (créé si manquant — cas legacy)
    if (doc.retentionRecord) {
      await tx.documentRetentionRecord.update({
        where: { id: doc.retentionRecord.id },
        data: { duaEndDate: newDuaEnd },
      });
    } else {
      await tx.documentRetentionRecord.create({
        data: {
          documentId: doc.id,
          duaEndDate: newDuaEnd,
          archivalStatus: "ACTIVE",
          legalHold: false,
        },
      });
    }

    await tx.gedAuditEvent.create({
      data: {
        tenantId,
        actorId: userId,
        action: GedAuditAction.MODIFICATION,
        documentId: doc.id,
        spaceId: validatedSpaceId ?? doc.spaceId ?? null,
        metadata: {
          kind: "RECLASSIFY",
          previousClassificationId: doc.classificationId,
          newClassificationId: classificationId,
          previousSpaceId: doc.spaceId,
          newSpaceId: validatedSpaceId ?? doc.spaceId ?? null,
          newInternalReference: internalReference,
          newDuaEndDate: newDuaEnd.toISOString(),
          notes: notes ?? null,
        },
      },
    });
  });

  return NextResponse.json({
    ok: true,
    internalReference,
    duaEndDate: newDuaEnd.toISOString(),
  });
}
