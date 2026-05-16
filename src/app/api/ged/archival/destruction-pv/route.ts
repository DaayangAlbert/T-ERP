import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardGedMutation } from "@/lib/rbac/ged-guard";
import { ArchivalStatus, GedAuditAction, Role } from "@prisma/client";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  applyDestruction: z.boolean().default(false), // false = simulation/preview, true = exécute
});

// Génère un PV de destruction mensuel.
//  - liste les documents PENDING_DESTRUCTION (sans legalHold)
//  - retourne un payload structuré (PDF côté client à partir de là)
//  - si applyDestruction=true, marque DESTROYED + horodate
// Réservé ARCHIVIST avec contre-signature DG (logiquement) — ici on autorise
// ARCHIVIST seul (le DG signe le PDF côté UI/process humain).
export async function POST(req: Request) {
  const guard = await guardGedMutation();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;
  const userId = session.sub;

  if (session.role !== Role.ARCHIVIST && session.role !== Role.TENANT_ADMIN) {
    return NextResponse.json({ error: "Réservé ARCHIVIST" }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const data = schema.parse(body);

    const candidates = await prisma.documentRetentionRecord.findMany({
      where: {
        archivalStatus: ArchivalStatus.PENDING_DESTRUCTION,
        legalHold: false,
        document: { tenantId },
      },
      select: {
        id: true,
        duaEndDate: true,
        document: {
          select: {
            id: true,
            name: true,
            internalReference: true,
            sizeBytes: true,
            createdAt: true,
            classification: { select: { prefix: true, name: true, dua: true } },
            space: { select: { name: true } },
          },
        },
      },
      orderBy: { duaEndDate: "asc" },
    });

    const pvReference = `PV-DEST-${new Date().toISOString().slice(0, 7)}`;
    const totalSize = candidates.reduce((s, c) => s + Number(c.document.sizeBytes), 0);

    const pvPayload = {
      reference: pvReference,
      generatedAt: new Date().toISOString(),
      generatedBy: userId,
      tenantId,
      totalDocuments: candidates.length,
      totalSizeBytes: totalSize,
      requiresSignatures: ["ARCHIVIST", "DG"],
      documents: candidates.map((c) => ({
        id: c.document.id,
        name: c.document.name,
        reference: c.document.internalReference,
        classificationPrefix: c.document.classification?.prefix ?? null,
        classificationName: c.document.classification?.name ?? null,
        dua: c.document.classification?.dua ?? null,
        spaceName: c.document.space?.name ?? null,
        createdAt: c.document.createdAt.toISOString(),
        duaEndDate: c.duaEndDate.toISOString(),
        sizeBytes: Number(c.document.sizeBytes),
      })),
    };

    if (data.applyDestruction && candidates.length > 0) {
      await prisma.$transaction([
        prisma.documentRetentionRecord.updateMany({
          where: { id: { in: candidates.map((c) => c.id) } },
          data: {
            archivalStatus: ArchivalStatus.DESTROYED,
            destroyedAt: new Date(),
            destructionPv: pvReference,
          },
        }),
        prisma.gedAuditEvent.create({
          data: {
            tenantId,
            actorId: userId,
            action: GedAuditAction.DELETION,
            metadata: {
              kind: "DESTRUCTION_PV",
              pvReference,
              totalDocuments: candidates.length,
              totalSizeBytes: totalSize,
            },
          },
        }),
      ]);
    } else {
      // Audit même en preview pour traçabilité
      await prisma.gedAuditEvent.create({
        data: {
          tenantId,
          actorId: userId,
          action: GedAuditAction.MODIFICATION,
          metadata: {
            kind: "DESTRUCTION_PV_PREVIEW",
            pvReference,
            totalDocuments: candidates.length,
          },
        },
      });
    }

    return NextResponse.json({
      pv: pvPayload,
      executed: data.applyDestruction && candidates.length > 0,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Erreur de validation" }, { status: 400 });
  }
}
