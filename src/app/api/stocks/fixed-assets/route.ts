import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { AssetCategory } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const url = new URL(req.url);
  const category = url.searchParams.get("category") as AssetCategory | null;

  const where: Record<string, unknown> = { tenantId: session.tenantId };
  if (category) where.category = category;

  const items = await prisma.fixedAsset.findMany({
    where,
    orderBy: { netValue: "desc" },
  });

  // Plan de renouvellement : engins arrivant en fin de vie 12-24 mois
  const now = Date.now();
  const renewalPlan = items
    .map((a) => {
      const ageMonths = Math.floor((now - a.acquisitionDate.getTime()) / (30 * 86_400_000));
      const remainingMonths = a.usefulLifeMonths - ageMonths;
      return { asset: a, remainingMonths };
    })
    .filter((x) => x.remainingMonths > 0 && x.remainingMonths <= 24)
    .sort((a, b) => a.remainingMonths - b.remainingMonths);

  // Répartition par catégorie
  const byCategory = new Map<string, { count: number; totalNV: bigint }>();
  for (const a of items) {
    const e = byCategory.get(a.category) ?? { count: 0, totalNV: 0n };
    e.count++;
    e.totalNV += a.netValue;
    byCategory.set(a.category, e);
  }

  const totalNV = items.reduce((s, a) => s + a.netValue, 0n);
  const totalGross = items.reduce((s, a) => s + a.grossValue, 0n);

  return NextResponse.json({
    items: items.map((a) => ({
      id: a.id,
      code: a.code,
      description: a.description,
      category: a.category,
      acquisitionDate: a.acquisitionDate.toISOString(),
      grossValue: a.grossValue.toString(),
      accumulatedDepreciation: a.accumulatedDepreciation.toString(),
      netValue: a.netValue.toString(),
      usefulLifeMonths: a.usefulLifeMonths,
      siteId: a.siteId,
      condition: a.condition,
      insurance: a.insurance,
      lastRevaluedAt: a.lastRevaluedAt?.toISOString() ?? null,
    })),
    summary: {
      total: items.length,
      totalGross: totalGross.toString(),
      totalNetValue: totalNV.toString(),
    },
    byCategory: Array.from(byCategory.entries()).map(([category, v]) => ({
      category,
      count: v.count,
      netValue: v.totalNV.toString(),
    })),
    renewalPlan: renewalPlan.map((x) => ({
      id: x.asset.id,
      code: x.asset.code,
      description: x.asset.description,
      category: x.asset.category,
      remainingMonths: x.remainingMonths,
      netValue: x.asset.netValue.toString(),
    })),
  });
}
