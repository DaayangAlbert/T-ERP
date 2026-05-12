import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardGed } from "@/lib/rbac/ged-guard";
import { GedAuditAction, StepStatus, WorkflowStatus } from "@prisma/client";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
  comment: z.string().max(2000).optional(),
});

interface StepDef {
  stepIndex: number;
  name: string;
  role: string;
  slaHours: number;
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const guard = await guardGed();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;
  const userId = session.sub;

  const wf = await prisma.documentWorkflowInstance.findFirst({
    where: { id: params.id, document: { tenantId } },
    select: {
      id: true,
      status: true,
      currentStep: true,
      template: { select: { steps: true } },
      steps: { orderBy: { stepIndex: "asc" }, select: { id: true, stepIndex: true, assignedToId: true } },
    },
  });

  if (!wf) {
    return NextResponse.json({ error: "Workflow introuvable" }, { status: 404 });
  }
  if (wf.status !== WorkflowStatus.IN_PROGRESS && wf.status !== WorkflowStatus.OVERDUE) {
    return NextResponse.json({ error: "Workflow non actif (déjà terminé ou annulé)" }, { status: 409 });
  }

  const currentStepRow = wf.steps.find((s) => s.stepIndex === wf.currentStep);
  if (!currentStepRow) {
    return NextResponse.json({ error: "Étape courante introuvable" }, { status: 500 });
  }

  // L'ARCHIVIST peut décider à la place de n'importe qui (rôle escalade).
  // Sinon : seul l'assigné peut décider sa propre étape.
  const isArchivist = session.role === "ARCHIVIST";
  if (!isArchivist && currentStepRow.assignedToId !== userId) {
    return NextResponse.json(
      { error: "Vous n'êtes pas l'assigné de l'étape courante" },
      { status: 403 },
    );
  }

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const tplSteps = (wf.template.steps as unknown as StepDef[]) ?? [];
    const isLastStep = wf.currentStep >= tplSteps.length - 1;

    if (data.decision === "REJECT") {
      await prisma.$transaction([
        prisma.documentWorkflowStep.update({
          where: { id: currentStepRow.id },
          data: { status: StepStatus.REJECTED, decidedAt: new Date(), comment: data.comment ?? null },
        }),
        prisma.documentWorkflowInstance.update({
          where: { id: wf.id },
          data: { status: WorkflowStatus.REJECTED, completedAt: new Date() },
        }),
        prisma.gedAuditEvent.create({
          data: {
            tenantId,
            actorId: userId,
            action: GedAuditAction.WORKFLOW_DECISION,
            metadata: { workflowId: wf.id, decision: "REJECT", stepIndex: wf.currentStep, comment: data.comment ?? null },
          },
        }),
      ]);
      return NextResponse.json({ ok: true, status: WorkflowStatus.REJECTED });
    }

    // APPROVE — passe à l'étape suivante (ou COMPLETED si dernière)
    if (isLastStep) {
      await prisma.$transaction([
        prisma.documentWorkflowStep.update({
          where: { id: currentStepRow.id },
          data: { status: StepStatus.APPROVED, decidedAt: new Date(), comment: data.comment ?? null },
        }),
        prisma.documentWorkflowInstance.update({
          where: { id: wf.id },
          data: { status: WorkflowStatus.COMPLETED, completedAt: new Date() },
        }),
        prisma.gedAuditEvent.create({
          data: {
            tenantId,
            actorId: userId,
            action: GedAuditAction.WORKFLOW_DECISION,
            metadata: { workflowId: wf.id, decision: "APPROVE", stepIndex: wf.currentStep, final: true },
          },
        }),
      ]);
      return NextResponse.json({ ok: true, status: WorkflowStatus.COMPLETED });
    }

    // Sinon : approuve l'étape, avance
    await prisma.$transaction([
      prisma.documentWorkflowStep.update({
        where: { id: currentStepRow.id },
        data: { status: StepStatus.APPROVED, decidedAt: new Date(), comment: data.comment ?? null },
      }),
      prisma.documentWorkflowInstance.update({
        where: { id: wf.id },
        data: { currentStep: wf.currentStep + 1, status: WorkflowStatus.IN_PROGRESS },
      }),
      prisma.gedAuditEvent.create({
        data: {
          tenantId,
          actorId: userId,
          action: GedAuditAction.WORKFLOW_DECISION,
          metadata: { workflowId: wf.id, decision: "APPROVE", stepIndex: wf.currentStep, nextStep: wf.currentStep + 1 },
        },
      }),
    ]);

    return NextResponse.json({ ok: true, status: WorkflowStatus.IN_PROGRESS, nextStep: wf.currentStep + 1 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Erreur de validation" }, { status: 400 });
  }
}
