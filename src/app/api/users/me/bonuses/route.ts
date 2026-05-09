import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const items = await prisma.performanceBonus.findMany({
    where: { userId: session.sub },
    orderBy: [{ fiscalYear: "desc" }, { bonusType: "asc" }],
  });

  return NextResponse.json({
    items: items.map((b) => ({
      id: b.id,
      fiscalYear: b.fiscalYear,
      bonusType: b.bonusType,
      formula: b.formula,
      targetAmount: b.targetAmount.toString(),
      actualAmount: b.actualAmount?.toString() ?? null,
      status: b.status,
      paidAt: b.paidAt?.toISOString() ?? null,
    })),
  });
}
