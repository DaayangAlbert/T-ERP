import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { MovementType, type WarehouseScope, type Role } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const url = new URL(req.url);
  const type = url.searchParams.get("type") as MovementType | null;
  const anomalous = url.searchParams.get("anomalous") === "true";

  // Filtres WarehouseFilter (passés par /stocks page ADMIN/DAF) :
  // si scope/siteId/ownerDirection/warehouseId sont fournis, on
  // restreint les mouvements aux sites correspondant aux warehouses
  // sélectionnés (StockMovement.fromSiteId / toSiteId).
  const scope = url.searchParams.get("scope") as WarehouseScope | null;
  const siteIdFilter = url.searchParams.get("siteId");
  const ownerDirection = url.searchParams.get("ownerDirection") as Role | null;
  const warehouseIdFilter = url.searchParams.get("warehouseId");

  const where: Record<string, unknown> = { tenantId: session.tenantId };
  if (type) where.type = type;
  if (anomalous) where.anomalous = true;

  // Résout l'ensemble des siteIds visés par le filtre warehouse, puis
  // ne renvoie que les mouvements impliquant ces sites (fromSiteId OR
  // toSiteId). Si aucun warehouse ne matche le filtre, on retourne 0
  // mouvements.
  if (scope || siteIdFilter || ownerDirection || warehouseIdFilter) {
    const warehouseWhere: Record<string, unknown> = { tenantId: session.tenantId };
    if (scope) warehouseWhere.scope = scope;
    if (siteIdFilter) warehouseWhere.siteId = siteIdFilter;
    if (ownerDirection) warehouseWhere.ownerDirection = ownerDirection;
    if (warehouseIdFilter) warehouseWhere.id = warehouseIdFilter;

    const matchingWarehouses = await prisma.warehouse.findMany({
      where: warehouseWhere,
      select: { siteId: true },
    });
    const siteIds = matchingWarehouses
      .map((w) => w.siteId)
      .filter((id): id is string => Boolean(id));

    if (siteIds.length === 0) {
      return NextResponse.json({
        items: [],
        summary: { total: 0, anomalousCount: 0 },
      });
    }
    where.OR = [{ fromSiteId: { in: siteIds } }, { toSiteId: { in: siteIds } }];
  }

  const items = await prisma.stockMovement.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  // Récup les noms d'initiateurs pour affichage
  const userIds = Array.from(new Set(items.map((m) => m.initiatorId)));
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, firstName: true, lastName: true },
  });
  const byId = new Map(users.map((u) => [u.id, `${u.firstName} ${u.lastName}`]));

  return NextResponse.json({
    items: items.map((m) => ({
      id: m.id,
      type: m.type,
      itemCode: m.itemCode,
      itemLabel: m.itemLabel,
      quantity: m.quantity,
      unitValue: m.unitValue.toString(),
      totalValue: m.totalValue.toString(),
      fromSiteId: m.fromSiteId,
      toSiteId: m.toSiteId,
      reason: m.reason,
      initiator: byId.get(m.initiatorId) ?? "—",
      anomalous: m.anomalous,
      anomalyReason: m.anomalyReason,
      createdAt: m.createdAt.toISOString(),
    })),
    summary: {
      total: items.length,
      anomalousCount: items.filter((m) => m.anomalous).length,
    },
  });
}
