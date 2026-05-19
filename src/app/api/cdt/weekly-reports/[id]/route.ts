import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { updateWeeklyReportSchema } from "@/schemas/cdt-weekly-report";

export const dynamic = "force-dynamic";

const VIEWER_ROLES: Role[] = [
  Role.WORKS_MANAGER,
  Role.WORKS_DIRECTOR,
  Role.TECH_DIRECTOR,
  Role.DG,
  Role.DAF,
  Role.SUPER_ADMIN,
];

async function loadReport(id: string) {
  return prisma.cdtWeeklyReport.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, firstName: true, lastName: true, position: true } },
      validatedBy: { select: { firstName: true, lastName: true } },
      sites: {
        include: {
          site: {
            select: { id: true, code: true, name: true, client: true, region: true, physicalProgress: true, financialProgress: true },
          },
        },
        orderBy: { site: { code: "asc" } },
      },
    },
  });
}

function canRead(report: NonNullable<Awaited<ReturnType<typeof loadReport>>>, session: { sub: string; role: string; tenantId?: string | null }) {
  if (!VIEWER_ROLES.includes(session.role as Role)) return false;
  if (session.role === Role.WORKS_MANAGER) return report.authorId === session.sub;
  return report.tenantId === session.tenantId;
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await ctx.params;
  const report = await loadReport(id);
  if (!report) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (!canRead(report, session)) return NextResponse.json({ error: "Hors périmètre" }, { status: 403 });

  return NextResponse.json({
    id: report.id,
    weekStart: report.weekStart.toISOString(),
    weekEnd: report.weekEnd.toISOString(),
    weekLabel: report.weekLabel,
    status: report.status,
    workingDays: report.workingDays,
    weatherDays: report.weatherDays,
    subcontractorsPresent: report.subcontractorsPresent,
    globalSummary: report.globalSummary,
    keyAchievements: report.keyAchievements,
    transverseIssues: report.transverseIssues,
    scheduleSlippages: report.scheduleSlippages,
    arbitrationsNeeded: report.arbitrationsNeeded,
    nextWeekPlan: report.nextWeekPlan,
    sites: report.sites.map((s) => ({
      id: s.id,
      siteId: s.siteId,
      site: s.site,
      physicalProgressPercent: s.physicalProgressPercent,
      financialProgressPercent: s.financialProgressPercent,
      valueProducedXAF: s.valueProducedXAF.toString(),
      avgWorkforce: s.avgWorkforce,
      hseIncidentsCount: s.hseIncidentsCount,
      milestonesAchieved: s.milestonesAchieved,
      milestonesAtRisk: s.milestonesAtRisk,
      notes: s.notes,
    })),
    author: {
      id: report.author.id,
      name: `${report.author.firstName} ${report.author.lastName}`,
      position: report.author.position,
    },
    validatedBy: report.validatedBy ? `${report.validatedBy.firstName} ${report.validatedBy.lastName}` : null,
    submittedAt: report.submittedAt?.toISOString() ?? null,
    validatedAt: report.validatedAt?.toISOString() ?? null,
    rejectionReason: report.rejectionReason,
    createdAt: report.createdAt.toISOString(),
  });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await ctx.params;
  const report = await loadReport(id);
  if (!report) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  // Seul l'auteur peut éditer, et uniquement en DRAFT ou REJECTED
  if (session.role !== Role.WORKS_MANAGER || report.authorId !== session.sub) {
    return NextResponse.json({ error: "Édition réservée à l'auteur" }, { status: 403 });
  }
  if (report.status !== "DRAFT" && report.status !== "REJECTED") {
    return NextResponse.json({ error: "Rapport non éditable (statut " + report.status + ")" }, { status: 409 });
  }

  try {
    const body = updateWeeklyReportSchema.parse(await req.json());

    // Mise à jour transactionnelle : entête + sites snapshots
    await prisma.$transaction(async (tx) => {
      await tx.cdtWeeklyReport.update({
        where: { id },
        data: {
          weekStart: body.weekStart ? new Date(body.weekStart) : undefined,
          weekEnd: body.weekEnd ? new Date(body.weekEnd) : undefined,
          weekLabel: body.weekLabel ?? undefined,
          workingDays: body.workingDays ?? undefined,
          weatherDays: body.weatherDays ?? undefined,
          subcontractorsPresent: body.subcontractorsPresent ?? undefined,
          globalSummary: body.globalSummary ?? undefined,
          keyAchievements: body.keyAchievements ?? undefined,
          transverseIssues: body.transverseIssues ?? undefined,
          scheduleSlippages: body.scheduleSlippages ?? undefined,
          arbitrationsNeeded: body.arbitrationsNeeded ?? undefined,
          nextWeekPlan: body.nextWeekPlan ?? undefined,
          // Reset statut si on était en REJECTED (re-soumission après correction)
          status: report.status === "REJECTED" ? "DRAFT" : undefined,
          rejectionReason: report.status === "REJECTED" ? null : undefined,
        },
      });

      if (body.sites) {
        // Stratégie simple : remplacer intégralement les snapshots
        await tx.cdtWeeklyReportSite.deleteMany({ where: { reportId: id } });
        if (body.sites.length > 0) {
          await tx.cdtWeeklyReportSite.createMany({
            data: body.sites.map((s) => ({
              reportId: id,
              siteId: s.siteId,
              physicalProgressPercent: s.physicalProgressPercent,
              financialProgressPercent: s.financialProgressPercent,
              valueProducedXAF: BigInt(s.valueProducedXAF || "0"),
              avgWorkforce: s.avgWorkforce,
              hseIncidentsCount: s.hseIncidentsCount,
              milestonesAchieved: s.milestonesAchieved ?? null,
              milestonesAtRisk: s.milestonesAtRisk ?? null,
              notes: s.notes ?? null,
            })),
          });
        }
      }
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Payload invalide", issues: err.flatten() }, { status: 400 });
    }
    console.error("[PATCH /api/cdt/weekly-reports/:id]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await ctx.params;
  const report = await loadReport(id);
  if (!report) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (session.role !== Role.WORKS_MANAGER || report.authorId !== session.sub) {
    return NextResponse.json({ error: "Suppression réservée à l'auteur" }, { status: 403 });
  }
  if (report.status === "VALIDATED") {
    return NextResponse.json({ error: "Rapport validé non supprimable" }, { status: 409 });
  }

  await prisma.cdtWeeklyReport.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
