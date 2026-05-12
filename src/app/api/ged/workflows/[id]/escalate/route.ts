import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardGed } from "@/lib/rbac/ged-guard";
import { GedAuditAction, Role, WorkflowStatus } from "@prisma/client";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  message: z.string().max(1000).optional(),
});

// Escalade manuelle — réservée ARCHIVIST.
// Crée une notification au manager de l'assigné (ou au DG si pas de manager)
// et journalise l'événement audit. L'instance reste en l'état (pas de changement
// de currentStep).
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const guard = await guardGed();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;
  const userId = session.sub;

  if (session.role !== Role.ARCHIVIST && session.role !== Role.TENANT_ADMIN) {
    return NextResponse.json({ error: "Escalade réservée à l'ARCHIVIST" }, { status: 403 });
  }

  const wf = await prisma.documentWorkflowInstance.findFirst({
    where: { id: params.id, document: { tenantId } },
    select: {
      id: true,
      reference: true,
      status: true,
      currentStep: true,
      document: { select: { name: true } },
      steps: {
        where: { stepIndex: { equals: 0 } },
        take: 1,
        orderBy: { stepIndex: "asc" },
        select: { id: true, assignedToId: true, assignedTo: { select: { firstName: true, lastName: true } } },
      },
    },
  });
  if (!wf) {
    return NextResponse.json({ error: "Workflow introuvable" }, { status: 404 });
  }
  if (wf.status === WorkflowStatus.COMPLETED || wf.status === WorkflowStatus.CANCELLED || wf.status === WorkflowStatus.REJECTED) {
    return NextResponse.json({ error: "Workflow déjà terminé" }, { status: 409 });
  }

  // Récupère l'étape courante (pas la 0)
  const currentStep = await prisma.documentWorkflowStep.findFirst({
    where: { instanceId: wf.id, stepIndex: wf.currentStep },
    select: { id: true, assignedToId: true, assignedTo: { select: { id: true, firstName: true, lastName: true } } },
  });

  try {
    const body = await req.json().catch(() => ({}));
    const data = schema.parse(body);

    const operations: any[] = [
      prisma.gedAuditEvent.create({
        data: {
          tenantId,
          actorId: userId,
          action: GedAuditAction.MODIFICATION,
          metadata: {
            kind: "ESCALATION",
            workflowId: wf.id,
            reference: wf.reference,
            currentStep: wf.currentStep,
            assignedToId: currentStep?.assignedToId ?? null,
            message: data.message ?? "Relance manuelle ARCHIVIST",
          },
        },
      }),
    ];

    if (currentStep?.assignedToId) {
      operations.push(
        prisma.notification.create({
          data: {
            userId: currentStep.assignedToId,
            type: "workflow_escalation",
            title: `Relance workflow ${wf.reference}`,
            body:
              data.message ??
              `L'ARCHIVIST vous relance sur le workflow ${wf.reference} (${wf.document.name}). Merci de décider l'étape ${wf.currentStep + 1}.`,
            link: `/ged/workflows?wf=${wf.id}`,
          },
        }),
      );
    }

    // Si le workflow est OVERDUE et currentStep dépassé, on marque le status OVERDUE
    if (wf.status === WorkflowStatus.IN_PROGRESS) {
      operations.push(
        prisma.documentWorkflowInstance.update({
          where: { id: wf.id },
          data: { status: WorkflowStatus.OVERDUE },
        }),
      );
    }

    await prisma.$transaction(operations);

    return NextResponse.json({
      ok: true,
      notifiedUserId: currentStep?.assignedToId ?? null,
      notifiedUserName: currentStep?.assignedTo
        ? `${currentStep.assignedTo.firstName} ${currentStep.assignedTo.lastName}`
        : null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Erreur de validation" }, { status: 400 });
  }
}
