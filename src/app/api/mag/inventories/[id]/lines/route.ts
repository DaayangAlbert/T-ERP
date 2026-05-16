import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardMagWarehouse, guardMagWarehouseMutation } from "@/lib/rbac/mag-guard";

export const dynamic = "force-dynamic";

const lineUpdateSchema = z.object({
  lineId: z.string(),
  countedQty: z.coerce.number().nonnegative(),
  justification: z.string().optional(),
});

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const guard = await guardMagWarehouse();
  if (guard instanceof NextResponse) return guard;
  const { warehouse } = guard;

  const inventory = await prisma.warehouseInventory.findFirst({
    where: { id: params.id, warehouseId: warehouse.id },
    include: {
      lines: {
        include: { article: { select: { code: true, name: true, unit: true, category: true } } },
      },
    },
  });
  if (!inventory) return NextResponse.json({ error: "Inventaire introuvable" }, { status: 404 });

  return NextResponse.json({
    inventory: {
      id: inventory.id,
      type: inventory.type,
      scope: inventory.scope,
      status: inventory.status,
      startedAt: inventory.startedAt?.toISOString() ?? null,
      completedAt: inventory.completedAt?.toISOString() ?? null,
    },
    lines: inventory.lines.map((l) => ({
      id: l.id,
      articleCode: l.article.code,
      articleName: l.article.name,
      unit: l.article.unit,
      category: l.article.category,
      theoreticalQty: l.theoreticalQty,
      countedQty: l.countedQty,
      gap: l.gap,
      gapValue: Number(l.gapValue),
      justification: l.justification,
    })),
  });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const guard = await guardMagWarehouseMutation();
  if (guard instanceof NextResponse) return guard;
  const { warehouse, session } = guard;

  const parsed = lineUpdateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation", issues: parsed.error.flatten() }, { status: 400 });
  }

  const line = await prisma.warehouseInventoryLine.findFirst({
    where: { id: parsed.data.lineId, inventory: { id: params.id, warehouseId: warehouse.id } },
    include: { inventory: true },
  });
  if (!line) return NextResponse.json({ error: "Ligne introuvable" }, { status: 404 });

  const stock = await prisma.warehouseStock.findUnique({
    where: { warehouseId_articleId: { warehouseId: warehouse.id, articleId: line.articleId } },
  });
  const pmp = stock ? Number(stock.pmpUnitPrice) : 0;
  const gap = parsed.data.countedQty - line.theoreticalQty;
  const gapValue = Math.round(gap * pmp);

  const updated = await prisma.warehouseInventoryLine.update({
    where: { id: line.id },
    data: {
      countedQty: parsed.data.countedQty,
      gap,
      gapValue: BigInt(gapValue),
      justification: parsed.data.justification ?? null,
      countedAt: new Date(),
      countedById: session.sub,
    },
  });

  return NextResponse.json({
    id: updated.id,
    gap: updated.gap,
    gapValue: Number(updated.gapValue),
  });
}
