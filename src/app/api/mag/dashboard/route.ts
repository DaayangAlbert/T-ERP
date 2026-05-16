import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardMagWarehouse } from "@/lib/rbac/mag-guard";
import { WarehouseMovementDirection } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await guardMagWarehouse();
  if (guard instanceof NextResponse) return guard;
  const { warehouse } = guard;

  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const [stocks, todayMovements, recentMovements, expectedDeliveries, pendingInventories] = await Promise.all([
    prisma.warehouseStock.findMany({
      where: { warehouseId: warehouse.id },
      include: { article: { select: { code: true, name: true, category: true, unit: true } } },
    }),
    prisma.warehouseMovement.findMany({
      where: { warehouseId: warehouse.id, occurredAt: { gte: startOfDay } },
      select: { direction: true, totalValue: true },
    }),
    prisma.warehouseMovement.findMany({
      where: { warehouseId: warehouse.id },
      orderBy: { occurredAt: "desc" },
      take: 4,
      include: { article: { select: { code: true, name: true, unit: true } } },
    }),
    prisma.delivery.findMany({
      where: { siteId: warehouse.site.id, status: { in: ["CONFIRMED", "IN_TRANSIT"] } },
      orderBy: { scheduledAt: "asc" },
      take: 5,
    }),
    prisma.warehouseInventory.findMany({
      where: { warehouseId: warehouse.id, status: { in: ["PLANNED", "IN_PROGRESS"] } },
      orderBy: { plannedDate: "asc" },
    }),
  ]);

  const totalValue = stocks.reduce((s, x) => s + Number(x.totalValue), 0);
  const ruptures = stocks
    .filter((s) => s.minThreshold !== null && s.quantity <= (s.minThreshold ?? 0))
    .map((s) => ({
      articleCode: s.article.code,
      articleName: s.article.name,
      quantity: s.quantity,
      unit: s.article.unit,
      minThreshold: s.minThreshold,
      daysOfCover: s.minThreshold && s.minThreshold > 0 ? Math.round((s.quantity / s.minThreshold) * 7) : 0,
    }));

  const inCount = todayMovements.filter((m) => m.direction === WarehouseMovementDirection.IN).length;
  const outCount = todayMovements.filter((m) => m.direction === WarehouseMovementDirection.OUT).length;

  return NextResponse.json({
    warehouse: { id: warehouse.id, code: warehouse.code, name: warehouse.name, site: warehouse.site },
    kpis: {
      totalValue,
      stockedArticles: stocks.length,
      movementsToday: todayMovements.length,
      movementsTodayIn: inCount,
      movementsTodayOut: outCount,
      ruptureCount: ruptures.length,
      pendingInventoryCount: pendingInventories.length,
    },
    ruptures: ruptures.slice(0, 5),
    pendingInventories: pendingInventories.slice(0, 3).map((i) => ({
      id: i.id,
      type: i.type,
      scope: i.scope,
      plannedDate: i.plannedDate.toISOString(),
      status: i.status,
    })),
    expectedDeliveries: expectedDeliveries.map((d) => ({
      id: d.id,
      scheduledAt: d.scheduledAt.toISOString(),
      status: d.status,
      deliveryNoteRef: d.deliveryNoteRef,
    })),
    recentMovements: recentMovements.map((m) => ({
      id: m.id,
      direction: m.direction,
      reference: m.reference,
      reason: m.reason,
      articleCode: m.article.code,
      articleName: m.article.name,
      quantity: m.quantity,
      unit: m.article.unit,
      totalValue: Number(m.totalValue),
      occurredAt: m.occurredAt.toISOString(),
    })),
  });
}
