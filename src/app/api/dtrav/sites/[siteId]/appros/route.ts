import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardDtravSite } from "@/lib/rbac/dtrav-guard";
import { DeliveryStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { siteId: string } }) {
  const guard = await guardDtravSite(params.siteId);
  if (guard instanceof NextResponse) return guard;

  const today = new Date();
  const in7days = new Date(today.getTime() + 7 * 86_400_000);

  const [pos, stockAlerts, upcomingDeliveries] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where: { siteId: params.siteId },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { supplier: { select: { name: true } } },
    }),
    prisma.siteStockAlert.findMany({
      where: { siteId: params.siteId, resolved: false },
      orderBy: { daysOfCover: "asc" },
    }),
    prisma.delivery.findMany({
      where: {
        siteId: params.siteId,
        scheduledAt: { gte: today, lte: in7days },
        status: { in: [DeliveryStatus.CONFIRMED, DeliveryStatus.IN_TRANSIT, DeliveryStatus.PARTIALLY_RECEIVED] },
      },
      orderBy: { scheduledAt: "asc" },
    }),
  ]);

  const cumPo = pos
    .filter((p) => p.status === "APPROVED" || p.status === "PENDING_DAF" || p.status === "PENDING_DG")
    .reduce((s, p) => s + Number(p.amount), 0);

  return NextResponse.json({
    purchaseOrders: pos.map((p) => ({
      id: p.id,
      reference: p.reference,
      supplier: p.supplier.name,
      amount: Number(p.amount),
      status: p.status,
      createdAt: p.createdAt.toISOString(),
    })),
    stockAlerts: stockAlerts.map((a) => ({
      id: a.id,
      articleCode: a.articleCode,
      articleLabel: a.articleLabel,
      currentStock: a.currentStock,
      weeklyNeed: a.weeklyNeed,
      daysOfCover: a.daysOfCover,
      severity: a.severity,
      suggestedSupplierId: a.suggestedSupplierId,
    })),
    upcomingDeliveries: upcomingDeliveries.map((d) => ({
      id: d.id,
      scheduledAt: d.scheduledAt.toISOString(),
      status: d.status,
      deliveryNoteRef: d.deliveryNoteRef,
      items: d.items,
    })),
    kpis: {
      activePoCount: pos.filter((p) => p.status === "APPROVED").length,
      cumulativeAmount: cumPo,
      upcomingDeliveriesCount: upcomingDeliveries.length,
      ruptureCount: stockAlerts.length,
    },
  });
}
