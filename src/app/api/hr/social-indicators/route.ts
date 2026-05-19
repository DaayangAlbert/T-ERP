import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const indicators = await prisma.socialIndicator.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { period: "desc" },
    take: 12,
  });

  // Pyramide des âges depuis les Users (basée sur dateOfBirth réel)
  const users = await prisma.user.findMany({
    where: { tenantId: session.tenantId, status: "ACTIVE" },
    select: { dateOfBirth: true },
  });

  const buckets = { "<25": 0, "25-34": 0, "35-44": 0, "45-54": 0, "55+": 0, "N/A": 0 };
  const now = Date.now();
  for (const u of users) {
    if (!u.dateOfBirth) {
      buckets["N/A"]++;
      continue;
    }
    const age = Math.floor((now - u.dateOfBirth.getTime()) / (365.25 * 86_400_000));
    if (age < 25) buckets["<25"]++;
    else if (age < 35) buckets["25-34"]++;
    else if (age < 45) buckets["35-44"]++;
    else if (age < 55) buckets["45-54"]++;
    else buckets["55+"]++;
  }

  // Le dernier indicateur ou un fallback
  const latest = indicators[0]?.indicators ?? null;

  return NextResponse.json({
    timeseries: indicators.reverse().map((i) => ({
      period: i.period,
      indicators: i.indicators,
    })),
    latest,
    agePyramid: Object.entries(buckets).map(([range, count]) => ({ range, count })),
    headcountActive: users.length,
  });
}
