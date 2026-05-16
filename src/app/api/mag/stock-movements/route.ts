import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardMagWarehouse } from "@/lib/rbac/mag-guard";
import { WarehouseMovementDirection } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const guard = await guardMagWarehouse();
  if (guard instanceof NextResponse) return guard;
  const { warehouse } = guard;

  const url = new URL(req.url);
  const direction = url.searchParams.get("direction") as WarehouseMovementDirection | null;
  const articleId = url.searchParams.get("articleId");
  const search = url.searchParams.get("search")?.trim();
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const limit = Math.min(200, Math.max(10, Number(url.searchParams.get("limit") ?? "50")));

  const where: Record<string, unknown> = { warehouseId: warehouse.id };
  if (direction) where.direction = direction;
  if (articleId) where.articleId = articleId;
  if (from || to) {
    where.occurredAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }
  if (search) {
    where.OR = [
      { reference: { contains: search, mode: "insensitive" } },
      { notes: { contains: search, mode: "insensitive" } },
    ];
  }

  const items = await prisma.warehouseMovement.findMany({
    where,
    orderBy: { occurredAt: "desc" },
    take: limit,
    include: { article: { select: { code: true, name: true, unit: true } } },
  });

  // Compte par direction (pour les chips de filtre)
  const counts = await prisma.warehouseMovement.groupBy({
    by: ["direction"],
    where: { warehouseId: warehouse.id },
    _count: true,
  });

  return NextResponse.json({
    items: items.map((m) => ({
      id: m.id,
      direction: m.direction,
      reference: m.reference,
      reason: m.reason,
      articleCode: m.article.code,
      articleName: m.article.name,
      unit: m.article.unit,
      quantity: m.quantity,
      unitPrice: Number(m.unitPrice),
      totalValue: Number(m.totalValue),
      notes: m.notes,
      destinationTeamId: m.destinationTeamId,
      destinationUserId: m.destinationUserId,
      blPhoto: m.blPhoto,
      signaturePhoto: m.signaturePhoto,
      occurredAt: m.occurredAt.toISOString(),
    })),
    counts: {
      total: counts.reduce((s, c) => s + c._count, 0),
      byDirection: Object.fromEntries(counts.map((c) => [c.direction, c._count])),
    },
  });
}
