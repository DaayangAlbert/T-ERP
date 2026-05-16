import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardGedMutation } from "@/lib/rbac/ged-guard";
import { GedAuditAction, Role } from "@prisma/client";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  documentId: z.string().cuid(),
  hold: z.boolean(),
  reason: z.string().min(3).max(2000),
});

// Pose / lève un gel légal sur un document.
// - hold:true → empêche destruction (contentieux, audit fiscal, expertise...)
// - hold:false → libère
// Crée le retentionRecord s'il n'existait pas (avec une duaEndDate par défaut à 99 ans).
export async function POST(req: Request) {
  const guard = await guardGedMutation();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;
  const userId = session.sub;

  if (session.role !== Role.ARCHIVIST && session.role !== Role.DG && session.role !== Role.TENANT_ADMIN) {
    return NextResponse.json({ error: "Réservé ARCHIVIST / DG" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const doc = await prisma.document.findFirst({
      where: { id: data.documentId, tenantId },
      select: { id: true, name: true, retentionRecord: { select: { id: true, legalHold: true } } },
    });
    if (!doc) {
      return NextResponse.json({ error: "Document introuvable" }, { status: 404 });
    }

    const ops: any[] = [];
    if (doc.retentionRecord) {
      ops.push(
        prisma.documentRetentionRecord.update({
          where: { id: doc.retentionRecord.id },
          data: { legalHold: data.hold },
        }),
      );
    } else {
      const farFuture = new Date();
      farFuture.setFullYear(farFuture.getFullYear() + 99);
      ops.push(
        prisma.documentRetentionRecord.create({
          data: {
            documentId: doc.id,
            duaEndDate: farFuture,
            archivalStatus: "ACTIVE",
            legalHold: data.hold,
          },
        }),
      );
    }
    ops.push(
      prisma.gedAuditEvent.create({
        data: {
          tenantId,
          actorId: userId,
          action: GedAuditAction.MODIFICATION,
          documentId: doc.id,
          metadata: {
            kind: "LEGAL_HOLD",
            hold: data.hold,
            reason: data.reason,
            documentName: doc.name,
          },
        },
      }),
    );

    await prisma.$transaction(ops);
    return NextResponse.json({ ok: true, documentId: doc.id, hold: data.hold });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Erreur de validation" }, { status: 400 });
  }
}
