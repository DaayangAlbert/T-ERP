import { NextResponse } from "next/server";
import { type Prisma, type WarehouseScope, type Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Stocks détaillés par magasin (chantier ou direction), avec filtres
 * cohérents avec le composant WarehouseFilter.
 *
 * Query params :
 *   - scope : CHANTIER | DIRECTION | CENTRAL
 *   - siteId : id d'un chantier précis
 *   - ownerDirection : Role (DG, DAF, ...) pour magasins DIRECTION
 *   - warehouseId : id d'un magasin précis (override les autres filtres)
 *   - search : recherche libre sur code/nom article
 *   - category : ArticleCategory pour filtrer
 *   - onlyRuptures : true → ne renvoie que les articles en dessous du
 *     seuil minimum (rupture imminente)
 *
 * Retourne une liste plate de lignes (article × magasin) + un résumé
 * de la sélection (nb magasins, valeur totale, nb ruptures).
 */
export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!session.tenantId) return NextResponse.json({ items: [], summary: emptySummary() });

  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") as WarehouseScope | null;
  const siteId = url.searchParams.get("siteId");
  const ownerDirection = url.searchParams.get("ownerDirection") as Role | null;
  const warehouseId = url.searchParams.get("warehouseId");
  const search = url.searchParams.get("search")?.trim();
  const category = url.searchParams.get("category");
  const onlyRuptures = url.searchParams.get("onlyRuptures") === "true";

  // 1) Résout l'ensemble des warehouses concernés.
  const warehouseWhere: Prisma.WarehouseWhereInput = { tenantId: session.tenantId };
  if (scope) warehouseWhere.scope = scope;
  if (siteId) warehouseWhere.siteId = siteId;
  if (ownerDirection) warehouseWhere.ownerDirection = ownerDirection;
  if (warehouseId) warehouseWhere.id = warehouseId;

  const warehouses = await prisma.warehouse.findMany({
    where: warehouseWhere,
    select: {
      id: true,
      code: true,
      name: true,
      scope: true,
      ownerDirection: true,
      site: { select: { id: true, code: true, name: true } },
    },
    orderBy: [{ scope: "asc" }, { name: "asc" }],
  });

  if (warehouses.length === 0) {
    return NextResponse.json({ items: [], summary: emptySummary() });
  }

  // 2) Récupère tous les WarehouseStock pour ces magasins.
  const stockWhere: Prisma.WarehouseStockWhereInput = {
    warehouseId: { in: warehouses.map((w) => w.id) },
  };
  if (search) {
    stockWhere.article = {
      OR: [
        { code: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
      ],
    };
  }
  if (category) {
    stockWhere.article = { ...(stockWhere.article ?? {}), category: category as never };
  }

  const stocks = await prisma.warehouseStock.findMany({
    where: stockWhere,
    select: {
      id: true,
      warehouseId: true,
      quantity: true,
      pmpUnitPrice: true,
      totalValue: true,
      minThreshold: true,
      lastInAt: true,
      lastOutAt: true,
      article: {
        select: { id: true, code: true, name: true, category: true, unit: true },
      },
    },
    orderBy: [{ article: { name: "asc" } }],
  });

  // 3) Indexe les warehouses pour annoter les lignes.
  const warehouseById = new Map(warehouses.map((w) => [w.id, w]));

  // 4) Construit les items + filtre éventuel ruptures.
  let items = stocks.map((s) => {
    const w = warehouseById.get(s.warehouseId);
    const isRupture =
      s.minThreshold !== null && s.quantity <= (s.minThreshold ?? 0);
    return {
      id: s.id,
      article: s.article,
      quantity: s.quantity,
      unit: s.article.unit,
      pmpUnitPrice: s.pmpUnitPrice.toString(),
      totalValue: s.totalValue.toString(),
      minThreshold: s.minThreshold,
      lastInAt: s.lastInAt?.toISOString() ?? null,
      lastOutAt: s.lastOutAt?.toISOString() ?? null,
      isRupture,
      warehouse: w
        ? {
            id: w.id,
            code: w.code,
            name: w.name,
            scope: w.scope,
            ownerDirection: w.ownerDirection,
            site: w.site,
          }
        : null,
    };
  });

  if (onlyRuptures) items = items.filter((s) => s.isRupture);

  // 5) Résumé global de la sélection.
  const totalValue = items.reduce((acc, s) => acc + Number(s.totalValue), 0);
  const rupturesCount = items.filter((s) => s.isRupture).length;

  return NextResponse.json({
    items,
    summary: {
      warehouseCount: warehouses.length,
      articleCount: items.length,
      totalValue,
      rupturesCount,
    },
    // Liste des magasins de la sélection (utile pour grouper côté UI).
    warehouses: warehouses.map((w) => ({
      id: w.id,
      code: w.code,
      name: w.name,
      scope: w.scope,
      ownerDirection: w.ownerDirection,
      site: w.site,
    })),
  });
}

function emptySummary() {
  return { warehouseCount: 0, articleCount: 0, totalValue: 0, rupturesCount: 0 };
}
