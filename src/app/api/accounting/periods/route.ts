import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const items = await prisma.accountingPeriod.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { period: "desc" },
    take: 24,
  });

  return NextResponse.json({
    items: items.map((p) => ({
      id: p.id,
      period: p.period,
      status: p.status,
      closedAt: p.closedAt?.toISOString() ?? null,
      closedBy: p.closedBy,
      totalEntries: p.totalEntries,
      totalDebit: p.totalDebit.toString(),
      totalCredit: p.totalCredit.toString(),
      balanced: p.totalDebit === p.totalCredit,
    })),
  });
}
