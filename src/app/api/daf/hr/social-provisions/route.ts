import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role, ProvisionType } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.DAF, Role.DG, Role.TENANT_ADMIN];

const TYPE_LABEL: Record<ProvisionType, string> = {
  PAID_LEAVE: "Congés payés (CP)",
  END_OF_CAREER: "Indemnités fin de carrière (IFC)",
  BONUSES: "Primes annuelles",
  MUTUAL: "Mutuelle / prévoyance",
  OTHER: "Autres provisions",
};

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DAF / DG" }, { status: 403 });
  }

  const items = await prisma.socialProvision.findMany({
    where: { tenantId: session.tenantId },
    orderBy: [{ periodEnd: "desc" }, { calculatedAt: "desc" }],
  });

  const total = items.reduce((s, p) => s + p.amount, 0n);
  const byType = Object.values(ProvisionType).map((t) => {
    const subset = items.filter((i) => i.type === t);
    const subTotal = subset.reduce((s, p) => s + p.amount, 0n);
    return {
      type: t,
      label: TYPE_LABEL[t],
      total: subTotal.toString(),
      count: subset.length,
    };
  });

  return NextResponse.json({
    items: items.map((p) => ({
      id: p.id,
      type: p.type,
      label: TYPE_LABEL[p.type],
      amount: p.amount.toString(),
      calculatedAt: p.calculatedAt.toISOString(),
      periodEnd: p.periodEnd,
      notes: p.notes,
    })),
    summary: {
      total: total.toString(),
      count: items.length,
      byType,
    },
  });
}
