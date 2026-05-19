import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardMagWarehouse } from "@/lib/rbac/mag-guard";
import { ArticleCategory } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const guard = await guardMagWarehouse();
  if (guard instanceof NextResponse) return guard;
  const { warehouse, tenantIds } = guard;

  const url = new URL(req.url);
  const search = url.searchParams.get("search")?.trim();
  const category = url.searchParams.get("category") as ArticleCategory | null;
  const onlyRuptures = url.searchParams.get("onlyRuptures") === "1";
  const inStockOnly = url.searchParams.get("inStockOnly") === "1";
  const limit = Math.min(500, Math.max(20, Number(url.searchParams.get("limit") ?? "50")));

  // Pour les rôles globaux sur un tenant holding, on lit aussi les filiales :
  // les articles des chantiers sont logés sur les tenants filles.
  const where: Record<string, unknown> = { tenantId: { in: tenantIds }, active: true };
  if (category) where.category = category;
  if (search) {
    where.OR = [
      { code: { contains: search, mode: "insensitive" } },
      { name: { contains: search, mode: "insensitive" } },
    ];
  }

  const articles = await prisma.article.findMany({
    where,
    orderBy: [{ category: "asc" }, { code: "asc" }],
    take: limit,
  });

  const stockIds = articles.map((a) => a.id);
  const stocks = await prisma.warehouseStock.findMany({
    where: { warehouseId: warehouse.id, articleId: { in: stockIds } },
  });
  const stockByArticle = new Map(stocks.map((s) => [s.articleId, s]));

  let items = articles.map((a) => {
    const s = stockByArticle.get(a.id);
    return {
      id: a.id,
      code: a.code,
      name: a.name,
      category: a.category,
      unit: a.unit,
      defaultSupplierId: a.defaultSupplierId,
      stockQuantity: s?.quantity ?? 0,
      pmpUnitPrice: s ? Number(s.pmpUnitPrice) : 0,
      totalValue: s ? Number(s.totalValue) : 0,
      minThreshold: s?.minThreshold ?? null,
      isRupture: s?.minThreshold !== null && s?.minThreshold !== undefined && (s.quantity ?? 0) <= s.minThreshold,
    };
  });

  if (onlyRuptures) items = items.filter((i) => i.isRupture);
  if (inStockOnly) items = items.filter((i) => i.stockQuantity > 0);

  // Comptage par catégorie sur le périmètre étendu (tenant + filiales)
  const totals = await prisma.article.groupBy({
    by: ["category"],
    where: { tenantId: { in: tenantIds }, active: true },
    _count: true,
  });

  return NextResponse.json({
    items,
    totals: {
      all: articles.length,
      byCategory: Object.fromEntries(totals.map((t) => [t.category, t._count])),
    },
  });
}
