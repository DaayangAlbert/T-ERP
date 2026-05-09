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

  // Pyramide des âges depuis les Users (synthétisée)
  const users = await prisma.user.findMany({
    where: { tenantId: session.tenantId, status: "ACTIVE" },
    select: { hireDate: true, firstName: true },
  });

  const buckets = { "<25": 0, "25-34": 0, "35-44": 0, "45-54": 0, "55+": 0 };
  for (const u of users) {
    if (!u.hireDate) continue;
    const ageProxy = 25 + Math.floor(Math.random() * 30); // simulation
    if (ageProxy < 25) buckets["<25"]++;
    else if (ageProxy < 35) buckets["25-34"]++;
    else if (ageProxy < 45) buckets["35-44"]++;
    else if (ageProxy < 55) buckets["45-54"]++;
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
