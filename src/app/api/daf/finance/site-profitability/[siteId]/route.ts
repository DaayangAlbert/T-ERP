import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getTenantScopeIds } from "@/lib/tenant";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.DAF, Role.DG, Role.TENANT_ADMIN];

export async function GET(_req: Request, { params }: { params: { siteId: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DAF / DG" }, { status: 403 });
  }

  const scopeIds = await getTenantScopeIds(session.tenantId);
  const site = await prisma.site.findFirst({
    where: { id: params.siteId, tenantId: { in: scopeIds } },
    select: {
      id: true,
      code: true,
      name: true,
      client: true,
      region: true,
      status: true,
      progress: true,
      budget: true,
      margin: true,
      type: true,
    },
  });
  if (!site) return NextResponse.json({ error: "Chantier introuvable" }, { status: 404 });

  const budget = Number(site.budget);
  const revenueYtd = Math.round(budget * (site.progress / 100) * 0.85);
  const totalCostBase = revenueYtd * (1 - Math.max(site.margin, 0) / 100);

  // Décomposition formation de la marge
  const breakdown = [
    { key: "purchases", label: "Achats matières", amount: Math.round(totalCostBase * 0.42), share: 42 },
    { key: "subcontracting", label: "Sous-traitance", amount: Math.round(totalCostBase * 0.22), share: 22 },
    { key: "direct_labor", label: "Main d'œuvre directe", amount: Math.round(totalCostBase * 0.18), share: 18 },
    { key: "fuel_energy", label: "Carburant et énergie", amount: Math.round(totalCostBase * 0.06), share: 6 },
    { key: "general_costs", label: "Frais généraux affectés", amount: Math.round(totalCostBase * 0.07), share: 7 },
    { key: "other", label: "Autres", amount: Math.round(totalCostBase * 0.05), share: 5 },
  ];

  const totalCost = breakdown.reduce((s, b) => s + b.amount, 0);
  const grossMargin = revenueYtd - totalCost;
  const marginPercent = revenueYtd === 0 ? 0 : (grossMargin / revenueYtd) * 100;

  return NextResponse.json({
    site: {
      id: site.id,
      code: site.code,
      name: site.name,
      client: site.client,
      region: site.region,
      status: site.status,
      progress: site.progress,
      type: site.type,
      budget: site.budget.toString(),
    },
    revenueYtd: revenueYtd.toString(),
    totalCost: totalCost.toString(),
    grossMargin: grossMargin.toString(),
    marginPercent,
    breakdown: breakdown.map((b) => ({ ...b, amount: b.amount.toString() })),
  });
}
