import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { blockStepSchema } from "@/schemas/payment-circuits";

export const dynamic = "force-dynamic";

/**
 * Marque l'étape comme BLOCKED avec un motif et une liste de documents
 * manquants à fournir. Autorisé pour DAF / TENANT_ADMIN ou l'assigné.
 */
export async function POST(
  req: Request,
  { params }: { params: { trackId: string; stepId: string } },
) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  try {
    const data = blockStepSchema.parse(await req.json());

    const track = await prisma.paymentTrack.findFirst({
      where: { id: params.trackId, receivable: { tenantId: session.tenantId } },
      include: {
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

    const step = await prisma.paymentTrackStep.findFirst({
      where: { id: params.stepId, trackId: track.id },
    });
    if (!step) return NextResponse.json({ error: "Étape introuvable" }, { status: 404 });
    if (step.status === "VALIDATED") {
      return NextResponse.json(
        { error: "Étape déjà validée, impossible de bloquer" },
        { status: 409 },
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.paymentTrackStep.update({
        where: { id: step.id },
        data: {
          status: "BLOCKED",
          blockedReason: data.reason,
          blockedSince: new Date(),
          blockedById: session.sub,
        },
      });
      if (data.requiredDocuments.length > 0) {
        await tx.paymentTrackStepDocument.createMany({
          data: data.requiredDocuments.map((label) => ({
            stepId: step.id,
            label,
          })),
        });
      }
    });

    const otherUserId = isAssignee ? track.createdById : track.assignedToId;
    if (otherUserId && otherUserId !== session.sub) {
      await prisma.notification.create({
        data: {
          userId: otherUserId,
          type: "payment_step_blocked",
          title: `Étape bloquée · ${step.label}`,
          body: `${track.receivable.clientName} · ${track.receivable.invoiceRef} · Motif : ${data.reason.slice(0, 120)}`,
          link: "/direction-financiere/recouvrement",
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.sub,
        action: "payment_step.blocked",
        entityType: "PaymentTrackStep",
        entityId: step.id,
        metadata: {
          trackId: track.id,
          stepOrder: step.order,
          stepLabel: step.label,
          receivableId: track.receivable.id,
          requiredDocumentsCount: data.requiredDocuments.length,
        },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
