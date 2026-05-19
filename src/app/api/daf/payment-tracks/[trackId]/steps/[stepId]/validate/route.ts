import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { paymentTrackLinkForUser } from "@/lib/notifications/payment-track-link";

export const dynamic = "force-dynamic";

/**
 * Valide une étape du track : passe l'étape en VALIDATED,
 * et la suivante (par ordre) passe en IN_PROGRESS. Si c'était la dernière,
 * le track est marqué completedAt.
 *
 * Autorisation : DAF / TENANT_ADMIN OU l'utilisateur assigné au track.
 */
export async function POST(
  _req: Request,
  { params }: { params: { trackId: string; stepId: string } },
) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const track = await prisma.paymentTrack.findFirst({
    where: { id: params.trackId, receivable: { tenantId: session.tenantId } },
    include: {
      steps: { orderBy: { order: "asc" } },
      receivable: { select: { id: true, clientName: true, invoiceRef: true } },
      template: { select: { name: true } },
    },
  });
  if (!track) return NextResponse.json({ error: "Track introuvable" }, { status: 404 });

  const isDafOrAdmin = session.role === Role.DAF || session.role === Role.TENANT_ADMIN;
  const isAssignee = track.assignedToId === session.sub;
  if (!isDafOrAdmin && !isAssignee) {
    return NextResponse.json({ error: "Réservé DAF ou personne assignée" }, { status: 403 });
  }

  const step = track.steps.find((s) => s.id === params.stepId);
  if (!step) return NextResponse.json({ error: "Étape introuvable" }, { status: 404 });
  if (step.status === "VALIDATED") {
    return NextResponse.json({ error: "Étape déjà validée" }, { status: 409 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.paymentTrackStep.update({
      where: { id: step.id },
      data: {
        status: "VALIDATED",
        validatedAt: new Date(),
        validatedById: session.sub,
        // Si elle était bloquée, on libère.
        blockedReason: null,
        blockedSince: null,
        blockedById: null,
      },
    });

    // Étape suivante : passe à IN_PROGRESS si PENDING.
    const next = track.steps.find((s) => s.order === step.order + 1);
    if (next && next.status === "PENDING") {
      await tx.paymentTrackStep.update({
        where: { id: next.id },
        data: { status: "IN_PROGRESS" },
      });
    } else if (!next) {
      // Dernière étape : marquer le track comme terminé.
      await tx.paymentTrack.update({
        where: { id: track.id },
        data: { completedAt: new Date() },
      });
    }
  });

  // Notifier l'autre partie (si validateur = assigné, on prévient le DAF
  // qui a créé le track ; si validateur = DAF, on prévient l'assigné).
  const otherUserId = isAssignee ? track.createdById : track.assignedToId;
  if (otherUserId && otherUserId !== session.sub) {
    const link = await paymentTrackLinkForUser(otherUserId);
    await prisma.notification.create({
      data: {
        userId: otherUserId,
        type: "payment_step_validated",
        title: `Étape franchie · ${step.label}`,
        body: `${track.receivable.clientName} · ${track.receivable.invoiceRef} · ${track.template.name}`,
        link,
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userId: session.sub,
      action: "payment_step.validated",
      entityType: "PaymentTrackStep",
      entityId: step.id,
      metadata: {
        trackId: track.id,
        stepOrder: step.order,
        stepLabel: step.label,
        receivableId: track.receivable.id,
      },
    },
  });

  return NextResponse.json({ ok: true });
}
