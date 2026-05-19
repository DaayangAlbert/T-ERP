import { NextResponse } from "next/server";
import { Role, WarehouseMovementDirection } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getTenantScopeIds } from "@/lib/tenant";

export const dynamic = "force-dynamic";

/**
 * Vue condensée Stocks pour le DG :
 *  - Stock disponible (valeur + nb articles) groupé par entrepôt
 *  - Stock disponible groupé par chantier (warehouse.siteId)
 *  - Historique entrées/sorties par chantier (90 derniers jours)
 */
export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.role !== Role.DG && session.role !== Role.SUPER_ADMIN && session.role !== Role.TENANT_ADMIN) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const tenantIds = await getTenantScopeIds(session.tenantId);

  const warehouses = await prisma.warehouse.findMany({
    where: { tenantId: { in: tenantIds } },
    include: {
      site: { select: { id: true, code: true, name: true } },
      stocks: { select: { quantity: true, totalValue: true, minThreshold: true } },
    },
  });

  const byWarehouse = warehouses.map((w) => {
    const totalValue = w.stocks.reduce((s, x) => s + Number(x.totalValue), 0);
    const articleCount = w.stocks.length;
    const lowStock = w.stocks.filter(
      (s) => s.minThreshold !== null && s.minThreshold !== undefined && s.quantity < (s.minThreshold ?? 0),
    ).length;
    return {
      warehouseId: w.id,
      code: w.code,
      name: w.name,
      scope: w.scope,
      ownerDirection: w.ownerDirection,
      site: w.site,
      totalValue: String(totalValue),
      articleCount,
      lowStockCount: lowStock,
    };
  });

  // Stock par chantier (agrège tous les magasins liés à un site)
  const siteAgg = new Map<string, { siteId: string; code: string; name: string; totalValue: number; articleCount: number; warehouseCount: number }>();
  for (const w of byWarehouse) {
    if (!w.site) continue;
    const acc = siteAgg.get(w.site.id) ?? {
      siteId: w.site.id,
      code: w.site.code,
      name: w.site.name,
      totalValue: 0,
      articleCount: 0,
      warehouseCount: 0,
    };
    acc.totalValue += Number(w.totalValue);
    acc.articleCount += w.articleCount;
    acc.warehouseCount += 1;
    siteAgg.set(w.site.id, acc);
  }
  const bySite = Array.from(siteAgg.values()).map((s) => ({
    ...s,
    totalValue: String(s.totalValue),
  }));

  // Historique entrées/sorties par chantier (90 derniers jours)
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const movements = await prisma.warehouseMovement.findMany({
    where: {
      warehouse: { tenantId: { in: tenantIds }, siteId: { not: null } },
      occurredAt: { gte: ninetyDaysAgo },
    },
    select: {
      direction: true,
      totalValue: true,
      occurredAt: true,
      warehouse: { select: { siteId: true, site: { select: { code: true, name: true } } } },
    },
    take: 5000,
  });

  // Agrège I/O par chantier
  const ioBySite = new Map<string, { siteId: string; code: string; name: string; inValue: number; outValue: number; inCount: number; outCount: number }>();
  for (const m of movements) {
    const siteId = m.warehouse.siteId;
    if (!siteId) continue;
    const acc = ioBySite.get(siteId) ?? {
      siteId,
      code: m.warehouse.site?.code ?? "?",
      name: m.warehouse.site?.name ?? "?",
      inValue: 0,
      outValue: 0,
      inCount: 0,
      outCount: 0,
    };
    if (m.direction === WarehouseMovementDirection.IN) {
      acc.inValue += Number(m.totalValue);
      acc.inCount += 1;
    } else {
      acc.outValue += Number(m.totalValue);
      acc.outCount += 1;
    }
    ioBySite.set(siteId, acc);
  }

  const history = Array.from(ioBySite.values())
    .map((s) => ({
      ...s,
      inValue: String(s.inValue),
      outValue: String(s.outValue),
    }))
    .sort((a, b) => Number(b.outValue) - Number(a.outValue));

  // Totaux globaux
  const totalStockValue = byWarehouse.reduce((s, w) => s + Number(w.totalValue), 0);
  const totalIn = Array.from(ioBySite.values()).reduce((s, x) => s + x.inValue, 0);
  const totalOut = Array.from(ioBySite.values()).reduce((s, x) => s + x.outValue, 0);

  return NextResponse.json({
    summary: {
      totalStockValue: String(totalStockValue),
      warehouseCount: byWarehouse.length,
      sitesWithStock: bySite.length,
      totalIn: String(totalIn),
      totalOut: String(totalOut),
      periodDays: 90,
    },
    byWarehouse,
    bySite,
    historyBySite: history,
  });
}
