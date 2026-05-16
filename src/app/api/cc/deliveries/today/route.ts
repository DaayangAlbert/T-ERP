import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardCcSite } from "@/lib/rbac/cc-guard";
import { DeliveryStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await guardCcSite();
  if (guard instanceof NextResponse) return guard;
  const { siteId } = guard;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today.getTime() + 86_400_000);
  const yesterday = new Date(today.getTime() - 7 * 86_400_000);

  const [todays, recents] = await Promise.all([
    prisma.delivery.findMany({
      where: { siteId, scheduledAt: { gte: today, lt: tomorrow } },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.delivery.findMany({
      where: {
        siteId,
        status: DeliveryStatus.RECEIVED,
        receivedAt: { gte: yesterday },
      },
      orderBy: { receivedAt: "desc" },
      take: 5,
    }),
  ]);

  return NextResponse.json({
    today: todays.map((d) => ({
      id: d.id,
      scheduledAt: d.scheduledAt.toISOString(),
      receivedAt: d.receivedAt?.toISOString() ?? null,
      status: d.status,
      deliveryNoteRef: d.deliveryNoteRef,
      items: d.items,
    })),
    recent: recents.map((d) => ({
      id: d.id,
      scheduledAt: d.scheduledAt.toISOString(),
      receivedAt: d.receivedAt?.toISOString() ?? null,
      status: d.status,
      deliveryNoteRef: d.deliveryNoteRef,
    })),
  });
}
