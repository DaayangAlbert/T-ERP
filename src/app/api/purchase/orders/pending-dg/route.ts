import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const items = await prisma.purchaseOrder.findMany({
    where: { tenantId: session.tenantId, status: "PENDING_DG" },
    orderBy: { createdAt: "asc" },
    include: { supplier: { select: { name: true, category: true } } },
  });

  const now = Date.now();
  const totalAmount = items.reduce((s, p) => s + p.amount, 0n);
  const ageDays = items.map((p) => Math.floor((now - p.createdAt.getTime()) / 86_400_000));
  const avgAge = ageDays.length ? ageDays.reduce((s, x) => s + x, 0) / ageDays.length : 0;

  return NextResponse.json({
    items: items.map((p) => ({
      id: p.id,
      reference: p.reference,
      label: p.label,
      amount: p.amount.toString(),
      category: p.category,
      supplier: p.supplier.name,
      supplierCategory: p.supplier.category,
      dafApprovedAt: p.dafApprovedAt?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
      ageDays: Math.floor((now - p.createdAt.getTime()) / 86_400_000),
    })),
    summary: {
      total: items.length,
      totalAmount: totalAmount.toString(),
      averageAgeDays: Math.round(avgAge),
    },
  });
}
