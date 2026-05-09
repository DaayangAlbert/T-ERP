import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const periods = await prisma.financialPeriod.findMany({
    where: { tenantId: session.tenantId, period: { not: { contains: "BUDGET" } } },
    orderBy: { period: "asc" },
    take: 24,
  });

  const series = periods.map((p) => {
    const bfr = p.bfr as unknown as { dso: number; dpo: number; stockRotation: number; bfr: number; treasury: number };
    return {
      period: p.period,
      dso: bfr.dso,
      dpo: bfr.dpo,
      stockRotation: bfr.stockRotation,
      bfr: bfr.bfr,
      treasury: bfr.treasury,
    };
  });

  return NextResponse.json({
    series,
    benchmark: { dso: 65, dpo: 50, stockRotation: 18 },
    latest: series[series.length - 1] ?? null,
  });
}
