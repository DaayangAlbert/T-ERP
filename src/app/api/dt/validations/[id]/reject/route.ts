import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role, ValidationStatus } from "@prisma/client";

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
  if (!body.reason) {
    return NextResponse.json({ error: "Motif obligatoire" }, { status: 400 });
  }

  const validation = await prisma.validation.findUnique({ where: { id: params.id } });
  if (!validation) {
    return NextResponse.json({ error: "Validation introuvable" }, { status: 404 });
  }

  const wf = (validation.workflow as { steps: Array<{ key: string; status: string; decidedBy?: string; decidedAt?: string }> }) ?? { steps: [] };
  for (const step of wf.steps) {
    if (step.key === "dt" && step.status === "pending") {
      step.status = "rejected";
      step.decidedBy = session.sub;
      step.decidedAt = new Date().toISOString();
    }
  }

  await prisma.validation.update({
    where: { id: params.id },
    data: {
      status: ValidationStatus.REJECTED,
      decidedById: session.sub,
      decisionAt: new Date(),
      decisionReason: body.reason,
      dtValidatedAt: new Date(),
      dtValidatedBy: session.sub,
      workflow: wf as object,
    },
  });

  return NextResponse.json({ ok: true });
}
