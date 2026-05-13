import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role, WorkflowStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.ARCHIVIST, Role.DG, Role.TENANT_ADMIN];

interface StepDef {
  stepIndex: number;
  name: string;
  role: string;
  mandatory: boolean;
  slaHours: number;
}

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé Référent documentaire" }, { status: 403 });
  }

  const [templates, instances, completedYtd] = await Promise.all([
    prisma.documentWorkflowTemplate.findMany({
      where: { tenantId: session.tenantId, active: true },
      orderBy: { code: "asc" },
    }),
    prisma.documentWorkflowInstance.findMany({
      where: {
        status: { in: [WorkflowStatus.IN_PROGRESS, WorkflowStatus.OVERDUE] },
        document: { tenantId: session.tenantId },
      },
      include: {
        template: { select: { code: true, name: true, steps: true } },
        document: { select: { name: true, internalReference: true } },
        initiator: { select: { firstName: true, lastName: true } },
        steps: { orderBy: { stepIndex: "asc" }, take: 5 },
      },
      orderBy: { startedAt: "desc" },
      take: 30,
    }),
    prisma.documentWorkflowInstance.count({
      where: {
        document: { tenantId: session.tenantId },
        status: WorkflowStatus.COMPLETED,
        completedAt: { gte: new Date(new Date().getFullYear(), 0, 1) },
      },
    }),
  ]);

  const now = Date.now();
  const enriched = instances.map((i) => {
    const tplSteps = (i.template.steps as unknown as StepDef[]) ?? [];
    const stepDef = tplSteps.find((s) => s.stepIndex === i.currentStep);
    const overdue = i.dueAt ? i.dueAt.getTime() < now : false;
    const daysToDue = i.dueAt ? Math.ceil((i.dueAt.getTime() - now) / 86_400_000) : null;
    return {
      id: i.id,
      reference: i.reference,
      documentName: i.document.name,
      documentReference: i.document.internalReference,
      templateCode: i.template.code,
      templateName: i.template.name,
      status: overdue ? "OVERDUE" : i.status,
      currentStepIndex: i.currentStep,
      currentStepName: stepDef?.name ?? `Étape ${i.currentStep + 1}`,
      currentStepRole: stepDef?.role ?? "—",
      totalSteps: tplSteps.length,
      initiatorName: i.initiator ? `${i.initiator.firstName} ${i.initiator.lastName}` : "—",
      dueAt: i.dueAt?.toISOString() ?? null,
      daysToDue,
      startedAt: i.startedAt.toISOString(),
      stepsHistory: i.steps.map((s) => ({
        stepIndex: s.stepIndex,
        stepName: s.stepName,
        status: s.status,
        decidedAt: s.decidedAt?.toISOString() ?? null,
      })),
      pipeline: tplSteps.map((s, idx) => ({
        stepIndex: s.stepIndex,
        name: s.name,
        role: s.role,
        status:
          idx < i.currentStep ? "DONE" :
          idx === i.currentStep ? (overdue ? "OVERDUE" : "ACTIVE") :
          "PENDING",
      })),
    };
  });

  const overdueCount = enriched.filter((e) => e.status === "OVERDUE").length;
  const avgDelay = enriched.length === 0
    ? 0
    : enriched.reduce((s, e) => s + (now - new Date(e.startedAt).getTime()), 0) / enriched.length / 86_400_000;

  const total = enriched.length + completedYtd;
  const completionRate = total === 0 ? 100 : Math.round((completedYtd / total) * 100);

  // Workflow critique = celui avec daysToDue le plus faible (ou OVERDUE)
  const critical = enriched
    .slice()
    .sort((a, b) => {
      if (a.status === "OVERDUE" && b.status !== "OVERDUE") return -1;
      if (b.status === "OVERDUE" && a.status !== "OVERDUE") return 1;
      return (a.daysToDue ?? 999) - (b.daysToDue ?? 999);
    })[0] ?? null;

  return NextResponse.json({
    kpis: {
      inProgress: enriched.length,
      avgDelayDays: Math.round(avgDelay * 10) / 10,
      overdue: overdueCount,
      completionRate,
      completedYtd,
    },
    critical,
    instances: enriched,
    templates: templates.map((t) => ({
      id: t.id,
      code: t.code,
      name: t.name,
      stepsCount: ((t.steps as unknown as StepDef[]) ?? []).length,
    })),
  });
}
