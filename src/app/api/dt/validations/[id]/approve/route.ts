import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (session.role !== Role.TECH_DIRECTOR && session.role !== Role.TENANT_ADMIN) {
    return NextResponse.json({ error: "Réservé DT" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));

  const validation = await prisma.validation.findFirst({
    where: { id: params.id, tenantId: session.tenantId },
  });
  if (!validation) {
    return NextResponse.json({ error: "Validation introuvable" }, { status: 404 });
  }

  // Marquer l'étape DT comme validée et passer en N3 DG
  const wf = (validation.workflow as { steps: Array<{ key: string; status: string; decidedBy?: string; decidedAt?: string }> }) ?? { steps: [] };
  for (const step of wf.steps) {
    if (step.key === "dt" && step.status === "pending") {
      step.status = "approved";
      step.decidedBy = session.sub;
      step.decidedAt = new Date().toISOString();
    } else if (step.key === "dg" && step.status === "waiting") {
      step.status = "pending";
    }
  }

  // Trouver le DG pour pousser le currentApprover
  const dg = await prisma.user.findFirst({
    where: { tenantId: session.tenantId, role: Role.DG, status: "ACTIVE" },
    select: { id: true },
  });

  await prisma.validation.update({
    where: { id: params.id },
    data: {
      dtValidatedAt: new Date(),
      dtValidatedBy: session.sub,
      dtComments: body.comments ?? null,
      currentStep: "DG",
      currentApproverId: dg?.id ?? null,
      workflow: wf as object,
    },
  });

  return NextResponse.json({ ok: true });
}
