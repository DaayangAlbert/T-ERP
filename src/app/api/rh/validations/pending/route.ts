import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role, ValidationStatus, ValidationType } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.HR, Role.DG, Role.DAF, Role.TENANT_ADMIN];

// Types validés en N1 RH : congés > 30j, embauches CDI, modifications contrat
const RH_TYPES: ValidationType[] = [ValidationType.PAYROLL, ValidationType.HIRING, ValidationType.LEAVE, ValidationType.CONTRACT];

export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé RH / DG / DAF" }, { status: 403 });
  }

  const url = new URL(req.url);
  const type = url.searchParams.get("type") as ValidationType | null;

  const where: Record<string, unknown> = {
    tenantId: session.tenantId,
    status: ValidationStatus.PENDING,
    currentStep: "RH",
  };
  if (type) where.type = type;
  else where.type = { in: RH_TYPES };

  const items = await prisma.validation.findMany({
    where,
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    take: 50,
    include: { initiator: { select: { firstName: true, lastName: true, position: true } } },
  });

  const totalAmount = items.reduce((s, v) => s + (v.amount ?? 0n), 0n);
  const avgDelay = items.length
    ? items.reduce((s, v) => s + Math.floor((Date.now() - v.createdAt.getTime()) / 86_400_000), 0) / items.length
    : 0;

  return NextResponse.json({
    items: items.map((v) => ({
      id: v.id,
      reference: v.reference,
      type: v.type,
      title: v.title,
      description: v.description,
      amount: v.amount?.toString() ?? null,
      priority: v.priority,
      currentStep: v.currentStep,
      initiator: `${v.initiator.firstName} ${v.initiator.lastName}`,
      initiatorPosition: v.initiator.position,
      workflow: v.workflow,
      dueDate: v.dueDate?.toISOString() ?? null,
      ageDays: Math.floor((Date.now() - v.createdAt.getTime()) / 86_400_000),
      createdAt: v.createdAt.toISOString(),
    })),
    summary: {
      total: items.length,
      totalAmount: totalAmount.toString(),
      averageDelayDays: Math.round(avgDelay * 10) / 10,
    },
  });
}
