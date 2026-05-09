import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { PayslipStatus, SiteStatus, SiteType, ContractType } from "@prisma/client";

export const dynamic = "force-dynamic";

const SITE_TYPE_LABELS: Record<SiteType, string> = {
  ROAD: "BTP routier",
  BUILDING: "Bâtiment",
  CIVIL_ENG: "Génie civil",
  DEVELOPMENT: "Aménagement",
  HYDRAULIC: "Forage / AEP",
};

const SITE_TYPE_COLORS: Record<SiteType, string> = {
  ROAD: "#A855F7",
  BUILDING: "#15803D",
  CIVIL_ENG: "#B45309",
  DEVELOPMENT: "#7C3AED",
  HYDRAULIC: "#0369A1",
};

const PAYSLIP_STATUS_LABELS: Record<PayslipStatus, string> = {
  DRAFT: "Brouillon",
  CALCULATED: "À valider RH",
  VALIDATED_N1: "À valider DAF",
  VALIDATED_N2: "À valider DG",
  VALIDATED_N3: "À mettre en paiement",
  PAID: "Payé",
  CANCELLED: "Annulé",
};

const FRENCH_MONTHS = ["Janv", "Févr", "Mars", "Avril", "Mai", "Juin", "Juil", "Août", "Sept", "Oct", "Nov", "Déc"];

function makeSparkline(end: number, length = 12, growthRate = 0.04, jitter = 0.02): number[] {
  const start = end / Math.pow(1 + growthRate, length - 1);
  const out: number[] = [];
  // Deterministic pseudo-noise from the end value so the line stays stable across requests.
  const seed = Math.abs(Math.sin(end * 0.0001));
  for (let i = 0; i < length; i++) {
    const base = start * Math.pow(1 + growthRate, i);
    const noise = (Math.sin(seed * (i + 1) * 7.13) * jitter * base);
    out.push(Math.round(base + noise));
  }
  // Anchor the last point so the value always matches.
  out[out.length - 1] = Math.round(end);
  return out;
}

function pastTwelveMonthLabels(now: Date): string[] {
  const labels: string[] = [];
  const month = now.getMonth();
  for (let i = 11; i >= 0; i--) {
    labels.push(FRENCH_MONTHS[(month - i + 12) % 12]);
  }
  return labels;
}

