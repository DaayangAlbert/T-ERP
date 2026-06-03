import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardSgCorrespondenceMutation } from "@/lib/rbac/sg-guard";
import { CorrespondenceStatus, GedAuditAction } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const guard = await guardSgCorrespondenceMutation();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;

  const c = await prisma.officialCorrespondence.findFirst({
    where: { id: params.id, tenantId },
    select: { id: true, reference: true, status: true, direction: true },
  });
  if (!c) {
    return NextResponse.json({ error: "Courrier introuvable" }, { status: 404 });
  }
  if (c.status === CorrespondenceStatus.ARCHIVED) {
    return NextResponse.json({ error: "Déjà archivé" }, { status: 409 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.officialCorrespondence.update({
      where: { id: c.id },
      data: {
        status: CorrespondenceStatus.ARCHIVED,
        archivedInGedAt: new Date(),
        handledAt: new Date(),
      },
    });
    await tx.gedAuditEvent.create({
      data: {
        tenantId,
        actorId: session.sub,
        action: GedAuditAction.IMPORT,
        metadata: {
          kind: "CORRESPONDENCE_ARCHIVED",
          correspondenceId: c.id,
          reference: c.reference,
          direction: c.direction,
        },
      },
    });
  });

  return NextResponse.json({ ok: true });
}
