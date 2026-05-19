import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardSg } from "@/lib/rbac/sg-guard";
import { getTenantScopeIds } from "@/lib/tenant";
import { NcStatus, SiteProgressReportStatus, DailyReportStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * Synthèse chantier pour la SG : avancement physique/financier, planning
 * (phases + jalons), problèmes rencontrés (NonConformity avec actions
 * correctives), description détaillée des réalisations cumulées
 * (SiteProgressReport.mainAchievements + agrégation tasksCompleted).
 *
 * Lecture seule. Pas de mutation.
 */
export async function GET(_req: Request, { params }: { params: { siteId: string } }) {
  const guard = await guardSg();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const scopeIds = await getTenantScopeIds(session.tenantId!);

  const site = await prisma.site.findFirst({
    where: { id: params.siteId, tenantId: { in: scopeIds } },
    select: {
      id: true,
      code: true,
      name: true,
      client: true,
      type: true,
      region: true,
      status: true,
      budget: true,
      actualSpentAmount: true,
      progress: true,
      physicalProgress: true,
      financialProgress: true,
      deviationPercent: true,
      margin: true,
      marginTarget: true,
      startDate: true,
      plannedEndDate: true,
      actualEndDate: true,
      manager: { select: { firstName: true, lastName: true } },
      planning: {
        select: {
          totalDurationDays: true,
          phases: {
            orderBy: { orderIndex: "asc" },
            select: {
              id: true,
              name: true,
              orderIndex: true,
              plannedStart: true,
              plannedEnd: true,
              actualStart: true,
              actualEnd: true,
              progressPercent: true,
              status: true,
            },
          },
          milestones: {
            orderBy: { contractDueDate: "asc" },
            select: {
              id: true,
              code: true,
              description: true,
              contractDueDate: true,
              forecastDate: true,
              actualDate: true,
              status: true,
              moaValidation: true,
            },
          },
        },
      },
    },
  });

  if (!site) {
    return NextResponse.json({ error: "Chantier introuvable" }, { status: 404 });
  }

  const [progressReports, nonConformities, dailyAggregate] = await Promise.all([
    prisma.siteProgressReport.findMany({
      where: { siteId: site.id, status: { in: [SiteProgressReportStatus.SUBMITTED, SiteProgressReportStatus.VALIDATED] } },
      orderBy: { period: "desc" },
      take: 6,
      select: {
        id: true,
        reportType: true,
        period: true,
        periodLabel: true,
        physicalProgressPercent: true,
        previousProgressPercent: true,
        mainAchievements: true,
        delaysIdentified: true,
        valueProducedXAF: true,
        valueProducedCumulXAF: true,
        avgWorkforce: true,
        maxWorkforce: true,
        overtimeHoursTotal: true,
        issuesEncountered: true,
        supportNeeded: true,
        nextPeriodPriorities: true,
        hseIncidentsCount: true,
        daysWithoutAccident: true,
        validatedAt: true,
        author: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.nonConformity.findMany({
      where: { siteId: site.id },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 30,
      select: {
        id: true,
        category: true,
        criticality: true,
        description: true,
        correctiveAction: true,
        dueDate: true,
        status: true,
        closedAt: true,
        createdAt: true,
        owner: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.siteDailyReport.aggregate({
      where: { siteId: site.id, status: { in: [DailyReportStatus.SUBMITTED, DailyReportStatus.VALIDATED] } },
      _sum: { normalHours: true, overtimeHours: true, productionValue: true, workforcePresent: true },
      _count: true,
    }),
  ]);

  // Agrégation des tasksCompleted sur les rapports journaliers validés
  const validatedDailies = await prisma.siteDailyReport.findMany({
    where: { siteId: site.id, status: DailyReportStatus.VALIDATED },
    orderBy: { reportDate: "desc" },
    take: 60,
    select: { reportDate: true, tasksCompleted: true },
  });

  type Task = { task: string; quantity: number; unit: string; value: number };
  const taskTotals = new Map<string, { task: string; unit: string; quantity: number; value: number; days: number }>();
  for (const d of validatedDailies) {
    const list = (d.tasksCompleted as unknown as Task[]) ?? [];
    for (const t of list) {
      if (!t?.task) continue;
      const key = `${t.task}__${t.unit}`;
      const cur = taskTotals.get(key);
      if (!cur) {
        taskTotals.set(key, { task: t.task, unit: t.unit, quantity: t.quantity, value: t.value, days: 1 });
      } else {
        cur.quantity += t.quantity;
        cur.value += t.value;
        cur.days += 1;
      }
    }
  }
  const tasksCumulative = Array.from(taskTotals.values())
    .sort((a, b) => b.value - a.value)
    .slice(0, 20);

  const now = new Date();
  const daysToDeadline = Math.ceil((site.plannedEndDate.getTime() - now.getTime()) / 86_400_000);
  const budgetConsumedPct = Number(site.budget) > 0 ? (Number(site.actualSpentAmount) / Number(site.budget)) * 100 : 0;

  return NextResponse.json({
    site: {
      id: site.id,
      code: site.code,
      name: site.name,
      client: site.client,
      type: site.type,
      region: site.region,
      status: site.status,
      manager: site.manager ? `${site.manager.firstName} ${site.manager.lastName}` : null,
      budget: Number(site.budget),
      actualSpentAmount: Number(site.actualSpentAmount),
      budgetConsumedPct: Math.round(budgetConsumedPct * 10) / 10,
      progress: site.progress,
      physicalProgress: site.physicalProgress,
      financialProgress: site.financialProgress,
      deviationPercent: site.deviationPercent,
      margin: site.margin,
      marginTarget: site.marginTarget,
      startDate: site.startDate.toISOString(),
      plannedEndDate: site.plannedEndDate.toISOString(),
      actualEndDate: site.actualEndDate?.toISOString() ?? null,
      daysToDeadline,
    },
    planning: site.planning
      ? {
          totalDurationDays: site.planning.totalDurationDays,
          phases: site.planning.phases.map((p) => ({
            id: p.id,
            name: p.name,
            orderIndex: p.orderIndex,
            plannedStart: p.plannedStart.toISOString(),
            plannedEnd: p.plannedEnd.toISOString(),
            actualStart: p.actualStart?.toISOString() ?? null,
            actualEnd: p.actualEnd?.toISOString() ?? null,
            progressPercent: p.progressPercent,
            status: p.status,
          })),
          milestones: site.planning.milestones.map((m) => ({
            id: m.id,
            code: m.code,
            description: m.description,
            contractDueDate: m.contractDueDate.toISOString(),
            forecastDate: m.forecastDate?.toISOString() ?? null,
            actualDate: m.actualDate?.toISOString() ?? null,
            status: m.status,
            moaValidation: m.moaValidation,
          })),
        }
      : null,
    cumulatedKpis: {
      totalDailyReports: dailyAggregate._count,
      totalNormalHours: dailyAggregate._sum.normalHours ?? 0,
      totalOvertimeHours: dailyAggregate._sum.overtimeHours ?? 0,
      totalProductionValue: Number(dailyAggregate._sum.productionValue ?? 0n),
      avgWorkforce: dailyAggregate._count > 0
        ? Math.round((dailyAggregate._sum.workforcePresent ?? 0) / dailyAggregate._count)
        : 0,
    },
    achievements: progressReports.map((r) => ({
      id: r.id,
      reportType: r.reportType,
      period: r.period.toISOString(),
      periodLabel: r.periodLabel,
      physicalProgressPercent: r.physicalProgressPercent,
      previousProgressPercent: r.previousProgressPercent,
      mainAchievements: r.mainAchievements,
      delaysIdentified: r.delaysIdentified,
      valueProducedXAF: Number(r.valueProducedXAF),
      valueProducedCumulXAF: Number(r.valueProducedCumulXAF),
      avgWorkforce: r.avgWorkforce,
      maxWorkforce: r.maxWorkforce,
      overtimeHoursTotal: r.overtimeHoursTotal,
      issuesEncountered: r.issuesEncountered,
      supportNeeded: r.supportNeeded,
      nextPeriodPriorities: r.nextPeriodPriorities,
      hseIncidentsCount: r.hseIncidentsCount,
      daysWithoutAccident: r.daysWithoutAccident,
      validatedAt: r.validatedAt?.toISOString() ?? null,
      author: r.author ? `${r.author.firstName} ${r.author.lastName}` : null,
    })),
    issues: nonConformities.map((n) => ({
      id: n.id,
      category: n.category,
      criticality: n.criticality,
      description: n.description,
      correctiveAction: n.correctiveAction,
      dueDate: n.dueDate?.toISOString() ?? null,
      status: n.status,
      isResolved: n.status === NcStatus.CLOSED,
      closedAt: n.closedAt?.toISOString() ?? null,
      createdAt: n.createdAt.toISOString(),
      owner: n.owner ? `${n.owner.firstName} ${n.owner.lastName}` : null,
    })),
    tasksCumulative,
  });
}
