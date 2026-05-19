import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardMagWarehouse } from "@/lib/rbac/mag-guard";
import { WarehouseMovementDirection, type WarehouseScope, type Role } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * Dashboard magasin — deux modes :
 *
 *  1. **Mono-magasin** (rôles avec édition : WAREHOUSE keeper, SITE_MANAGER, TENANT_ADMIN)
 *     → focus sur LE warehouse de l'utilisateur (le sien).
 *
 *  2. **Vue consolidée groupe** (rôles READ : DG, DAF, LOGISTICS, WORKS_DIRECTOR,
 *     TECH_DIRECTOR) → agrège TOUS les warehouses accessibles (groupe BatimCAM
 *     SA = mère + filiales). La réponse inclut le détail par magasin.
 *
 * Filtres optionnels (query params) appliqués au mode consolidé pour
 * restreindre l'agrégation au sous-ensemble matché par WarehouseFilter :
 *   - ?scope=CHANTIER|DIRECTION|CENTRAL
 *   - ?siteId={id}
 *   - ?ownerDirection={Role}
 *   - ?warehouseId={id}
 */
export async function GET(req: Request) {
  const guard = await guardMagWarehouse();
  if (guard instanceof NextResponse) return guard;
  const { warehouse, allWarehouses, access } = guard;

  const url = new URL(req.url);
  const scopeFilter = url.searchParams.get("scope") as WarehouseScope | null;
  const siteIdFilter = url.searchParams.get("siteId");
  const ownerDirectionFilter = url.searchParams.get("ownerDirection") as Role | null;
  const warehouseIdFilter = url.searchParams.get("warehouseId");
  const hasFilter =
    scopeFilter || siteIdFilter || ownerDirectionFilter || warehouseIdFilter;

  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  // Mode consolidé : READ avec ≥ 2 magasins → on agrège
  const consolidated = access.level === "READ" && allWarehouses.length > 1;

  // Applique les filtres uniquement en mode consolidé (en mode mono,
  // on est déjà restreint au warehouse de l'user).
  const filteredWarehouses = consolidated
    ? allWarehouses.filter((w) => {
        if (scopeFilter && w.scope !== scopeFilter) return false;
        if (siteIdFilter && w.site?.id !== siteIdFilter) return false;
        if (ownerDirectionFilter && w.ownerDirection !== ownerDirectionFilter)
          return false;
        if (warehouseIdFilter && w.id !== warehouseIdFilter) return false;
        return true;
      })
    : allWarehouses;

  const scopeIds = consolidated ? filteredWarehouses.map((w) => w.id) : [warehouse.id];

  // Si le filtre matche 0 magasin en mode consolidé, on renvoie une
  // réponse "vide cohérente" plutôt que 500.
  if (consolidated && scopeIds.length === 0) {
    return NextResponse.json({
      consolidated: true,
      warehouse: {
        id: warehouse.id,
        code: "AUCUN",
        name: "Aucun magasin ne correspond aux filtres",
        site: warehouse.site,
      },
      kpis: {
        totalValue: 0,
        stockedArticles: 0,
        movementsToday: 0,
        movementsTodayIn: 0,
        movementsTodayOut: 0,
        ruptureCount: 0,
        pendingInventoryCount: 0,
        warehouseCount: 0,
      },
      byWarehouse: [],
      ruptures: [],
      pendingInventories: [],
      expectedDeliveries: [],
      recentMovements: [],
      filtered: hasFilter,
    });
  }

  const [stocks, todayMovements, recentMovements, expectedDeliveries, pendingInventories] = await Promise.all([
    prisma.warehouseStock.findMany({
      where: { warehouseId: { in: scopeIds } },
      include: {
        article: { select: { code: true, name: true, category: true, unit: true } },
        warehouse: { select: { code: true, name: true } },
      },
    }),
    prisma.warehouseMovement.findMany({
      where: { warehouseId: { in: scopeIds }, occurredAt: { gte: startOfDay } },
      select: { direction: true, totalValue: true, warehouseId: true },
    }),
    prisma.warehouseMovement.findMany({
      where: { warehouseId: { in: scopeIds } },
      orderBy: { occurredAt: "desc" },
      take: consolidated ? 8 : 4,
      include: {
        article: { select: { code: true, name: true, unit: true } },
        warehouse: { select: { code: true, name: true } },
      },
    }),
    prisma.delivery.findMany({
      where: {
        siteId: {
          in: filteredWarehouses
            .map((w) => w.site?.id)
            .filter((id): id is string => Boolean(id)),
        },
        status: { in: ["CONFIRMED", "IN_TRANSIT"] },
      },
      orderBy: { scheduledAt: "asc" },
      take: 5,
    }),
    prisma.warehouseInventory.findMany({
      where: { warehouseId: { in: scopeIds }, status: { in: ["PLANNED", "IN_PROGRESS"] } },
      orderBy: { plannedDate: "asc" },
      include: { warehouse: { select: { code: true, name: true } } },
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
      warehouseCode: consolidated ? s.warehouse.code : undefined,
      warehouseName: consolidated ? s.warehouse.name : undefined,
    }));

  const inCount = todayMovements.filter((m) => m.direction === WarehouseMovementDirection.IN).length;
  const outCount = todayMovements.filter((m) => m.direction === WarehouseMovementDirection.OUT).length;

  // Répartition par magasin (uniquement en mode consolidé)
  const byWarehouse = consolidated
    ? await Promise.all(
        filteredWarehouses.map(async (w) => {
          const agg = await prisma.warehouseStock.aggregate({
            where: { warehouseId: w.id },
            _sum: { totalValue: true },
            _count: true,
          });
          const movsToday = todayMovements.filter((m) => m.warehouseId === w.id).length;
          const ruptureCount = stocks.filter(
            (s) => s.warehouse.code === w.code && s.minThreshold !== null && s.quantity <= (s.minThreshold ?? 0),
          ).length;
          return {
            id: w.id,
            code: w.code,
            name: w.name,
            scope: w.scope,
            ownerDirection: w.ownerDirection,
            siteCode: w.site?.code ?? null,
            siteName: w.site?.name ?? null,
            articleCount: agg._count,
            totalValue: Number(agg._sum.totalValue ?? 0),
            movementsToday: movsToday,
            ruptureCount,
          };
        }),
      )
    : [];

  return NextResponse.json({
    consolidated,
    filtered: hasFilter,
    warehouse: {
      id: warehouse.id,
      code: consolidated ? "GROUPE" : warehouse.code,
      name: consolidated
        ? `Vue consolidée · ${filteredWarehouses.length} magasin${filteredWarehouses.length > 1 ? "s" : ""}`
        : warehouse.name,
      site: warehouse.site,
    },
    kpis: {
      totalValue,
      stockedArticles: stocks.length,
      movementsToday: todayMovements.length,
      movementsTodayIn: inCount,
      movementsTodayOut: outCount,
      ruptureCount: ruptures.length,
      pendingInventoryCount: pendingInventories.length,
      warehouseCount: consolidated ? filteredWarehouses.length : 1,
    },
    byWarehouse,
    ruptures: ruptures.slice(0, 8),
    pendingInventories: pendingInventories.slice(0, 5).map((i) => ({
      id: i.id,
      type: i.type,
      scope: i.scope,
      plannedDate: i.plannedDate.toISOString(),
      status: i.status,
      warehouseCode: consolidated ? i.warehouse.code : undefined,
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
      warehouseCode: consolidated ? m.warehouse.code : undefined,
    })),
  });
}
