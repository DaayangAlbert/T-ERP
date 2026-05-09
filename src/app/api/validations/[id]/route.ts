import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const v = await prisma.validation.findFirst({
    where: { id: params.id, tenantId: session.tenantId },
    include: {
      initiator: { select: { id: true, firstName: true, lastName: true, position: true, email: true } },
      currentApprover: { select: { id: true, firstName: true, lastName: true } },
      decidedBy: { select: { id: true, firstName: true, lastName: true } },
    },
  });
  if (!v) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  return NextResponse.json({
    id: v.id,
    type: v.type,
    reference: v.reference,
    title: v.title,
    description: v.description,
    amount: v.amount?.toString() ?? null,
    priority: v.priority,
    status: v.status,
    currentStep: v.currentStep,
    initiator: {
      id: v.initiator.id,
      name: `${v.initiator.firstName} ${v.initiator.lastName}`,
      position: v.initiator.position,
      email: v.initiator.email,
    },
    currentApprover: v.currentApprover
      ? { id: v.currentApprover.id, name: `${v.currentApprover.firstName} ${v.currentApprover.lastName}` }
      : null,
    decidedBy: v.decidedBy ? { id: v.decidedBy.id, name: `${v.decidedBy.firstName} ${v.decidedBy.lastName}` } : null,
    decisionAt: v.decisionAt?.toISOString() ?? null,
    decisionReason: v.decisionReason,
    workflow: v.workflow,
    comments: v.comments,
    dueDate: v.dueDate?.toISOString() ?? null,
    createdAt: v.createdAt.toISOString(),
  });
}
