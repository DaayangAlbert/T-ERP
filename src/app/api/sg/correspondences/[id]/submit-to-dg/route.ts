import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardSg } from "@/lib/rbac/sg-guard";
import { CorrespondenceDirection, CorrespondenceStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const guard = await guardSg("canManageOfficialCorrespondence");
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
    return NextResponse.json({ error: "Seuls les courriers sortants peuvent être soumis au DG" }, { status: 400 });
  }
  if (c.status === CorrespondenceStatus.AWAITING_DG_SIGNATURE) {
    return NextResponse.json({ error: "Déjà soumis au DG" }, { status: 409 });
  }
  if (
    c.status === CorrespondenceStatus.SIGNED ||
    c.status === CorrespondenceStatus.SENT ||
    c.status === CorrespondenceStatus.ARCHIVED
  ) {
    return NextResponse.json({ error: `Statut ${c.status} : action impossible` }, { status: 409 });
  }

  await prisma.officialCorrespondence.update({
    where: { id: c.id },
    data: {
      status: CorrespondenceStatus.AWAITING_DG_SIGNATURE,
      submittedToDgAt: new Date(),
      requiresDgSignature: true,
    },
  });

  return NextResponse.json({ ok: true });
}
