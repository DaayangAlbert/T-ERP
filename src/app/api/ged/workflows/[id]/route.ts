import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardGed } from "@/lib/rbac/ged-guard";

export const dynamic = "force-dynamic";

interface StepDef {
  stepIndex: number;
  name: string;
  role: string;
  mandatory: boolean;
  slaHours: number;
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const guard = await guardGed();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;

  const wf = await prisma.documentWorkflowInstance.findFirst({
    where: { id: params.id, document: { tenantId } },
    select: {
      id: true,
      reference: true,
      status: true,
      currentStep: true,
      startedAt: true,
      dueAt: true,
      completedAt: true,
      template: { select: { id: true, code: true, name: true, description: true, steps: true } },
      document: {
        select: {
          id: true,
          name: true,
          internalReference: true,
          confidentiality: true,
          space: { select: { id: true, name: true, icon: true } },
        },
      },
      initiator: { select: { id: true, firstName: true, lastName: true, role: true } },
      steps: {
        orderBy: { stepIndex: "asc" },
        select: {
          id: true,
          stepIndex: true,
          stepName: true,
          status: true,
          decidedAt: true,
          comment: true,
          assignedTo: { select: { id: true, firstName: true, lastName: true, role: true } },
        },
      },
    },
  });

  if (!wf) {
    return NextResponse.json({ error: "Workflow introuvable" }, { status: 404 });
  }

  const tplSteps = (wf.template.steps as unknown as StepDef[]) ?? [];
  const now = Date.now();
  const overdue = wf.dueAt ? wf.dueAt.getTime() < now : false;
  const daysToDue = wf.dueAt ? Math.ceil((wf.dueAt.getTime() - now) / 86_400_000) : null;

  // Pipeline avec état dynamique
  const pipeline = tplSteps.map((s, idx) => ({
    stepIndex: s.stepIndex,
    name: s.name,
    role: s.role,
    slaHours: s.slaHours,
    status:
      idx < wf.currentStep
        ? "DONE"
        : idx === wf.currentStep
          ? overdue
            ? "OVERDUE"
            : "ACTIVE"
          : "PENDING",
  }));

  return NextResponse.json({
    id: wf.id,
    reference: wf.reference,
    status: wf.status,
    currentStep: wf.currentStep,
    startedAt: wf.startedAt.toISOString(),
    dueAt: wf.dueAt?.toISOString() ?? null,
    completedAt: wf.completedAt?.toISOString() ?? null,
    daysToDue,
    isOverdue: overdue,
    template: {
      id: wf.template.id,
      code: wf.template.code,
      name: wf.template.name,
      description: wf.template.description,
      stepsTotal: tplSteps.length,
    },
    document: wf.document,
    initiator: wf.initiator
      ? { id: wf.initiator.id, name: `${wf.initiator.firstName} ${wf.initiator.lastName}`, role: wf.initiator.role }
      : null,
    pipeline,
    steps: wf.steps.map((s) => ({
      id: s.id,
      index: s.stepIndex,
      name: s.stepName,
      status: s.status,
      decidedAt: s.decidedAt?.toISOString() ?? null,
      comment: s.comment,
      assignedTo: s.assignedTo
        ? {
            id: s.assignedTo.id,
            name: `${s.assignedTo.firstName} ${s.assignedTo.lastName}`,
            role: s.assignedTo.role,
          }
        : null,
    })),
  });
}
