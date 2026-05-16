import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Lève le blocage d'une étape : repasse à IN_PROGRESS.
 * Conserve les documents demandés (historique).
 */
export async function POST(
  _req: Request,
  { params }: { params: { trackId: string; stepId: string } },
) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const track = await prisma.paymentTrack.findFirst({
    where: { id: params.trackId, receivable: { tenantId: session.tenantId } },
  });
  if (!track) return NextResponse.json({ error: "Track introuvable" }, { status: 404 });

  const isDafOrAdmin = session.role === Role.DAF || session.role === Role.TENANT_ADMIN;
  const isAssignee = track.assignedToId === session.sub;
  if (!isDafOrAdmin && !isAssignee) {
    return NextResponse.json({ error: "Réservé DAF ou personne assignée" }, { status: 403 });
  }

  const step = await prisma.paymentTrackStep.findFirst({
    where: { id: params.stepId, trackId: track.id },
  });
  if (!step) return NextResponse.json({ error: "Étape introuvable" }, { status: 404 });
  if (step.status !== "BLOCKED") {
    return NextResponse.json({ error: "Étape non bloquée" }, { status: 409 });
  }

  await prisma.paymentTrackStep.update({
    where: { id: step.id },
    data: {
      status: "IN_PROGRESS",
      blockedReason: null,
      blockedSince: null,
      blockedById: null,
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userId: session.sub,
      action: "payment_step.unblocked",
      entityType: "PaymentTrackStep",
      entityId: step.id,
      metadata: { trackId: track.id, stepOrder: step.order, stepLabel: step.label },
    },
  });

  return NextResponse.json({ ok: true });
}
