import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardDtravSiteMutation } from "@/lib/rbac/dtrav-guard";
import { AmendmentStatus } from "@prisma/client";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const a = await prisma.contractAmendment.findUnique({ where: { id: params.id } });
  if (!a) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const guard = await guardDtravSiteMutation(a.siteId);
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  if (a.status !== AmendmentStatus.DRAFT) {
    return NextResponse.json({ error: "Avenant déjà soumis" }, { status: 409 });
  }

  await prisma.contractAmendment.update({
    where: { id: a.id },
    data: { status: AmendmentStatus.N2_PENDING },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId!,
      userId: session.sub,
      action: "dtrav.amendment.submit",
      entityType: "ContractAmendment",
      entityId: a.id,
      metadata: { reference: a.reference },
    },
  });

  return NextResponse.json({ ok: true });
}
