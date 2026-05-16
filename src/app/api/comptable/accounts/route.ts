import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const url = new URL(req.url);
  const search = url.searchParams.get("q")?.trim();

  const where: Record<string, unknown> = { tenantId: session.tenantId, active: true };
  if (search) {
    where.OR = [
      { code: { startsWith: search } },
      { name: { contains: search, mode: "insensitive" } },
    ];
  }

  const items = await prisma.chartOfAccounts.findMany({
    where,
    orderBy: { code: "asc" },
    take: 50,
    select: { code: true, name: true, class: true, type: true, requiresThirdParty: true },
  });

  return NextResponse.json({ items });
}
