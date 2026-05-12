import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardEmp } from "@/lib/rbac/emp-guard";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const guard = guardEmp();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const url = new URL(req.url);
  const monthParam = url.searchParams.get("month"); // YYYY-MM
  const now = new Date();
  const [year, monthIdx] = monthParam
    ? monthParam.split("-").map(Number).map((n, i) => (i === 1 ? n - 1 : n))
    : [now.getFullYear(), now.getMonth()];

  const start = new Date(year, monthIdx, 1);
  const end = new Date(year, monthIdx + 1, 1);

  const reports = await prisma.timeReport.findMany({
    where: { userId: session.sub, date: { gte: start, lt: end } },
    orderBy: { date: "asc" },
    include: { pointer: { select: { firstName: true, lastName: true } } },
  });

  const sum = reports.reduce(
    (acc, r) => {
      acc.totalHours += r.totalHours;
      acc.standardHours += r.standardHours;
      acc.overtimeHours += r.overtimeHours;
      if (r.status === "ABSENT_UNJUSTIFIED") acc.absences += 1;
      if (r.arrivalTime && r.date) {
        const expected = new Date(r.date);
        expected.setHours(7, 0, 0, 0);
        if (r.arrivalTime > expected && r.totalHours > 0) acc.lates += 1;
      }
      return acc;
    },
    { totalHours: 0, standardHours: 0, overtimeHours: 0, absences: 0, lates: 0 },
  );

  const totalDays = new Date(year, monthIdx + 1, 0).getDate();
  const currentDay = now.getMonth() === monthIdx && now.getFullYear() === year ? now.getDate() : totalDays;

  return NextResponse.json({
    month: `${year}-${String(monthIdx + 1).padStart(2, "0")}`,
    monthLabel: new Date(year, monthIdx, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
    currentDay,
    totalDays,
    pointerName: reports[0]?.pointer ? `${reports[0].pointer.firstName} ${reports[0].pointer.lastName}` : "—",
    lastSyncAt: reports.length > 0 ? reports[reports.length - 1].updatedAt.toISOString() : null,
    kpis: {
      totalHours: Math.round(sum.totalHours * 10) / 10,
      overtimeHours: Math.round(sum.overtimeHours * 10) / 10,
      lates: sum.lates,
      absences: sum.absences,
    },
    days: reports.map((r) => ({
      id: r.id,
      date: r.date.toISOString().slice(0, 10),
      status: r.status,
      arrivalTime: r.arrivalTime?.toISOString() ?? null,
      departureTime: r.departureTime?.toISOString() ?? null,
      totalHours: r.totalHours,
      standardHours: r.standardHours,
      overtimeHours: r.overtimeHours,
      overtimeType: r.overtimeType,
      contested: !!r.contestedAt,
      resolvedAt: r.resolvedAt?.toISOString() ?? null,
    })),
  });
}
