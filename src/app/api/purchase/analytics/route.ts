import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const suppliers = await prisma.supplier.findMany({
    where: { tenantId: session.tenantId },
    select: { id: true, name: true, category: true, volumeYTD: true },
  });

  // Top 10 fournisseurs par volume YTD
  const top10 = suppliers
    .slice()
    .sort((a, b) => Number(b.volumeYTD - a.volumeYTD))
    .slice(0, 10)
    .map((s) => ({ name: s.name, category: s.category, volume: Number(s.volumeYTD) }));

  // Répartition par catégorie
  const byCategory = new Map<string, bigint>();
  for (const s of suppliers) {
    byCategory.set(s.category, (byCategory.get(s.category) ?? 0n) + s.volumeYTD);
  }

  // Évolution volume 24 mois (synthétisé)
  const today = new Date();
  const series = Array.from({ length: 24 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - 23 + i, 1);
    const seasonal = 1 + Math.sin((i / 12) * Math.PI * 2) * 0.12;
    const trend = 1 + (i / 24) * 0.08;
    return {
      period: d.toISOString().slice(0, 7),
      amount: Math.round(85_000_000 * seasonal * trend),
    };
  });

  // Évolution prix moyens des matières clés (simulés)
  const materials = [
    { name: "Ciment (50 kg)", currentPrice: 5800, variation12m: 6.2 },
    { name: "Fer à béton (kg)", currentPrice: 720, variation12m: -2.1 },
    { name: "Gravier (m³)", currentPrice: 18500, variation12m: 3.4 },
    { name: "Gasoil (litre)", currentPrice: 730, variation12m: 8.5 },
  ];

  return NextResponse.json({
    series,
    byCategory: Array.from(byCategory.entries()).map(([category, volume]) => ({
      category,
      volume: volume.toString(),
    })),
    top10,
    materials,
    summary: {
      totalSuppliers: suppliers.length,
      totalVolumeYTD: suppliers.reduce((s, x) => s + x.volumeYTD, 0n).toString(),
    },
  });
}
