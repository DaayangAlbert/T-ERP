import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardDtravSiteMutation } from "@/lib/rbac/dtrav-guard";
import { DeliveryStatus } from "@prisma/client";

const schema = z.object({
  deliveryNoteRef: z.string().optional(),
  items: z.array(z.object({
    articleCode: z.string(),
    label: z.string().optional(),
    expectedQty: z.coerce.number(),
    receivedQty: z.coerce.number(),
  })),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const delivery = await prisma.delivery.findUnique({ where: { id: params.id } });
  if (!delivery) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const guard = await guardDtravSiteMutation(delivery.siteId);
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation", issues: parsed.error.flatten() }, { status: 400 });
  }

  const items = parsed.data.items.map((it) => ({
    ...it,
    gap: it.receivedQty - it.expectedQty,
  }));
  const allReceivedFull = items.every((it) => it.receivedQty >= it.expectedQty);

  await prisma.delivery.update({
    where: { id: delivery.id },
    data: {
      status: allReceivedFull ? DeliveryStatus.RECEIVED : DeliveryStatus.PARTIALLY_RECEIVED,
      receivedAt: new Date(),
      receivedById: session.sub,
      deliveryNoteRef: parsed.data.deliveryNoteRef ?? delivery.deliveryNoteRef,
      items: items as unknown as object[],
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId!,
      userId: session.sub,
      action: "dtrav.delivery.receive",
      entityType: "Delivery",
      entityId: delivery.id,
      metadata: {
        siteId: delivery.siteId,
        deliveryNoteRef: parsed.data.deliveryNoteRef,
        gapCount: items.filter((i) => i.gap !== 0).length,
      },
    },
  });

  return NextResponse.json({ ok: true, status: allReceivedFull ? "RECEIVED" : "PARTIALLY_RECEIVED" });
}
