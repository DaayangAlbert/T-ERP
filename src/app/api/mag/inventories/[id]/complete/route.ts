import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardMagWarehouseMutation } from "@/lib/rbac/mag-guard";
import { WarehouseInventoryStatus } from "@prisma/client";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const guard = await guardMagWarehouseMutation();
  if (guard instanceof NextResponse) return guard;
  const { warehouse, session } = guard;

  const inventory = await prisma.warehouseInventory.findFirst({
    where: { id: params.id, warehouseId: warehouse.id },
    include: { lines: true },
  });
  if (!inventory) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (inventory.status === WarehouseInventoryStatus.COMPLETED) {
    return NextResponse.json({ error: "Déjà clôturé" }, { status: 409 });
  }

  const totalGapValue = inventory.lines.reduce((s, l) => s + Number(l.gapValue), 0);

  await prisma.warehouseInventory.update({
    where: { id: inventory.id },
    data: {
      status: WarehouseInventoryStatus.PENDING_VALIDATION,
      completedAt: new Date(),
      completedById: session.sub,
      totalGapValue: BigInt(totalGapValue),
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userId: session.sub,
      action: "warehouse.inventory.submit",
      entityType: "WarehouseInventory",
      entityId: inventory.id,
      metadata: { totalGapValue, lineCount: inventory.lines.length },
    },
  });

  return NextResponse.json({ ok: true, totalGapValue });
}
