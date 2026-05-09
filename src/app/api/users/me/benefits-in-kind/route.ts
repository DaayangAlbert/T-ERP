import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const items = await prisma.benefitInKind.findMany({
    where: { userId: session.sub },
    orderBy: { startDate: "desc" },
  });

  const totalMonthly = items.reduce((s, b) => s + b.monthlyValue, 0n);
  const totalFiscal = items.reduce((s, b) => s + b.fiscalValue, 0n);

  return NextResponse.json({
    items: items.map((b) => ({
      id: b.id,
      type: b.type,
      description: b.description,
      monthlyValue: b.monthlyValue.toString(),
      fiscalValue: b.fiscalValue.toString(),
      startDate: b.startDate.toISOString(),
      endDate: b.endDate?.toISOString() ?? null,
    })),
    summary: {
      total: items.length,
      totalMonthly: totalMonthly.toString(),
      totalFiscal: totalFiscal.toString(),
      totalAnnual: (totalMonthly * 12n).toString(),
    },
  });
}
