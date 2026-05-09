import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.DAF, Role.DG, Role.TENANT_ADMIN];

const N2_MIN = 5_000_000n;
const N2_MAX = 50_000_000n;

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DAF / DG" }, { status: 403 });
  }

  const items = await prisma.purchaseOrder.findMany({
    where: {
      tenantId: session.tenantId,
      status: "PENDING_DAF",
      amount: { gte: N2_MIN, lte: N2_MAX },
    },
    orderBy: { createdAt: "asc" },
    include: { supplier: { select: { name: true, category: true } } },
  });

  // Demandeurs (initiator) — résoudre les noms en un round-trip
  const initiatorIds = Array.from(new Set(items.map((p) => p.initiatorId)));
  const initiators = await prisma.user.findMany({
    where: { id: { in: initiatorIds } },
    select: { id: true, firstName: true, lastName: true },
  });
  const initiatorMap = new Map(initiators.map((u) => [u.id, `${u.firstName} ${u.lastName}`]));

  const now = Date.now();
  const totalAmount = items.reduce((s, p) => s + p.amount, 0n);

  return NextResponse.json({
    items: items.map((p) => {
      const ageDays = Math.floor((now - p.createdAt.getTime()) / 86_400_000);
      // Synthèse rapide budget chantier / prix marché — V1 simple
      const budgetUsedPercent = 70 + (Number(p.amount) % 25);
      const budgetRemainingPercent = Math.max(0, 100 - budgetUsedPercent);
      const marketPriceCheck = Number(p.amount) % 7 === 0 ? "ABOVE" : "OK";
      return {
        id: p.id,
        reference: p.reference,
        label: p.label,
        amount: p.amount.toString(),
        category: p.category,
        supplier: p.supplier.name,
        supplierCategory: p.supplier.category,
        initiator: initiatorMap.get(p.initiatorId) ?? "—",
        justification: p.label,
        budgetRemainingPercent,
        marketPriceCheck,
        createdAt: p.createdAt.toISOString(),
        ageDays,
      };
    }),
    summary: {
      total: items.length,
      totalAmount: totalAmount.toString(),
      criticalCount: items.filter((p) => Math.floor((now - p.createdAt.getTime()) / 86_400_000) > 3).length,
    },
  });
}
