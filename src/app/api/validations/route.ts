import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role, ValidationStatus, ValidationType } from "@prisma/client";

export const dynamic = "force-dynamic";

// GET /api/validations?type=...&priority=...&assignedToMe=true
export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const url = new URL(req.url);
  const typeParam = url.searchParams.get("type");
  const priorityParam = url.searchParams.get("priority");
  const assignedToMe = url.searchParams.get("assignedToMe") === "1";

  const where: Record<string, unknown> = {
    tenantId: session.tenantId,
    status: ValidationStatus.PENDING,
  };
  if (typeParam) where.type = typeParam as ValidationType;
  if (priorityParam) where.priority = priorityParam;
  // Par défaut le DG voit toutes les validations en attente du tenant.
  // Pour les autres rôles : uniquement celles qui leur sont assignées.
  if (assignedToMe || session.role !== Role.DG) {
    where.currentApproverId = session.sub;
  }

  const items = await prisma.validation.findMany({
    where,
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    take: 100,
    include: {
      initiator: { select: { firstName: true, lastName: true, position: true } },
      currentApprover: { select: { firstName: true, lastName: true } },
    },
  });

  return NextResponse.json({
    items: items.map((v) => ({
      id: v.id,
      type: v.type,
      reference: v.reference,
      title: v.title,
      description: v.description,
      amount: v.amount?.toString() ?? null,
      priority: v.priority,
      status: v.status,
      currentStep: v.currentStep,
      initiator: `${v.initiator.firstName} ${v.initiator.lastName}`,
      initiatorPosition: v.initiator.position,
      currentApprover: v.currentApprover
        ? `${v.currentApprover.firstName} ${v.currentApprover.lastName}`
        : null,
      workflow: v.workflow,
      dueDate: v.dueDate?.toISOString() ?? null,
      createdAt: v.createdAt.toISOString(),
    })),
    total: items.length,
  });
}
