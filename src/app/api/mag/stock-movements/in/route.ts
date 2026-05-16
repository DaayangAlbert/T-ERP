import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardMagWarehouseMutation } from "@/lib/rbac/mag-guard";
import { WarehouseMovementDirection, WarehouseMovementReason } from "@prisma/client";

export const dynamic = "force-dynamic";

const inSchema = z.object({
  articleId: z.string(),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().positive(),
  reference: z.string().min(1),
  reason: z.nativeEnum(WarehouseMovementReason).default(WarehouseMovementReason.PURCHASE_DELIVERY),
  supplierId: z.string().optional().nullable(),
  deliveryId: z.string().optional().nullable(),
  notes: z.string().optional(),
  blPhoto: z.string().optional(),
  occurredAt: z.string().optional(),
  clientUuid: z.string().optional(),
});

export async function POST(req: Request) {
  const guard = await guardMagWarehouseMutation();
  if (guard instanceof NextResponse) return guard;
  const { warehouse, session } = guard;

  const parsed = inSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation", issues: parsed.error.flatten() }, { status: 400 });
  }

  const article = await prisma.article.findFirst({ where: { id: parsed.data.articleId } });
  if (!article) return NextResponse.json({ error: "Article introuvable" }, { status: 404 });

  // Calcul du PMP : (stock × pmp + qty × prix) / (stock + qty)
  const stock = await prisma.warehouseStock.findUnique({
    where: { warehouseId_articleId: { warehouseId: warehouse.id, articleId: article.id } },
  });

  const previousQty = stock?.quantity ?? 0;
  const previousPmp = stock ? Number(stock.pmpUnitPrice) : 0;
  const newQty = previousQty + parsed.data.quantity;
  const newPmp = newQty > 0
    ? (previousQty * previousPmp + parsed.data.quantity * parsed.data.unitPrice) / newQty
    : parsed.data.unitPrice;
  const newTotalValue = Math.round(newQty * newPmp);

  const totalValue = Math.round(parsed.data.quantity * parsed.data.unitPrice);

  const result = await prisma.$transaction(async (tx) => {
    const movement = await tx.warehouseMovement.create({
      data: {
        warehouseId: warehouse.id,
        articleId: article.id,
        direction: WarehouseMovementDirection.IN,
        quantity: parsed.data.quantity,
        unitPrice: BigInt(Math.round(parsed.data.unitPrice)),
        totalValue: BigInt(totalValue),
        reference: parsed.data.reference,
        reason: parsed.data.reason,
        supplierId: parsed.data.supplierId ?? null,
        deliveryId: parsed.data.deliveryId ?? null,
        blPhoto: parsed.data.blPhoto ?? null,
        notes: parsed.data.notes ?? null,
        recordedById: session.sub,
        occurredAt: parsed.data.occurredAt ? new Date(parsed.data.occurredAt) : new Date(),
        clientUuid: parsed.data.clientUuid ?? null,
      },
    });

    await tx.warehouseStock.upsert({
      where: { warehouseId_articleId: { warehouseId: warehouse.id, articleId: article.id } },
      create: {
        warehouseId: warehouse.id,
        articleId: article.id,
        quantity: parsed.data.quantity,
        pmpUnitPrice: BigInt(Math.round(parsed.data.unitPrice)),
        totalValue: BigInt(totalValue),
        lastInAt: new Date(),
      },
      update: {
        quantity: newQty,
        pmpUnitPrice: BigInt(Math.round(newPmp)),
        totalValue: BigInt(newTotalValue),
        lastInAt: new Date(),
      },
    });

    return movement;
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userId: session.sub,
      action: "warehouse.movement.in",
      entityType: "WarehouseMovement",
      entityId: result.id,
      metadata: {
        articleCode: article.code,
        quantity: parsed.data.quantity,
        unitPrice: parsed.data.unitPrice,
        newPmp: Math.round(newPmp),
      },
    },
  });

  return NextResponse.json({
    id: result.id,
    newStock: newQty,
    newPmp: Math.round(newPmp),
    totalValue: newTotalValue,
  }, { status: 201 });
}
