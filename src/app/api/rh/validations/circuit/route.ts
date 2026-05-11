import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role, ValidationStatus, ValidationType } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.HR, Role.DG, Role.DAF, Role.TENANT_ADMIN];

const RH_TYPES: ValidationType[] = [ValidationType.PAYROLL, ValidationType.HIRING, ValidationType.LEAVE, ValidationType.CONTRACT];

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé RH / DG / DAF" }, { status: 403 });
  }

  const items = await prisma.validation.findMany({
    where: {
      tenantId: session.tenantId,
      status: ValidationStatus.PENDING,
      type: { in: RH_TYPES },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    include: {
      initiator: { select: { firstName: true, lastName: true } },
      currentApprover: { select: { firstName: true, lastName: true } },
    },
    take: 200,
  });

  const now = Date.now();
  const byStep = {
    RH: items.filter((v) => v.currentStep === "RH").length,
    DAF: items.filter((v) => v.currentStep === "DAF").length,
    DG: items.filter((v) => v.currentStep === "DG").length,
  };
  return NextResponse.json({
    items: items.map((v) => {
      const ageDays = Math.floor((now - v.createdAt.getTime()) / 86_400_000);
      return {
        id: v.id,
        type: v.type,
        reference: v.reference,
        title: v.title,
        amount: v.amount?.toString() ?? null,
        priority: v.priority,
        currentStep: v.currentStep,
        currentApprover: v.currentApprover ? `${v.currentApprover.firstName} ${v.currentApprover.lastName}` : "—",
        initiator: `${v.initiator.firstName} ${v.initiator.lastName}`,
        ageDays,
        blockedDays: ageDays >= 3 ? ageDays : null,
        createdAt: v.createdAt.toISOString(),
      };
    }),
    summary: {
      total: items.length,
      byStep,
      blockedCount: items.filter((v) => Math.floor((now - v.createdAt.getTime()) / 86_400_000) >= 3).length,
    },
  });
}
