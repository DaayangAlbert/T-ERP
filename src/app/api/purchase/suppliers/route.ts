import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const url = new URL(req.url);
  const strategic = url.searchParams.get("strategic") === "true";
  const search = url.searchParams.get("q")?.trim();

  const where: Record<string, unknown> = { tenantId: session.tenantId };
  if (strategic) where.strategic = true;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { category: { contains: search, mode: "insensitive" } },
    ];
  }

  const items = await prisma.supplier.findMany({
    where,
    orderBy: [{ strategic: "desc" }, { volumeYTD: "desc" }],
    take: 100,
  });

  return NextResponse.json({
    items: items.map((s) => ({
      id: s.id,
      name: s.name,
      category: s.category,
      paymentTerms: s.paymentTerms,
      ratingQuality: s.ratingQuality,
      ratingDelay: s.ratingDelay,
      ratingPrice: s.ratingPrice,
      strategic: s.strategic,
      blocked: s.blocked,
      blockReason: s.blockReason,
      volumeYTD: s.volumeYTD.toString(),
      poCount: s.poCount,
    })),
    summary: {
      total: items.length,
      strategic: items.filter((s) => s.strategic).length,
      blocked: items.filter((s) => s.blocked).length,
      totalVolumeYTD: items.reduce((sum, s) => sum + s.volumeYTD, 0n).toString(),
    },
  });
}
