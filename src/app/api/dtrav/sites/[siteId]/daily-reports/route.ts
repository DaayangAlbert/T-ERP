import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardDtravSite } from "@/lib/rbac/dtrav-guard";
import { DailyReportStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { siteId: string } }) {
  const guard = await guardDtravSite(params.siteId);
  if (guard instanceof NextResponse) return guard;

  const url = new URL(req.url);
  const status = url.searchParams.get("status") as DailyReportStatus | null;
  const limit = Math.min(100, Number(url.searchParams.get("limit") ?? "30"));

  const where: Record<string, unknown> = { siteId: params.siteId };
  if (status) where.status = status;

  const items = await prisma.siteDailyReport.findMany({
    where,
    orderBy: { reportDate: "desc" },
    take: limit,
    include: {
      submittedBy: { select: { firstName: true, lastName: true } },
      validatedBy: { select: { firstName: true, lastName: true } },
    },
  });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthReports = items.filter((r) => r.reportDate >= monthStart);
  const monthProduction = monthReports.reduce((s, r) => s + Number(r.productionValue), 0);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayReport = items.find((r) => r.reportDate >= todayStart);

  return NextResponse.json({
    items: items.map((r) => ({
      id: r.id,
      reportDate: r.reportDate.toISOString(),
      status: r.status,
      workforcePresent: r.workforcePresent,
      workforcePlanned: r.workforcePlanned,
      normalHours: r.normalHours,
      overtimeHours: r.overtimeHours,
      justifiedAbsences: r.justifiedAbsences,
      productionValue: Number(r.productionValue),
      consumedMaterials: r.consumedMaterials,
      tasksCompleted: r.tasksCompleted,
      incidents: r.incidents,
      photos: r.photos,
      submittedBy: r.submittedBy,
      validatedBy: r.validatedBy,
      validatedAt: r.validatedAt?.toISOString() ?? null,
      rejectReason: r.rejectReason,
    })),
    kpis: {
      todayProduction: todayReport ? Number(todayReport.productionValue) : 0,
      monthProduction,
      toValidate: items.filter((r) => r.status === DailyReportStatus.SUBMITTED).length,
      planningRate: monthReports.length > 0
        ? Math.round(
            (monthReports.reduce((s, r) => s + r.workforcePresent, 0) /
              monthReports.reduce((s, r) => s + Math.max(1, r.workforcePlanned), 0)) *
              100
          )
        : 0,
    },
  });
}
