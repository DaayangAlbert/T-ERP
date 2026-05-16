import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardCcSite } from "@/lib/rbac/cc-guard";
import { AttendanceSession, DailyReportStatus, DeliveryStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await guardCcSite();
  if (guard instanceof NextResponse) return guard;
  const { siteId } = guard;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86_400_000);

  const site = await prisma.site.findUnique({
    where: { id: siteId },
    select: { id: true, code: true, name: true, client: true },
  });

  const [yesterdayReport, todayCompletion, todayDeliveries, workforceCount, currentPhase, todayTasks] =
    await Promise.all([
      prisma.siteDailyReport.findFirst({
        where: { siteId, reportDate: yesterday },
      }),
      prisma.attendanceSessionCompletion.findFirst({
        where: { siteId, date: today, session: AttendanceSession.MORNING },
      }),
      prisma.delivery.findMany({
        where: {
          siteId,
          scheduledAt: { gte: today, lt: new Date(today.getTime() + 86_400_000) },
        },
      }),
      prisma.siteWorkforceMember.count({
        where: { siteId, endedAt: null },
      }),
      prisma.sitePhase.findFirst({
        where: { planning: { siteId }, status: "IN_PROGRESS" },
        orderBy: { orderIndex: "asc" },
      }),
      prisma.siteTask.findMany({
        where: {
          phase: { planning: { siteId } },
          plannedStart: { lte: new Date(today.getTime() + 86_400_000) },
          plannedEnd: { gte: today },
        },
        take: 5,
      }),
    ]);

  return NextResponse.json({
    site,
    yesterdayProduction: yesterdayReport ? Number(yesterdayReport.productionValue) : 0,
    yesterdayAttendance: yesterdayReport
      ? { present: yesterdayReport.workforcePresent, planned: yesterdayReport.workforcePlanned }
      : null,
    todayDeliveries: todayDeliveries.length,
    pendingAttendance: {
      needed: !todayCompletion,
      plannedHeadcount: workforceCount,
    },
    currentPhase: currentPhase
      ? { name: currentPhase.name, progress: currentPhase.progressPercent }
      : null,
    todayTasks: todayTasks.map((t) => ({
      id: t.id,
      name: t.name,
      progressPercent: t.progressPercent,
    })),
  });
}
