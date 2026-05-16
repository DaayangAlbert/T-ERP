import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardCcSite } from "@/lib/rbac/cc-guard";
import { DailyReportStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await guardCcSite();
  if (guard instanceof NextResponse) return guard;
  const { session, siteId } = guard;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let report = await prisma.siteDailyReport.findFirst({
    where: { siteId, reportDate: today },
    include: {
      tasksRealizations: { include: { team: { select: { name: true } } } },
      materialConsumptions: true,
    },
  });

  if (!report) {
    report = await prisma.siteDailyReport.create({
      data: {
        siteId,
        reportDate: today,
        submittedById: session.sub,
        workforcePlanned: 0,
        workforcePresent: 0,
        status: DailyReportStatus.DRAFT,
      },
      include: {
        tasksRealizations: { include: { team: { select: { name: true } } } },
        materialConsumptions: true,
      },
    });
  }

  // Tâches programmées du jour
  const plannedTasks = await prisma.siteTask.findMany({
    where: {
      phase: { planning: { siteId } },
      plannedStart: { lte: new Date(today.getTime() + 86_400_000) },
      plannedEnd: { gte: today },
    },
    select: { id: true, name: true },
  });

  return NextResponse.json({
    report: {
      id: report.id,
      status: report.status,
      productionValue: Number(report.productionValue),
    },
    plannedTasks,
    realizations: report.tasksRealizations.map((r) => ({
      id: r.id,
      designation: r.designation,
      quantity: r.quantity,
      unit: r.unit,
      totalValue: Number(r.totalValue),
      unitPrice: Number(r.unitPrice),
      taskId: r.taskId,
      teamName: r.team?.name ?? null,
    })),
    consumptions: report.materialConsumptions.map((c) => ({
      id: c.id,
      articleCode: c.articleCode,
      articleLabel: c.articleLabel,
      quantity: c.quantity,
      unit: c.unit,
      source: c.source,
    })),
  });
}
