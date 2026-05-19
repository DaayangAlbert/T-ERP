import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardCcSiteMutation } from "@/lib/rbac/cc-guard";
import { DeliveryStatus, ReceiptStatus } from "@prisma/client";

const itemSchema = z.object({
  articleCode: z.string(),
  label: z.string(),
  expectedQty: z.coerce.number(),
  receivedQty: z.coerce.number(),
  accepted: z.boolean().default(true),
});

const schema = z.object({
  blNumber: z.string().optional(),
  blPhotoUrl: z.string().optional(),
  items: z.array(itemSchema),
  notes: z.string().optional(),
  clientUuid: z.string().optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const guard = await guardCcSiteMutation();
  if (guard instanceof NextResponse) return guard;
  const { session, siteId } = guard;

  const delivery = await prisma.delivery.findFirst({
    where: {
      id: params.id,
      siteId,
      site: { tenantId: session.tenantId! },
    },
  });
  if (!delivery) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation", issues: parsed.error.flatten() }, { status: 400 });
  }

  const items = parsed.data.items.map((it) => ({
    ...it,
    gap: it.receivedQty - it.expectedQty,
  }));
  const allFull = items.every((it) => it.receivedQty >= it.expectedQty && it.accepted);
  const anyRejected = items.some((it) => !it.accepted);
  let overallStatus: ReceiptStatus = ReceiptStatus.CONFORM;
  if (anyRejected && allFull) overallStatus = ReceiptStatus.PARTIAL_REJECTION;
  else if (!allFull) overallStatus = ReceiptStatus.DAMAGED;

  await prisma.deliveryReceipt.upsert({
    where: { deliveryId: delivery.id },
    create: {
      deliveryId: delivery.id,
      receivedAt: new Date(),
      receivedById: session.sub,
      blNumber: parsed.data.blNumber ?? null,
      blPhotoUrl: parsed.data.blPhotoUrl ?? null,
      items: items as unknown as object[],
      overallStatus,
      notes: parsed.data.notes ?? null,
      clientUuid: parsed.data.clientUuid ?? null,
    },
    update: {
      receivedAt: new Date(),
      blNumber: parsed.data.blNumber ?? null,
      blPhotoUrl: parsed.data.blPhotoUrl ?? null,
      items: items as unknown as object[],
      overallStatus,
      notes: parsed.data.notes ?? null,
    },
  });

  await prisma.delivery.update({
    where: { id: delivery.id },
    data: {
      status: allFull ? DeliveryStatus.RECEIVED : DeliveryStatus.PARTIALLY_RECEIVED,
      receivedAt: new Date(),
      receivedById: session.sub,
      deliveryNoteRef: parsed.data.blNumber ?? delivery.deliveryNoteRef,
      items: items as unknown as object[],
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId!,
      userId: session.sub,
      action: "cc.delivery.receive",
      entityType: "Delivery",
      entityId: delivery.id,
      metadata: { siteId, status: overallStatus, gapItems: items.filter((i) => i.gap !== 0).length },
    },
  });

  return NextResponse.json({ ok: true, overallStatus });
}
