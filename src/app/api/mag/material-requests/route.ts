import { NextResponse } from "next/server";
import { MaterialRequestStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { guardMagWarehouse } from "@/lib/rbac/mag-guard";

export const dynamic = "force-dynamic";

/**
 * Liste les demandes de matériel reçues par les magasin(s) accessibles.
 * Filtres possibles : ?status=PENDING|FULFILLED|...
 */
export async function GET(req: Request) {
  const guard = await guardMagWarehouse();
  if (guard instanceof NextResponse) return guard;
  const { allWarehouses } = guard;

  const url = new URL(req.url);
  const statusFilter = url.searchParams.get("status") as MaterialRequestStatus | null;

  const where: { warehouseId: { in: string[] }; status?: MaterialRequestStatus } = {
    warehouseId: { in: allWarehouses.map((w) => w.id) },
  };
  if (statusFilter) where.status = statusFilter;

  const items = await prisma.materialRequest.findMany({
    where,
    orderBy: [
      { status: "asc" },
      { priority: "desc" },
      { createdAt: "asc" },
    ],
    take: 80,
    include: {
      site: { select: { id: true, code: true, name: true } },
      warehouse: { select: { id: true, code: true, name: true } },
      requester: {
        select: { id: true, firstName: true, lastName: true, avatarUrl: true, phoneMobile: true },
      },
      lines: {
        include: {
          article: { select: { id: true, code: true, name: true, unit: true, category: true } },
        },
      },
    },
  });

  // Pour chaque ligne, on enrichit avec le stock disponible
  const articleIds = Array.from(
    new Set(items.flatMap((r) => r.lines.map((l) => l.articleId))),
  );
  const warehouseIds = Array.from(new Set(items.map((r) => r.warehouseId)));
  const stocks =
    articleIds.length && warehouseIds.length
      ? await prisma.warehouseStock.findMany({
          where: {
            articleId: { in: articleIds },
            warehouseId: { in: warehouseIds },
          },
          select: { warehouseId: true, articleId: true, quantity: true },
        })
      : [];
  const stockKey = (w: string, a: string) => `${w}|${a}`;
  const stockByKey = new Map(
    stocks.map((s) => [stockKey(s.warehouseId, s.articleId), s.quantity]),
  );

  const pendingCount = items.filter((r) => r.status === MaterialRequestStatus.PENDING).length;

  return NextResponse.json({
    items: items.map((r) => ({
      id: r.id,
      reference: r.reference,
      status: r.status,
      priority: r.priority,
      reason: r.reason,
      notes: r.notes,
      site: r.site,
      warehouse: r.warehouse,
      requester: {
        id: r.requester.id,
        fullName: `${r.requester.firstName} ${r.requester.lastName}`,
        avatarUrl: r.requester.avatarUrl,
        phoneMobile: r.requester.phoneMobile,
      },
      fulfilledAt: r.fulfilledAt?.toISOString() ?? null,
      rejectionReason: r.rejectionReason,
      createdAt: r.createdAt.toISOString(),
      lines: r.lines.map((l) => ({
        id: l.id,
        article: l.article,
        quantityRequested: l.quantityRequested,
        quantityFulfilled: l.quantityFulfilled,
        availableInStock: stockByKey.get(stockKey(r.warehouseId, l.articleId)) ?? 0,
        notes: l.notes,
      })),
    })),
    summary: { pendingCount, totalCount: items.length },
  });
}
