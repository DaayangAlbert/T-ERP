import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = getCurrentSession();
  if (!session?.tenantId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (session.role !== Role.TECH_DIRECTOR && session.role !== Role.TENANT_ADMIN) {
    return NextResponse.json({ error: "Réservé DT" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: "Aucun dossier sélectionné" }, { status: 400 });
  }

  const dg = await prisma.user.findFirst({
    where: { tenantId: session.tenantId, role: Role.DG, status: "ACTIVE" },
    select: { id: true },
  });

  const validations = await prisma.validation.findMany({
    where: {
      id: { in: ids },
      tenantId: session.tenantId,
      dtValidationRequired: true,
      currentStep: "DT",
    },
  });

  let count = 0;
  for (const validation of validations) {
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
    await prisma.validation.update({
      where: { id: validation.id },
      data: {
        dtValidatedAt: new Date(),
        dtValidatedBy: session.sub,
        currentStep: "DG",
        currentApproverId: dg?.id ?? null,
        workflow: wf as object,
      },
    });
    count++;
  }

  return NextResponse.json({ ok: true, count });
}
