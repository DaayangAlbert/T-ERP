import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardMagWarehouse } from "@/lib/rbac/mag-guard";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await guardMagWarehouse();
  if (guard instanceof NextResponse) return guard;
  const { warehouse } = guard;

  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 86_400_000);

  // Si le warehouse est de scope DIRECTION/CENTRAL (siteId null), il
  // n'a pas de livraisons chantier — on retourne une liste vide.
  if (!warehouse.site) {
    return NextResponse.json({ items: [] });
  }

  const items = await prisma.delivery.findMany({
    where: {
      siteId: warehouse.site.id,
      scheduledAt: { gte: startOfDay, lt: endOfDay },
    },
    orderBy: { scheduledAt: "asc" },
  });

  return NextResponse.json({
    items: items.map((d) => ({
      id: d.id,
      supplierId: d.supplierId,
      scheduledAt: d.scheduledAt.toISOString(),
      receivedAt: d.receivedAt?.toISOString() ?? null,
      status: d.status,
      deliveryNoteRef: d.deliveryNoteRef,
      items: d.items as unknown as Array<{ articleCode: string; label: string; expectedQty: number; receivedQty?: number }>,
    })),
  });
}
