import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardOuv } from "@/lib/rbac/ouv-guard";
import { attestationTypeLabel, type OuvAttestationType } from "@/schemas/ouv-attestation";
import { AttestationStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

// GET /api/ouv/attestations/:id — Détail (utile pour récupérer documentUrl)
export async function GET(_req: Request, ctx: { params: { id: string } }) {
  const guard = guardOuv();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const a = await prisma.attestationRequest.findFirst({
    where: { id: ctx.params.id, userId: session.sub },
    select: {
      id: true,
      type: true,
      purpose: true,
      status: true,
      preparedBy: { select: { firstName: true, lastName: true } },
      preparedAt: true,
      documentUrl: true,
      expectedReadyAt: true,
      rejectionReason: true,
      deliveredAt: true,
      createdAt: true,
    },
  });
  if (!a) return NextResponse.json({ error: "Attestation introuvable" }, { status: 404 });

  return NextResponse.json({
    id: a.id,
    type: a.type,
    typeLabel: attestationTypeLabel(a.type as OuvAttestationType),
    purpose: a.purpose,
    status: a.status,
    preparedByName: a.preparedBy ? `${a.preparedBy.firstName} ${a.preparedBy.lastName}` : null,
    preparedAt: a.preparedAt?.toISOString() ?? null,
    documentUrl: a.documentUrl,
    expectedReadyAt: a.expectedReadyAt?.toISOString() ?? null,
    rejectionReason: a.rejectionReason,
    deliveredAt: a.deliveredAt?.toISOString() ?? null,
    createdAt: a.createdAt.toISOString(),
  });
}

// DELETE /api/ouv/attestations/:id — Annulation tant que PENDING
export async function DELETE(_req: Request, ctx: { params: { id: string } }) {
  const guard = guardOuv();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const a = await prisma.attestationRequest.findFirst({
    where: { id: ctx.params.id, userId: session.sub },
    select: { id: true, status: true },
  });
  if (!a) return NextResponse.json({ error: "Attestation introuvable" }, { status: 404 });
  if (a.status !== AttestationStatus.PENDING) {
    return NextResponse.json(
      { error: "Annulation possible uniquement si en attente", code: "CANNOT_CANCEL" },
      { status: 409 }
    );
  }

  await prisma.attestationRequest.update({
    where: { id: a.id },
    data: { status: AttestationStatus.CANCELLED },
  });

  return NextResponse.json({ ok: true });
}
