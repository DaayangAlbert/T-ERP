import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardOuv } from "@/lib/rbac/ouv-guard";

export const dynamic = "force-dynamic";

// GET /api/ouv/clock/disputes — Mes désaccords (contestés non encore résolus).
// Liste utilisée par la card ambré "Vous constatez un désaccord ?" + drawer
// historique des contestations pour suivi par l'ouvrier.
export async function GET() {
  const guard = guardOuv();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const disputes = await prisma.timeReport.findMany({
    where: {
      userId: session.sub,
      contestedAt: { not: null },
    },
    orderBy: { contestedAt: "desc" },
    take: 30,
    select: {
      id: true,
      date: true,
      arrivalTime: true,
      departureTime: true,
      totalHours: true,
      contestedAt: true,
      contestReason: true,
      resolvedAt: true,
      resolver: { select: { firstName: true, lastName: true } },
    },
  });

  return NextResponse.json({
    disputes: disputes.map((d) => ({
      id: d.id,
      date: d.date.toISOString(),
      arrivalTime: d.arrivalTime?.toISOString() ?? null,
      departureTime: d.departureTime?.toISOString() ?? null,
      totalHours: d.totalHours,
      contestedAt: d.contestedAt?.toISOString() ?? null,
      contestReason: d.contestReason,
      resolvedAt: d.resolvedAt?.toISOString() ?? null,
      resolvedBy: d.resolver
        ? `${d.resolver.firstName} ${d.resolver.lastName}`
        : null,
      status: d.resolvedAt ? "RESOLVED" : "PENDING",
    })),
  });
}