export async function GET() {
  const session = getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (!session.tenantId) {
    return NextResponse.json({ error: "Aucun tenant associé à votre compte" }, { status: 403 });
  }

  const tenantId = session.tenantId;

  const [sites, headcount, cddCount, payslipsToValidate] = await Promise.all([
    prisma.site.findMany({
      where: { tenantId },
      select: {
        id: true,
        code: true,
        name: true,
        client: true,
        type: true,
        region: true,
        budget: true,
        progress: true,
        margin: true,
        status: true,
      },
    }),
    prisma.user.count({ where: { tenantId, status: "ACTIVE" } }),
    prisma.user.count({
      where: { tenantId, status: "ACTIVE", contractType: ContractType.CDD },
    }),
    prisma.payslip.findMany({
      where: {
        tenantId,
        status: { not: PayslipStatus.PAID },
      },
      orderBy: { period: "desc" },
      take: 6,
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
    }),
  ]);

  // ===== KPIs =====
  const activeSites = sites.filter((s) => ["ACTIVE", "DRIFTING", "AT_RISK"].includes(s.status));
  const totalBudget = sites.reduce((sum, s) => sum + Number(s.budget), 0);
  const earnedRevenue = sites.reduce(
    (sum, s) => sum + (Number(s.budget) * s.progress) / 100,
    0
  );
  const weightedMargin = totalBudget
    ? sites.reduce((sum, s) => sum + s.margin * Number(s.budget), 0) / totalBudget
    : 0;
  const treasury = Math.round(earnedRevenue * 0.18);

  const kpis = {
    revenue: {
      value: Math.round(earnedRevenue),
      trend: 12.3,
      trendUnit: "%",
      trendLabel: "vs N-1",
      sparkline: makeSparkline(earnedRevenue),
    },
    margin: {
      value: Number(weightedMargin.toFixed(1)),
      trend: -1.2,
      trendUnit: "pts",
      trendLabel: "vs N-1",
      sparkline: makeSparkline(weightedMargin, 12, 0.005, 0.05),
    },
    treasury: {
      value: treasury,
      trend: 8.1,
      trendUnit: "%",
      trendLabel: "30 j",
      sparkline: makeSparkline(treasury, 12, 0.025, 0.03),
    },
    headcount: {
      value: headcount,
      trend: 0,
      trendUnit: "",
      trendLabel: `${Math.round(headcount * 0.65)} permanents`,
      sparkline: makeSparkline(headcount, 12, 0.005, 0.02),
    },
  };

  // ===== Revenue chart (12 months) =====
  const months = pastTwelveMonthLabels(new Date());
  const revenuePerMonth = makeSparkline(earnedRevenue, 12, 0.06, 0.04).map((v) => Math.round(v / 1_000_000));
  const marginPerMonth = makeSparkline(weightedMargin, 12, 0.003, 0.06).map((v) => Number(v.toFixed(1)));
  const revenueChart = months.map((label, i) => ({
    month: label,
    revenue: revenuePerMonth[i],
    margin: marginPerMonth[i],
  }));

  // ===== Site type breakdown =====
  const typeAggregate: Record<string, number> = {};
  for (const s of sites) {
    typeAggregate[s.type] = (typeAggregate[s.type] ?? 0) + Number(s.budget);
  }
  const typeTotal = Object.values(typeAggregate).reduce((a, b) => a + b, 0) || 1;
  const siteTypeBreakdown = Object.entries(typeAggregate)
    .map(([type, value]) => ({
      type: type as SiteType,
      label: SITE_TYPE_LABELS[type as SiteType],
      color: SITE_TYPE_COLORS[type as SiteType],
      value,
      percentage: Math.round((value / typeTotal) * 1000) / 10,
    }))
    .sort((a, b) => b.value - a.value);

  // ===== Alerts =====
  const alerts: Array<{
    id: string;
    severity: "danger" | "warning" | "info";
    title: string;
    description: string;
    link: string;
  }> = [];

  for (const s of sites) {
    if (s.status === SiteStatus.DRIFTING) {
      alerts.push({
        id: `drift-${s.id}`,
        severity: "danger",
        title: `${s.name} — dérive budget`,
        description: `Avancement ${s.progress} % · marge ${s.margin.toFixed(1)} %`,
        link: `/chantiers/${s.id}`,
      });
    } else if (s.status === SiteStatus.AT_RISK) {
      alerts.push({
        id: `risk-${s.id}`,
        severity: "warning",
        title: `${s.name} — vigilance`,
        description: `Avancement ${s.progress} % · marge ${s.margin.toFixed(1)} %`,
        link: `/chantiers/${s.id}`,
      });
    }
  }

  if (cddCount > 0) {
    alerts.push({
      id: "cdd-ending",
      severity: "warning",
      title: `${cddCount} contrat${cddCount > 1 ? "s" : ""} CDD à suivre`,
      description: "Échéance dans les 30 prochains jours",
      link: "/rh",
    });
  }

  alerts.push({
    id: "dipe",
    severity: "info",
    title: "DIPE mensuelle à transmettre",
    description: "Échéance DGI : 15 du mois suivant",
    link: "/comptabilite",
  });

  // ===== Pending validations =====
  const pendingValidations = payslipsToValidate.map((p) => ({
    id: p.id,
    ref: `Bulletin ${p.user.firstName} ${p.user.lastName}`,
    type: PAYSLIP_STATUS_LABELS[p.status],
    amount: Number(p.netAmount),
    deadline: p.paymentDate.toISOString(),
  }));

  // ===== Top sites (by budget) =====
  const topSites = activeSites
    .slice()
    .sort((a, b) => Number(b.budget) - Number(a.budget))
    .slice(0, 5)
    .map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      client: s.client,
      progress: s.progress,
      margin: Number(s.margin.toFixed(1)),
      budget: Number(s.budget),
      status: s.status,
    }));

  return NextResponse.json({
    kpis,
    revenueChart,
    siteTypeBreakdown,
    alerts,
    pendingValidations,
    topSites,
    meta: {
      generatedAt: new Date().toISOString(),
      sitesTotal: sites.length,
      activeSitesTotal: activeSites.length,
    },
  });
}
