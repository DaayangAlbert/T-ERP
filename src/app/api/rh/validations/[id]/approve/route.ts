import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.HR, Role.TENANT_ADMIN];

interface WorkflowStep {
  key?: string;
  role?: string;
  status?: string;
  decidedBy?: string;
  decidedAt?: string;
}

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Validation N1 RH" }, { status: 403 });
  }

  const v = await prisma.validation.findFirst({
    where: { id: params.id, tenantId: session.tenantId, currentStep: "RH" },
  });
  if (!v) return NextResponse.json({ error: "Validation introuvable ou pas à l'étape RH" }, { status: 404 });

  const workflow = (v.workflow ?? {}) as { steps?: WorkflowStep[] };
  const steps = (workflow.steps ?? []).slice();
  const rhStepIdx = steps.findIndex((s) => (s.key ?? s.role) === "RH");
  if (rhStepIdx === -1) return NextResponse.json({ error: "Étape RH manquante" }, { status: 400 });
  steps[rhStepIdx] = { ...steps[rhStepIdx], status: "APPROVED", decidedBy: session.sub, decidedAt: new Date().toISOString() };

  // Trouver l'étape suivante non APPROVED
  const nextStep = steps.find((s, i) => i > rhStepIdx && s.status !== "APPROVED");
  const nextStepKey = nextStep ? (nextStep.key ?? nextStep.role ?? null) : null;
  const allApproved = !nextStepKey;

  await prisma.validation.update({
    where: { id: v.id },
    data: {
      workflow: { steps } as object,
      currentStep: nextStepKey ?? v.currentStep,
      status: allApproved ? "APPROVED" : "PENDING",
      decidedById: allApproved ? session.sub : null,
      decisionAt: allApproved ? new Date() : null,
    },
  });

  return NextResponse.json({ ok: true, nextStep: nextStepKey, finalApproval: allApproved });
}
