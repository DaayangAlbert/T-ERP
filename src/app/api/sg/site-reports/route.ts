import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardSg } from "@/lib/rbac/sg-guard";
import { getTenantScopeIds } from "@/lib/tenant";
import { DailyReportStatus, Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * Vue SG consolidée des rapports journaliers chantier (SiteDailyReport).
 * Lecture seule, multi-chantiers, filtres par chantier / statut / période.
 */
export async function GET(req: Request) {
  const guard = await guardSg();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const url = new URL(req.url);
  const siteId = url.searchParams.get("siteId");
  const status = url.searchParams.get("status") as DailyReportStatus | null;
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const limit = Math.min(100, Math.max(10, Number(url.searchParams.get("limit") ?? "30")));

  const scopeIds = await getTenantScopeIds(session.tenantId!);

  const where: Prisma.SiteDailyReportWhereInput = {
    site: { tenantId: { in: scopeIds } },
  };
  if (siteId) where.siteId = siteId;
  if (status && Object.values(DailyReportStatus).includes(status)) where.status = status;
  if (from || to) {
    where.reportDate = {};
    if (from) where.reportDate.gte = new Date(from);
    if (to) where.reportDate.lte = new Date(to);
  }

  const [items, sitesFacet] = await Promise.all([
    prisma.siteDailyReport.findMany({
      where,
      orderBy: { reportDate: "desc" },
      take: limit,
      include: {
        site: { select: { id: true, code: true, name: true, client: true } },
        submittedBy: { select: { firstName: true, lastName: true } },
        validatedBy: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.site.findMany({
      where: { tenantId: { in: scopeIds } },
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" },
    }),
  ]);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthReports = items.filter((r) => r.reportDate >= monthStart);

  return NextResponse.json({
    items: items.map((r) => ({
      id: r.id,
      reportDate: r.reportDate.toISOString(),
      status: r.status,
      site: r.site,
      workforcePresent: r.workforcePresent,
      workforcePlanned: r.workforcePlanned,
      normalHours: r.normalHours,
      overtimeHours: r.overtimeHours,
      productionValue: Number(r.productionValue),
      tasksCompleted: r.tasksCompleted as Array<{ task: string; quantity: number; unit: string; value: number }>,
      consumedMaterials: r.consumedMaterials as Array<{ code?: string; label?: string; quantity: number; unit: string }>,
      incidents: r.incidents,
      photos: r.photos,
      submittedBy: r.submittedBy,
      validatedBy: r.validatedBy,
      validatedAt: r.validatedAt?.toISOString() ?? null,
    })),
    kpis: {
      totalReports: items.length,
      monthReports: monthReports.length,
      pendingValidation: items.filter((r) => r.status === DailyReportStatus.SUBMITTED).length,
      monthProduction: monthReports.reduce((s, r) => s + Number(r.productionValue), 0),
    },
    sites: sitesFacet,
  });
}
