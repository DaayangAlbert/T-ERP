import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardEmp } from "@/lib/rbac/emp-guard";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = guardEmp();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const report = await prisma.timeReport.findFirst({
    where: { userId: session.sub, date: { gte: todayStart, lt: todayEnd } },
    include: { pointer: { select: { firstName: true, lastName: true } } },
  });

  if (!report) {
    return NextResponse.json({
      hasReport: false,
      arrivalLabel: "—",
      status: "PENDING",
      pointerName: null,
    });
  }

  return NextResponse.json({
    hasReport: true,
    status: report.status,
    arrivalTime: report.arrivalTime?.toISOString() ?? null,
    arrivalLabel: report.arrivalTime
      ? report.arrivalTime.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
      : "—",
    departureTime: report.departureTime?.toISOString() ?? null,
    pointerName: report.pointer ? `${report.pointer.firstName} ${report.pointer.lastName}` : "—",
    totalHours: report.totalHours,
    overtimeHours: report.overtimeHours,
  });
}
