import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardGedMutation } from "@/lib/rbac/ged-guard";
import { GedAuditAction, Role } from "@prisma/client";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  reason: z.string().min(3).max(2000),
});

// Met une classification en obsolète (soft-delete) :
//  - active: false → invisible dans la nomenclature courante
//  - documents existants conservent leur classificationId mais ne pourront plus en créer de nouveaux
//  - audité avec raison
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const guard = await guardGedMutation();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;
  const userId = session.sub;

  if (session.role !== Role.ARCHIVIST && session.role !== Role.TENANT_ADMIN) {
    return NextResponse.json({ error: "Réservé ARCHIVIST" }, { status: 403 });
  }

  const cls = await prisma.documentClassification.findFirst({
    where: { id: params.id, tenantId },
    select: { id: true, prefix: true, name: true, active: true },
  });
  if (!cls) {
    return NextResponse.json({ error: "Classification introuvable" }, { status: 404 });
  }
  if (!cls.active) {
    return NextResponse.json({ error: "Déjà obsolète" }, { status: 409 });
  }

  try {
    const body = await req.json();
    const data = schema.parse(body);

    // Compte les documents existants (info pour l'utilisateur)
    const linkedDocs = await prisma.document.count({
      where: { tenantId, classificationId: cls.id },
    });

    await prisma.$transaction([
      prisma.documentClassification.update({
        where: { id: cls.id },
        data: { active: false },
      }),
      prisma.gedAuditEvent.create({
        data: {
          tenantId,
          actorId: userId,
          action: GedAuditAction.MODIFICATION,
          metadata: {
            kind: "DEPRECATE_CLASSIFICATION",
            classificationId: cls.id,
            prefix: cls.prefix,
            name: cls.name,
            reason: data.reason,
            documentsKept: linkedDocs,
          },
        },
      }),
    ]);

    return NextResponse.json({ ok: true, documentsKept: linkedDocs });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Erreur de validation" }, { status: 400 });
  }
}
