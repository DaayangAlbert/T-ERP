import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardGedMutation } from "@/lib/rbac/ged-guard";
import { ArchivalStatus, GedAuditAction, Role } from "@prisma/client";

export const dynamic = "force-dynamic";

// Job mensuel de transition archivage :
//  - documents ACTIVE dont la création > 2 ans → SEMI_ACTIVE
//  - documents SEMI_ACTIVE dont la duaEndDate est dépassée et !legalHold → PENDING_DESTRUCTION
//  - retourne les compteurs et un résumé.
// Réservé ARCHIVIST/TENANT_ADMIN.
export async function POST() {
  const guard = await guardGedMutation();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;
  const userId = session.sub;

  if (session.role !== Role.ARCHIVIST && session.role !== Role.TENANT_ADMIN) {
    return NextResponse.json({ error: "Réservé ARCHIVIST" }, { status: 403 });
  }

  const now = new Date();
  const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());

  // Bascule ACTIVE → SEMI_ACTIVE pour les docs > 2 ans
  const toSemi = await prisma.documentRetentionRecord.findMany({
    where: {
      archivalStatus: ArchivalStatus.ACTIVE,
      document: { tenantId, createdAt: { lt: twoYearsAgo } },
    },
    select: { id: true },
  });

  // Bascule SEMI_ACTIVE → PENDING_DESTRUCTION pour les docs en fin de DUA et sans legalHold
  const toDestroy = await prisma.documentRetentionRecord.findMany({
    where: {
      archivalStatus: { in: [ArchivalStatus.SEMI_ACTIVE, ArchivalStatus.ACTIVE] },
      document: { tenantId },
      legalHold: false,
      duaEndDate: { lt: now },
    },
    select: { id: true, document: { select: { id: true, name: true } } },
  });

  const ops: any[] = [];
  if (toSemi.length > 0) {
    ops.push(
      prisma.documentRetentionRecord.updateMany({
        where: { id: { in: toSemi.map((r) => r.id) } },
        data: { archivalStatus: ArchivalStatus.SEMI_ACTIVE },
      }),
    );
  }
  if (toDestroy.length > 0) {
    ops.push(
      prisma.documentRetentionRecord.updateMany({
        where: { id: { in: toDestroy.map((r) => r.id) } },
        data: { archivalStatus: ArchivalStatus.PENDING_DESTRUCTION },
      }),
    );
  }
  ops.push(
    prisma.gedAuditEvent.create({
      data: {
        tenantId,
        actorId: userId,
        action: GedAuditAction.MODIFICATION,
        metadata: {
          kind: "ARCHIVAL_AUTO_PROCESS",
          movedToSemiActive: toSemi.length,
          movedToPendingDestruction: toDestroy.length,
          executedAt: now.toISOString(),
        },
      },
    }),
  );

  if (ops.length > 0) await prisma.$transaction(ops);

  return NextResponse.json({
    ok: true,
    summary: {
      movedToSemiActive: toSemi.length,
      movedToPendingDestruction: toDestroy.length,
      executedAt: now.toISOString(),
    },
  });
}
