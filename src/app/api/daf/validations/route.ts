import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role, ValidationStatus, ValidationType } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.DAF, Role.DG, Role.TENANT_ADMIN];

export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DAF / DG" }, { status: 403 });
  }

  const url = new URL(req.url);
  const type = url.searchParams.get("type") as ValidationType | null;
  const status = url.searchParams.get("status") ?? "pending";

  const where: Record<string, unknown> = {
    tenantId: session.tenantId,
  };

  if (status === "pending") {
    where.status = ValidationStatus.PENDING;
    where.currentStep = "DAF";
  } else if (status === "all") {
    // pas de filtre statut
  } else if (status === "validated") {
    where.status = ValidationStatus.APPROVED;
  } else if (status === "rejected") {
    where.status = ValidationStatus.REJECTED;
  }

  if (type) where.type = type;

  const items = await prisma.validation.findMany({
    where,
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    take: 100,
    include: {
      initiator: { select: { firstName: true, lastName: true, position: true } },
    },
  });

  // KPIs
  const totalAmount = items.reduce((s, v) => s + (v.amount ?? 0n), 0n);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const monthValidated = await prisma.validation.count({
    where: { tenantId: session.tenantId, status: ValidationStatus.APPROVED, decisionAt: { gte: monthStart } },
  });
  const avgDelayDays = items.length
    ? items.reduce((s, v) => s + Math.floor((Date.now() - v.createdAt.getTime()) / 86_400_000), 0) / items.length
    : 0;

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
      workflow: v.workflow,
      dueDate: v.dueDate?.toISOString() ?? null,
      ageDays: Math.floor((Date.now() - v.createdAt.getTime()) / 86_400_000),
      createdAt: v.createdAt.toISOString(),
    })),
    summary: {
      total: items.length,
      totalAmount: totalAmount.toString(),
      averageDelayDays: Math.round(avgDelayDays * 10) / 10,
      monthValidatedCount: monthValidated,
    },
  });
}
