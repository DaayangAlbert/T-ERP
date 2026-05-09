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
  const stepFilter = url.searchParams.get("step"); // RH / DAF / DG
  const typeFilter = url.searchParams.get("type") as ValidationType | null;

  const where: Record<string, unknown> = {
    tenantId: session.tenantId,
    status: ValidationStatus.PENDING,
  };
  if (stepFilter) where.currentStep = stepFilter;
  if (typeFilter) where.type = typeFilter;

  const items = await prisma.validation.findMany({
    where,
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    include: {
      initiator: { select: { firstName: true, lastName: true, position: true } },
      currentApprover: { select: { firstName: true, lastName: true } },
    },
    take: 200,
  });

  const now = Date.now();
  const totalAmount = items.reduce((s, v) => s + (v.amount ?? 0n), 0n);
  const byStep = {
    RH: items.filter((v) => v.currentStep === "RH").length,
    DAF: items.filter((v) => v.currentStep === "DAF").length,
    DG: items.filter((v) => v.currentStep === "DG").length,
    OTHER: items.filter((v) => !["RH", "DAF", "DG"].includes(v.currentStep ?? "")).length,
  };

  return NextResponse.json({
    items: items.map((v) => {
      const ageDays = Math.floor((now - v.createdAt.getTime()) / 86_400_000);
      const blockedDays = ageDays >= 3 ? ageDays : null;
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
        blockedDays,
        createdAt: v.createdAt.toISOString(),
      };
    }),
    summary: {
      total: items.length,
      totalAmount: totalAmount.toString(),
      byStep,
      blockedCount: items.filter((v) => Math.floor((now - v.createdAt.getTime()) / 86_400_000) >= 3).length,
    },
  });
}
