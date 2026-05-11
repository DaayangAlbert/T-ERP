import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role, ValidationStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.TECH_DIRECTOR, Role.DG, Role.TENANT_ADMIN];

const TECH_TYPES = ["AMENDMENT", "SUBCONTRACTING", "EQUIPMENT", "SPECIAL_METHOD", "TECHNICAL_HANDOVER"] as const;

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé Direction Technique" }, { status: 403 });
  }

  const all = await prisma.validation.findMany({
    where: {
      tenantId: session.tenantId,
      status: ValidationStatus.PENDING,
      type: { in: TECH_TYPES as unknown as string[] },
    },
    include: {
      initiator: { select: { firstName: true, lastName: true } },
      currentApprover: { select: { firstName: true, lastName: true, role: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    items: all.map((v) => ({
      id: v.id,
      reference: v.reference,
      type: v.type,
      title: v.title,
      amount: v.amount ? Number(v.amount) : null,
      initiator: v.initiator
        ? `${v.initiator.firstName.charAt(0)}. ${v.initiator.lastName}`
        : null,
      currentStep: v.currentStep,
      currentApprover: v.currentApprover
        ? `${v.currentApprover.firstName.charAt(0)}. ${v.currentApprover.lastName}`
        : null,
      currentApproverRole: v.currentApprover?.role ?? null,
      stuckDays: Math.floor((Date.now() - v.updatedAt.getTime()) / 86400_000),
      createdAt: v.createdAt.toISOString(),
    })),
  });
}
