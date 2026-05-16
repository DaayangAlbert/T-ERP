import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardMagWarehouse, guardMagWarehouseMutation } from "@/lib/rbac/mag-guard";
import { ArticleCategory, WarehouseInventoryType, WarehouseInventoryStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  type: z.nativeEnum(WarehouseInventoryType),
  scope: z.string().default("all"), // "all" | "category:CEMENT_CONCRETE" | "article:..."
  plannedDate: z.string().optional(),
});

export async function GET() {
  const guard = await guardMagWarehouse();
  if (guard instanceof NextResponse) return guard;
  const { warehouse } = guard;

  const items = await prisma.warehouseInventory.findMany({
    where: { warehouseId: warehouse.id },
    orderBy: { plannedDate: "desc" },
    take: 50,
  });

  return NextResponse.json({
    items: items.map((i) => ({
      id: i.id,
      type: i.type,
      scope: i.scope,
      plannedDate: i.plannedDate.toISOString(),
      startedAt: i.startedAt?.toISOString() ?? null,
      completedAt: i.completedAt?.toISOString() ?? null,
      status: i.status,
      totalGapValue: Number(i.totalGapValue),
    })),
  });
}

export async function POST(req: Request) {
  const guard = await guardMagWarehouseMutation();
  if (guard instanceof NextResponse) return guard;
  const { warehouse, session } = guard;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation", issues: parsed.error.flatten() }, { status: 400 });
  }

  // Sélection des stocks à inventorier selon le scope
  const stockWhere: Record<string, unknown> = { warehouseId: warehouse.id };
  if (parsed.data.scope.startsWith("category:")) {
    const cat = parsed.data.scope.slice("category:".length) as ArticleCategory;
    stockWhere.article = { category: cat };
  } else if (parsed.data.scope.startsWith("article:")) {
    const code = parsed.data.scope.slice("article:".length);
    stockWhere.article = { code };
  }

  const stocks = await prisma.warehouseStock.findMany({
    where: stockWhere,
    include: { article: true },
  });

  if (stocks.length === 0) {
    return NextResponse.json({ error: "Aucun article à inventorier sur ce scope" }, { status: 400 });
  }

  const inventory = await prisma.warehouseInventory.create({
    data: {
      warehouseId: warehouse.id,
      type: parsed.data.type,
      scope: parsed.data.scope,
      plannedDate: parsed.data.plannedDate ? new Date(parsed.data.plannedDate) : new Date(),
      startedAt: new Date(),
      status: WarehouseInventoryStatus.IN_PROGRESS,
      lines: {
        create: stocks.map((s) => ({
          articleId: s.articleId,
          theoreticalQty: s.quantity,
          countedQty: 0,
          gap: -s.quantity,
          gapValue: BigInt(0),
        })),
      },
    },
    include: { lines: true },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userId: session.sub,
      action: "warehouse.inventory.start",
      entityType: "WarehouseInventory",
      entityId: inventory.id,
      metadata: { type: parsed.data.type, scope: parsed.data.scope, lineCount: stocks.length },
    },
  });

  return NextResponse.json({ id: inventory.id, lineCount: inventory.lines.length }, { status: 201 });
}
