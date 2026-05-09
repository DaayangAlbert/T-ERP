import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.DAF, Role.DG, Role.TENANT_ADMIN];

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DAF / DG" }, { status: 403 });
  }

  const items = await prisma.supplierCommitment.findMany({
    where: { tenantId: session.tenantId, status: { in: ["ACTIVE", "PARTIAL_DELIVERY"] } },
    include: { supplierObj: { select: { name: true, category: true } } },
    orderBy: { expectedDeliveryDate: "asc" },
  });

  const total = items.reduce((s, c) => s + c.amount, 0n);
  const delivered = items.reduce((s, c) => s + c.deliveredAmount, 0n);
  const invoiced = items.reduce((s, c) => s + c.invoicedAmount, 0n);
  const remaining = total - invoiced;

  // Impact tréso prévisionnelle : on classe par "à payer dans les 30j"
  const now = Date.now();
  const due30d = items
    .filter((c) => c.expectedDeliveryDate && c.expectedDeliveryDate.getTime() - now < 30 * 86_400_000)
    .reduce((s, c) => s + (c.amount - c.invoicedAmount), 0n);

  return NextResponse.json({
    items: items.map((c) => ({
      id: c.id,
      supplier: c.supplierObj.name,
      supplierCategory: c.supplierObj.category,
      poRef: c.poRef,
      amount: c.amount.toString(),
      deliveredAmount: c.deliveredAmount.toString(),
      invoicedAmount: c.invoicedAmount.toString(),
      remaining: (c.amount - c.invoicedAmount).toString(),
      expectedDeliveryDate: c.expectedDeliveryDate?.toISOString() ?? null,
      status: c.status,
    })),
    summary: {
      count: items.length,
      total: total.toString(),
      delivered: delivered.toString(),
      invoiced: invoiced.toString(),
      remaining: remaining.toString(),
      due30d: due30d.toString(),
    },
  });
}
