import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getTenantScopeIds } from "@/lib/tenant";
import { Role, SiteStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.TECH_DIRECTOR, Role.DG, Role.TENANT_ADMIN, Role.OWNER];

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé Direction Technique" }, { status: 403 });
  }

  const scopeIds = await getTenantScopeIds(session.tenantId);

  const [activeSites, allManagers, validations, dtAlerts, workforceCount, lastMajorIncident] =
    await Promise.all([
      prisma.site.findMany({
        where: { tenantId: { in: scopeIds }, status: { not: SiteStatus.ARCHIVED } },
        select: {
          id: true,
          code: true,
          name: true,
          client: true,
          status: true,
          type: true,
          region: true,
          budget: true,
          progress: true,
          physicalProgress: true,
          financialProgress: true,
          margin: true,
          marginTarget: true,
          deviationPercent: true,
          actualSpentAmount: true,
          plannedEndDate: true,
          managerId: true,
        },
      }),
      prisma.user.findMany({
        where: { role: Role.WORKS_DIRECTOR, status: "ACTIVE" },
        select: { id: true, firstName: true, lastName: true },
      }),
      prisma.validation.findMany({
        where: {
          tenantId: session.tenantId,
          status: "PENDING",
          dtValidationRequired: true,
        },
        select: { id: true },
      }),
      prisma.dtAlert.findMany({
        where: { tenantId: session.tenantId, resolved: false },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.siteWorkforceMember.count({
        where: {
          site: { tenantId: { in: scopeIds }, status: { not: SiteStatus.ARCHIVED } },
          endedAt: null,
        },
      }),
      prisma.hseIncident.findFirst({
        where: {
          site: { tenantId: { in: scopeIds } },
          severity: { in: ["HIGH", "CRITICAL"] },
        },
        orderBy: { occurredAt: "desc" },
        select: { occurredAt: true },
      }),
    ]);

  const totalBudget = activeSites.reduce((s, x) => s + Number(x.budget), 0);
  const cumulativeProductionYtd = activeSites.reduce(
    (s, x) => s + (Number(x.budget) * x.financialProgress) / 100,
    0
  );
  const marginAvg = totalBudget
    ? activeSites.reduce((s, x) => s + x.margin * Number(x.budget), 0) / totalBudget
    : 0;
  const avgPhysicalProgress = activeSites.length
    ? activeSites.reduce((s, x) => s + x.physicalProgress, 0) / activeSites.length
    : 0;

  // KPIs
  const activeCount = activeSites.length;
  const headcountOnSite = workforceCount;
  const hseRecord = lastMajorIncident
    ? Math.floor((Date.now() - lastMajorIncident.occurredAt.getTime()) / 86_400_000)
    : 365;

  // Avancement physique vs financier (par chantier — top 6 visibles)
  const progressVsFinancial = activeSites
    .slice()
    .sort((a, b) => Number(b.budget) - Number(a.budget))
    .slice(0, 6)
    .map((s) => ({
      code: s.code,
      name: s.name,
      physical: Math.round(s.physicalProgress),
      financial: Math.round(s.financialProgress),
    }));

  // Répartition par directeur de travaux (donut)
  const managerById = new Map(allManagers.map((m) => [m.id, m]));
  const groupedByManager = new Map<string, { production: number; sites: number }>();
  for (const site of activeSites) {
    const m = managerById.get(site.managerId ?? "");
    const key = m ? `${m.firstName} ${m.lastName}` : "Non affecté";
    const prev = groupedByManager.get(key) ?? { production: 0, sites: 0 };
    groupedByManager.set(key, {
      production: prev.production + (Number(site.budget) * site.financialProgress) / 100,
      sites: prev.sites + 1,
    });
  }
  const colors = ["#A855F7", "#3B82F6", "#F97316", "#10B981", "#EAB308", "#EF4444"];
  const progressByDirectorOfWorks = Array.from(groupedByManager.entries()).map(
    ([name, data], i) => ({
      name,
      production: Math.round(data.production),
      sites: data.sites,
      color: colors[i % colors.length],
    })
  );

  // Sites à surveiller : drift, marge sous cible, retard
  const today = new Date();
  const sitesToWatch = activeSites
    .map((s) => {
      const isMarginAlert = s.margin < s.marginTarget;
      const isDeviationAlert = s.deviationPercent > 10;
      const isLateAlert = new Date(s.plannedEndDate) < today && s.physicalProgress < 100;
      const score =
        (isDeviationAlert ? 3 : 0) + (isMarginAlert ? 2 : 0) + (isLateAlert ? 2 : 0);
      const manager = managerById.get(s.managerId ?? "");
      const managerName = manager ? `${manager.firstName.charAt(0)}. ${manager.lastName}` : "—";
      let alertReason = "RAS";
      if (isDeviationAlert) alertReason = `Dérive coût +${Math.round(s.deviationPercent)} %`;
      else if (isMarginAlert) alertReason = `Marge ${s.margin.toFixed(1)} % sous cible`;
      else if (isLateAlert) alertReason = "Retard livraison";
      return {
        id: s.id,
        code: s.code,
        name: s.name,
        manager: managerName,
        physicalProgress: Math.round(s.physicalProgress),
        margin: s.margin,
        marginTarget: s.marginTarget,
        deviationPercent: s.deviationPercent,
        plannedEndDate: s.plannedEndDate.toISOString(),
        status: s.status,
        alertReason,
        severity: isDeviationAlert ? "high" : isMarginAlert || isLateAlert ? "medium" : "low",
        score,
      };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  // Alertes (synthèse contextuelle si DtAlert vide)
  const fallbackAlerts: Array<{
    id: string;
    type: string;
    severity: "low" | "medium" | "high";
    title: string;
    details: string;
    link?: string;
  }> = [];
  for (const s of activeSites) {
    if (s.deviationPercent > 10) {
      fallbackAlerts.push({
        id: `dev-${s.id}`,
        type: "SITE_BUDGET_DEVIATION",
        severity: "high",
        title: `${s.name} · dérive coût +${Math.round(s.deviationPercent)} %`,
        details: `Marge ${s.margin.toFixed(1)} % vs cible ${s.marginTarget.toFixed(1)} %`,
        link: `/dt/portefeuille?focus=${s.id}`,
      });
    } else if (s.margin < s.marginTarget) {
      fallbackAlerts.push({
        id: `mar-${s.id}`,
        type: "MARGIN_BELOW_TARGET",
        severity: "medium",
        title: `${s.name} · marge ${s.margin.toFixed(1)} % sous cible`,
        details: `Cible interne : ${s.marginTarget.toFixed(1)} %`,
        link: `/dt/portefeuille?focus=${s.id}`,
      });
    }
  }
  if (validations.length > 0) {
    fallbackAlerts.push({
      id: "val-pending",
      type: "MARKET_VALIDATION_PENDING",
      severity: "low",
      title: `${validations.length} marché(s) à valider en N2 technique`,
      details: "Action attendue avant 24 h",
      link: "/dt/validations",
    });
  }
  const alerts =
    dtAlerts.length > 0
      ? dtAlerts.slice(0, 5).map((a) => ({
          id: a.id,
          type: a.type as string,
          severity:
            a.severity === "CRITICAL" || a.severity === "HIGH"
              ? "high"
              : a.severity === "MEDIUM"
                ? "medium"
                : "low",
          title: a.title,
          details: a.details ?? "",
          link: a.link ?? undefined,
        }))
      : fallbackAlerts.slice(0, 5);

  return NextResponse.json({
    banner: {
      cumulativeProductionYtd: Math.round(cumulativeProductionYtd),
      productionDeltaVsN1: 12.4, // valeur démo (vs N-1)
      activeSites: activeCount,
      headcountOnSite,
      marginAvg: Number(marginAvg.toFixed(1)),
    },
    kpis: {
      activeSites: activeCount,
      avgProgress: Math.round(avgPhysicalProgress),
      pendingN2Validations: validations.length,
      hseRecord,
    },
    alerts,
    progressVsFinancial,
    progressByDirectorOfWorks,
    sitesToWatch,
  });
}
