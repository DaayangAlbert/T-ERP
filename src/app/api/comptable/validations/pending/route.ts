import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role, ValidationType } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES: Role[] = [Role.ACCOUNTANT, Role.DAF, Role.DG, Role.SUPER_ADMIN];

// Types de validations N1 du Comptable
const N1_TYPES: ValidationType[] = [ValidationType.PURCHASE, ValidationType.EXPENSE];

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  // Préparation comptable : on remonte les PURCHASE/EXPENSE qui sont actuellement
  // à l'étape DAF (ou CPT si jamais l'étape est introduite). Le comptable prépare
  // les écritures comptables avant que le DAF approuve.
  const items = await prisma.validation.findMany({
    where: {
      tenantId: session.tenantId,
      status: "PENDING",
      type: { in: N1_TYPES },
      currentStep: { in: ["CPT", "DAF"] },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    take: 100,
    include: {
      initiator: { select: { firstName: true, lastName: true } },
    },
  });

  const now = Date.now();
  const totalAmount = items.reduce((s, v) => s + (v.amount ?? 0n), 0n);
  const urgentCount = items.filter((v) => v.priority === "URGENT" || v.priority === "HIGH").length;
  const oldestAgeDays = items.length
    ? Math.max(...items.map((v) => Math.floor((now - v.createdAt.getTime()) / 86_400_000)))
    : 0;

  return NextResponse.json({
    items: items.map((v) => ({
      id: v.id,
      type: v.type,
      reference: v.reference,
      title: v.title,
      amount: v.amount ? Number(v.amount) : null,
      initiator: v.initiator,
      currentStep: v.currentStep,
      priority: v.priority,
      dueDate: v.dueDate?.toISOString() ?? null,
      createdAt: v.createdAt.toISOString(),
      ageDays: Math.floor((now - v.createdAt.getTime()) / 86_400_000),
    })),
    summary: {
      total: items.length,
      urgentCount,
      totalAmount: totalAmount.toString(),
      oldestAgeDays,
    },
  });
}
