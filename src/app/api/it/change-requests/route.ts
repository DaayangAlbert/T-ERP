import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardIt } from "@/lib/rbac/it-guard";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const guard = await guardIt();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  if (!session.tenantId) {
    return NextResponse.json({ error: "Tenant manquant" }, { status: 400 });
  }
  const tenantId = session.tenantId;

  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "PENDING";

  const [items, counts] = await Promise.all([
    prisma.profileChangeRequest.findMany({
      where: {
        tenantId,
        ...(status !== "all"
          ? { status: status as "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" }
          : {}),
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 50,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            position: true,
          },
        },
        reviewer: {
          select: { firstName: true, lastName: true },
        },
      },
    }),
    prisma.profileChangeRequest.groupBy({
      by: ["status"],
      where: { tenantId },
      _count: true,
    }),
  ]);

  const stats: Record<string, number> = {};
  for (const c of counts) stats[c.status] = c._count;

  return NextResponse.json({
    stats: {
      pending: stats.PENDING ?? 0,
      approved: stats.APPROVED ?? 0,
      rejected: stats.REJECTED ?? 0,
      cancelled: stats.CANCELLED ?? 0,
    },
    items: items.map((i) => ({
      id: i.id,
      status: i.status,
      reason: i.reason,
      changes: i.changes,
      reviewComment: i.reviewComment,
      reviewedAt: i.reviewedAt?.toISOString() ?? null,
      reviewer: i.reviewer
        ? `${i.reviewer.firstName} ${i.reviewer.lastName}`
        : null,
      createdAt: i.createdAt.toISOString(),
      user: i.user,
    })),
  });
}
