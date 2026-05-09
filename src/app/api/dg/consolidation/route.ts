import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role, SiteStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const FRENCH_MONTHS = ["Janv", "Févr", "Mars", "Avril", "Mai", "Juin", "Juil", "Août", "Sept", "Oct", "Nov", "Déc"];

function pastTwelveMonthLabels(now: Date): string[] {
  const labels: string[] = [];
  const month = now.getMonth();
  for (let i = 11; i >= 0; i--) {
    labels.push(FRENCH_MONTHS[(month - i + 12) % 12]);
  }
  return labels;
}

/**
 * Phase 2 / fn 1.2 — Vue consolidée groupe.
 *
 * Réservée au DG du tenant mère (isGroup=true).
 * Agrège : KPIs groupe, KPIs par filiale, série mensuelle 12 mois empilée
 * par filiale, transactions intra-groupe (synthétisées — pas de table dédiée).
 */
export async function GET() {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!session.tenantId) return NextResponse.json({ error: "Tenant requis" }, { status: 403 });
  if (session.role !== Role.DG) {
    return NextResponse.json({ error: "Réservé au Directeur Général" }, { status: 403 });
  }

  const parent = await prisma.tenant.findUnique({
    where: { id: session.tenantId },
    select: {
      id: true,
      slug: true,
      name: true,
      isGroup: true,
      primaryColor: true,
      sector: true,
      children: {
        select: {
          id: true,
          slug: true,
          name: true,
          primaryColor: true,
          sector: true,
        },
      },
    },
  });

  if (!parent) return NextResponse.json({ error: "Tenant introuvable" }, { status: 404 });
  if (!parent.isGroup) {
    return NextResponse.json(
      { error: "Ce tenant n'est pas marqué comme société mère (isGroup=false)" },
      { status: 400 }
    );
  }

  // === Composition groupe (mère + enfants) ===
  const allTenants = [
    {
      id: parent.id,
      slug: parent.slug,
      name: parent.name,
      primaryColor: parent.primaryColor,
      sector: parent.sector,
      isParent: true,
    },
    ...parent.children.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      primaryColor: c.primaryColor,
      sector: c.sector,
      isParent: false,
    })),
  ];
  const allTenantIds = allTenants.map((t) => t.id);

  // === Agrégats par tenant (sites + users) ===
  const [sitesPerTenant, headcountPerTenant] = await Promise.all([
    prisma.site.groupBy({
      by: ["tenantId"],
      where: { tenantId: { in: allTenantIds }, status: { not: SiteStatus.ARCHIVED } },
      _sum: { budget: true },
      _avg: { margin: true, progress: true },
      _count: { _all: true },
    }),
    prisma.user.groupBy({
      by: ["tenantId"],
      where: { tenantId: { in: allTenantIds }, status: "ACTIVE" },
      _count: { _all: true },
    }),
  ]);

  const sitesMap = new Map(sitesPerTenant.map((r) => [r.tenantId, r]));
  const headcountMap = new Map(headcountPerTenant.map((r) => [r.tenantId, r._count._all]));

  // CA par tenant = Σ(budget × progress%) — même logique que /api/dashboard/dg.
  const sites = await prisma.site.findMany({
    where: { tenantId: { in: allTenantIds }, status: { not: SiteStatus.ARCHIVED } },
    select: { tenantId: true, budget: true, progress: true, margin: true },
  });
  const caPerTenant = new Map<string, number>();
  for (const s of sites) {
    const tid = s.tenantId;
    const ca = (Number(s.budget) * s.progress) / 100;
    caPerTenant.set(tid, (caPerTenant.get(tid) ?? 0) + ca);
  }

  // === Subsidiaries (table comparative) ===
  const subsidiaries = allTenants.map((t) => {
    const aggregate = sitesMap.get(t.id);
    const ca = Math.round(caPerTenant.get(t.id) ?? 0);
    const margin = Number((aggregate?._avg.margin ?? 0).toFixed(1));
    const headcount = headcountMap.get(t.id) ?? 0;
    // Effectif consolidé : la mère a tous les users en seed, distribuons-les visuellement
    // entre les filiales (60/25/15 du total) si la filiale a 0 users propre.
    let effectiveHeadcount = headcount;
    if (!t.isParent && headcount === 0) {
      const parentHc = headcountMap.get(parent.id) ?? 0;
      const distribution: Record<string, number> = {
        "batimcam-yaounde": Math.round(parentHc * 0.45),
        "batimcam-douala": Math.round(parentHc * 0.35),
        "batimcam-logistique": Math.round(parentHc * 0.2),
      };
      effectiveHeadcount = distribution[t.slug] ?? Math.max(1, Math.round(parentHc / parent.children.length));
    }
    // Trésorerie estimée à 18 % du CA (même heuristique que /api/dashboard/dg)
    const treasury = Math.round(ca * 0.18);
    // Performance synthétique vs N-1 — déterministe par slug
    const seed = Math.abs(Math.sin(t.id.length * 7));
    const perfYoY = Number((4 + seed * 18 - (t.isParent ? 0 : 4)).toFixed(1));
    return {
      id: t.id,
      slug: t.slug,
      name: t.name,
      sector: t.sector,
      color: t.primaryColor ?? "#A855F7",
      isParent: t.isParent,
      ca,
      margin,
      headcount: effectiveHeadcount,
      treasury,
      sitesCount: aggregate?._count._all ?? 0,
      perfYoY,
    };
  });

  // === Group KPIs (consolidés) ===
  const groupKpis = {
    ca: subsidiaries.reduce((s, x) => s + x.ca, 0),
    margin: Number(
      (
        subsidiaries.reduce((s, x) => s + x.ca * x.margin, 0) /
        Math.max(1, subsidiaries.reduce((s, x) => s + x.ca, 0))
      ).toFixed(1)
    ),
    headcount: headcountMap.get(parent.id) ?? 0,
    treasury: subsidiaries.reduce((s, x) => s + x.treasury, 0),
    childrenCount: parent.children.length,
  };

  // === Stack chart 12 mois — synthétisé depuis le CA YTD de chaque filiale ===
  const months = pastTwelveMonthLabels(new Date());
  const monthlyByFiliale = months.map((month, i) => {
    const point: Record<string, number | string> = { month };
    for (const s of subsidiaries) {
      // Croissance mensuelle déterministe
      const growthFactor = 1 + (i - 11) * 0.01;
      const noise = Math.sin(i * 1.7 + s.slug.length) * 0.08;
      const value = (s.ca / 12) * growthFactor * (1 + noise);
      point[s.slug] = Math.max(0, Math.round(value / 1_000_000));
    }
    return point;
  });

  // === Transactions intra-groupe (synthétisées, pas de table dédiée Phase 2) ===
  const intragroupTransactions = parent.children.length >= 3
    ? [
        {
          id: "ig-001",
          from: parent.children[2]?.name ?? "Logistique",
          to: parent.children[0]?.name ?? "Yaoundé",
          amount: 18_500_000,
          type: "Refacturation flotte camions",
          date: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString(),
        },
        {
          id: "ig-002",
          from: parent.children[2]?.name ?? "Logistique",
          to: parent.children[1]?.name ?? "Douala",
          amount: 24_200_000,
          type: "Transport matériaux Pont Mfoundi",
          date: new Date(new Date().setDate(new Date().getDate() - 12)).toISOString(),
        },
        {
          id: "ig-003",
          from: parent.children[0]?.name ?? "Yaoundé",
          to: parent.name,
          amount: 42_000_000,
          type: "Quote-part frais holding T1",
          date: new Date(new Date().setDate(new Date().getDate() - 18)).toISOString(),
        },
        {
          id: "ig-004",
          from: parent.children[1]?.name ?? "Douala",
          to: parent.name,
          amount: 31_500_000,
          type: "Quote-part frais holding T1",
          date: new Date(new Date().setDate(new Date().getDate() - 18)).toISOString(),
        },
      ]
    : [];

  return NextResponse.json({
    group: {
      id: parent.id,
      slug: parent.slug,
      name: parent.name,
      childrenCount: parent.children.length,
    },
    groupKpis,
    subsidiaries,
    monthlyByFiliale,
    intragroupTransactions,
    meta: {
      generatedAt: new Date().toISOString(),
    },
  });
}
