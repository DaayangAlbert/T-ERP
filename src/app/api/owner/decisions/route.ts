import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getTenantScopeIds } from "@/lib/tenant";
import { Role, ValidationStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.OWNER, Role.SUPER_ADMIN];

const PRIORITY_RANK: Record<string, number> = { CRITICAL: 0, URGENT: 1, HIGH: 2, NORMAL: 3, LOW: 4 };

// GET — décisions (validations) en attente, triées par priorité puis montant.
export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé au Propriétaire / PCA" }, { status: 403 });
  }

  const scopeIds = await getTenantScopeIds(session.tenantId);
  const items = await prisma.validation.findMany({
    where: { tenantId: { in: scopeIds }, status: ValidationStatus.PENDING },
    include: { initiator: { select: { firstName: true, lastName: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const sorted = items
    .map((v) => ({
      id: v.id,
      reference: v.reference,
      title: v.title,
      description: v.description,
      type: v.type,
      amount: v.amount?.toString() ?? null,
      priority: v.priority,
      currentStep: v.currentStep,
      initiator: `${v.initiator.firstName} ${v.initiator.lastName}`,
      dueDate: v.dueDate?.toISOString() ?? null,
      createdAt: v.createdAt.toISOString(),
    }))
    .sort((a, b) => {
      const pr = (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9);
      if (pr !== 0) return pr;
      return Number((BigInt(b.amount ?? "0") - BigInt(a.amount ?? "0")) > 0n ? 1 : -1);
    });

  return NextResponse.json({ items: sorted, count: sorted.length });
}
