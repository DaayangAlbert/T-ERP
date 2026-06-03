import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardSgCorrespondenceMutation } from "@/lib/rbac/sg-guard";
import { CorrespondenceDirection, CorrespondenceStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const guard = await guardSgCorrespondenceMutation();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;

  const c = await prisma.officialCorrespondence.findFirst({
    where: { id: params.id, tenantId },
    select: { id: true, direction: true, status: true, requiresDgSignature: true },
  });
  if (!c) {
    return NextResponse.json({ error: "Courrier introuvable" }, { status: 404 });
  }
  if (c.direction !== CorrespondenceDirection.OUTGOING) {
    return NextResponse.json({ error: "Seuls les sortants peuvent être envoyés" }, { status: 400 });
  }
  if (c.requiresDgSignature && c.status !== CorrespondenceStatus.SIGNED) {
    return NextResponse.json({ error: "Signature DG requise avant envoi" }, { status: 409 });
  }
  if (c.status === CorrespondenceStatus.SENT || c.status === CorrespondenceStatus.ARCHIVED) {
    return NextResponse.json({ error: "Déjà envoyé/archivé" }, { status: 409 });
  }

  await prisma.officialCorrespondence.update({
    where: { id: c.id },
    data: {
      status: CorrespondenceStatus.SENT,
      handledAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
