import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardOuv } from "@/lib/rbac/ouv-guard";

export const dynamic = "force-dynamic";

// GET /api/ouv/clock/week?at=YYYY-MM-DD
// Renvoie les 7 jours de la semaine ISO contenant `at` (par défaut : aujourd'hui).
// Utilisé pour la liste "Historique semaine N" + 2 mini-KPIs (heures sem + sup mai).
export async function GET(req: Request) {
  const guard = guardOuv();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const url = new URL(req.url);
  const atParam = url.searchParams.get("at");
  const ref = atParam ? new Date(atParam) : new Date();
  if (Number.isNaN(ref.getTime())) {
    return NextResponse.json({ error: "Paramètre 'at' invalide" }, { status: 400 });
  }

  const { weekStart, weekEnd, weekNumber } = isoWeekBounds(ref);

  // Pointages de la semaine
  const trs = await prisma.timeReport.findMany({
    where: {
      userId: session.sub,
      date: { gte: weekStart, lte: weekEnd },
    },
    orderBy: { date: "asc" },
    select: {
      id: true,
      date: true,
      arrivalTime: true,
      departureTime: true,
      totalHours: true,
      standardHours: true,
      overtimeHours: true,
      overtimeType: true,
      status: true,
      outOfGeofence: true,
      contestedAt: true,
    },
  });

  // KPI mois en cours : total heures + heures sup
  const monthStart = new Date(
    Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), 1)
  );
  const monthEnd = new Date(
    Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() + 1, 0)
  );
  const monthAgg = await prisma.timeReport.aggregate({
    where: {
      userId: session.sub,
      date: { gte: monthStart, lte: monthEnd },
    },
    _sum: { totalHours: true, overtimeHours: true },
  });

  // KPI semaine : total heures travaillées
  const weekTotal = trs.reduce((s, t) => s + (t.totalHours ?? 0), 0);
  const weekOvertime = trs.reduce((s, t) => s + (t.overtimeHours ?? 0), 0);

  return NextResponse.json({
    weekNumber,
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
    days: trs.map((t) => ({
      id: t.id,
      date: t.date.toISOString(),
      arrivalTime: t.arrivalTime?.toISOString() ?? null,
      departureTime: t.departureTime?.toISOString() ?? null,
      totalHours: t.totalHours,
      standardHours: t.standardHours,
      overtimeHours: t.overtimeHours,
      overtimeType: t.overtimeType,
      status: t.status,
      outOfGeofence: t.outOfGeofence,
      contested: t.contestedAt != null,
    })),
    kpis: {
      weekTotalHours: round1(weekTotal),
      weekOvertimeHours: round1(weekOvertime),
      monthTotalHours: round1(monthAgg._sum.totalHours ?? 0),
      monthOvertimeHours: round1(monthAgg._sum.overtimeHours ?? 0),
    },
  });
}

function isoWeekBounds(d: Date): { weekStart: Date; weekEnd: Date; weekNumber: number } {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay() || 7; // lundi=1, dimanche=7
  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() - day + 1);
  monday.setUTCHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);

  // Numéro ISO selon norme : jeudi de la semaine + 1er jeudi de l'année
  const tmp = new Date(monday);
  tmp.setUTCDate(tmp.getUTCDate() + 3);
  const firstThursday = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 4));
  const diffWeeks = Math.round(
    (tmp.getTime() - firstThursday.getTime()) / (7 * 86_400_000)
  );
  const weekNumber = 1 + diffWeeks;

  return { weekStart: monday, weekEnd: sunday, weekNumber };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
