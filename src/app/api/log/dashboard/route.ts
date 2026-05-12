import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getTenantScopeIds } from "@/lib/tenant";
import { Role, SiteStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.LOGISTICS, Role.DG, Role.DAF, Role.TENANT_ADMIN];

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé Logisticien" }, { status: 403 });
  }

  const scopeIds = await getTenantScopeIds(session.tenantId);
  const yearStart = new Date(new Date().getFullYear(), 0, 1);

  const [purchaseOrders, suppliers, frameworks, equipment, pendingTransfers, sites] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where: { tenantId: { in: scopeIds }, createdAt: { gte: yearStart } },
      select: { id: true, status: true, amount: true, category: true, supplier: { select: { name: true } } },
    }),
    prisma.supplier.findMany({
      where: { tenantId: session.tenantId, blocked: false },
      select: { id: true, name: true, volumeYTD: true, strategic: true },
    }),
    prisma.frameworkContract.findMany({
      where: { tenantId: session.tenantId, status: "ACTIVE" },
      select: { id: true, endDate: true, supplier: { select: { name: true } } },
    }),
    prisma.equipment.findMany({
      where: { tenantId: session.tenantId },
      select: { id: true, status: true, type: true, currentValue: true, designation: true },
    }),
    prisma.interSiteTransfer.findMany({
      where: { tenantId: session.tenantId, status: "PENDING" },
      include: {
        fromSite: { select: { code: true, name: true } },
        toSite: { select: { code: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 4,
    }),
    prisma.site.findMany({
      where: { tenantId: { in: scopeIds }, status: { not: SiteStatus.ARCHIVED } },
      select: { id: true, code: true, name: true, status: true },
    }),
  ]);

  // KPIs
  const inProgressPo = purchaseOrders.filter((p) => p.status === "DRAFT" || p.status === "PENDING_DAF" || p.status === "PENDING_DG" || p.status === "APPROVED");
  const toValidatePo = purchaseOrders.filter((p) => p.status === "DRAFT" || p.status === "PENDING_DAF");
  const n2DafPo = purchaseOrders.filter((p) => p.status === "PENDING_DAF" && Number(p.amount) > 5_000_000);

  const fleetActive = equipment.filter((e) => e.status === "IN_SERVICE").length;
  const fleetTotal = equipment.length;
  const fleetValue = equipment.reduce((s, e) => s + Number(e.currentValue), 0);

  // Achats YTD par catégorie (top 5)
  const byCategory = new Map<string, number>();
  for (const p of purchaseOrders) {
    if (p.status === "REJECTED" || p.status === "CANCELLED") continue;
    byCategory.set(p.category, (byCategory.get(p.category) ?? 0) + Number(p.amount));
  }
  const categoriesArr = Array.from(byCategory.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cat, val], i) => ({
      category: cat,
      value: val,
      color: ["#A855F7", "#3B82F6", "#F97316", "#10B981", "#EAB308"][i],
    }));
  const totalYtd = Array.from(byCategory.values()).reduce((s, v) => s + v, 0);

  // Top 5 fournisseurs par volume YTD
  const topSuppliers = suppliers
    .map((s) => ({ name: s.name, volume: Number(s.volumeYTD) }))
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 5);

  // Stocks top 6 chantiers (placeholder : valeur stock par chantier = aléatoire pour démo)
  const stocksTopSites = sites.slice(0, 6).map((s, i) => ({
    code: s.code,
    name: s.name,
    stockValue: 18_000_000 + i * 8_500_000 + Math.floor(Math.random() * 5_000_000),
    rupturesCount: i === 0 ? 4 : i === 1 ? 3 : i < 4 ? 2 : 1,
    status: s.status,
  }));

  // Alertes hiérarchisées
  const totalRuptures = stocksTopSites.reduce((s, x) => s + x.rupturesCount, 0);
  const expiringFramework = frameworks.filter((f) => {
    const days = Math.floor((f.endDate.getTime() - Date.now()) / 86400_000);
    return days >= 0 && days <= 60;
  });
  const brokenEquipment = equipment.filter((e) => e.status === "BREAKDOWN");

  const alerts: Array<{
    id: string;
    severity: "high" | "medium" | "low";
    title: string;
    details: string;
    link?: string;
  }> = [];
  if (totalRuptures > 0) {
    alerts.push({
      id: "ruptures",
      severity: "high",
      title: `${totalRuptures} ruptures imminentes consolidées (tous chantiers)`,
      details: `Top concentré sur ${stocksTopSites[0].name}`,
      link: "/log/bc",
    });
  }
  for (const e of brokenEquipment.slice(0, 1)) {
    alerts.push({
      id: `eq-${e.id}`,
      severity: "high",
      title: `${e.designation} en panne`,
      details: "Indisponibilité immédiate, à traiter avec garage",
      link: "/log/flotte",
    });
  }
  if (pendingTransfers.length > 0) {
    alerts.push({
      id: "transfers",
      severity: "medium",
      title: `${pendingTransfers.length} demandes transfert inter-chantiers en attente`,
      details: "Arbitrage requis",
      link: "/log/transferts",
    });
  }
  for (const f of expiringFramework.slice(0, 1)) {
    const days = Math.floor((f.endDate.getTime() - Date.now()) / 86400_000);
    alerts.push({
      id: `fc-${f.id}`,
      severity: "medium",
      title: `Contrat-cadre ${f.supplier.name} expire dans ${days} j`,
      details: "Anticiper renouvellement",
      link: "/log/fournisseurs",
    });
  }
  if (toValidatePo.length > 0) {
    alerts.push({
      id: "po-validate",
      severity: "low",
      title: `${toValidatePo.length} BC à valider${n2DafPo.length > 0 ? ` dont ${n2DafPo.length} N2 DAF` : ""}`,
      details: "À traiter dans les meilleurs délais",
      link: "/log/bc",
    });
  }

  return NextResponse.json({
    banner: {
      consolidatedStockValue: stocksTopSites.reduce((s, x) => s + x.stockValue, 0),
      sitesCount: sites.length,
    },
    greeting: {
      firstName: "Robert",
      poTracked: purchaseOrders.length,
      suppliersCount: suppliers.length,
      equipmentCount: fleetTotal,
      poToValidate: toValidatePo.length,
    },
    kpis: {
      poInProgress: inProgressPo.length,
      poToValidate: toValidatePo.length,
      poN2Daf: n2DafPo.length,
      fleetActive,
      fleetTotal,
      fleetAvailability: fleetTotal ? Math.round((fleetActive / fleetTotal) * 100) : 0,
      savingsYtd: 62_000_000,
    },
    alerts: alerts.slice(0, 5),
    purchasesByCategory: { items: categoriesArr, total: totalYtd },
    topSuppliers,
    stocksTopSites,
  });
}
