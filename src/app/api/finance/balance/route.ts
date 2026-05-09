import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const url = new URL(req.url);
  const period = url.searchParams.get("period") ?? new Date().toISOString().slice(0, 7);

  const fp = await prisma.financialPeriod.findFirst({
    where: { tenantId: session.tenantId, period },
  });
  if (!fp) return NextResponse.json({ error: "Aucune donnée" }, { status: 404 });

  return NextResponse.json({
    period,
    balance: fp.balance,
    locked: fp.locked,
  });
}
