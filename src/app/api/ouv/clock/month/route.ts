import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardOuv } from "@/lib/rbac/ouv-guard";

export const dynamic = "force-dynamic";

// GET /api/ouv/clock/month?year=2026&month=5
// Tous les pointages du mois pour la vue calendrier dépliable.
export async function GET(req: Request) {
  const guard = guardOuv();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const url = new URL(req.url);
  const year = Number(url.searchParams.get("year") ?? new Date().getFullYear());
  const month = Number(url.searchParams.get("month") ?? new Date().getMonth() + 1);
  if (!Number.isInteger(year) || year < 2020 || year > 2100) {
    return NextResponse.json({ error: "Année invalide" }, { status: 400 });
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: "Mois invalide" }, { status: 400 });
  }

  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  end.setUTCHours(23, 59, 59, 999);

  const trs = await prisma.timeReport.findMany({
    where: { userId: session.sub, date: { gte: start, lte: end } },
    orderBy: { date: "asc" },
    select: {
      id: true,
      date: true,
      arrivalTime: true,
      departureTime: true,
      totalHours: true,
      overtimeHours: true,
      overtimeType: true,
      status: true,
      outOfGeofence: true,
      contestedAt: true,
    },
  });

  return NextResponse.json({
    year,
    month,
    days: trs.map((t) => ({
      id: t.id,
      date: t.date.toISOString(),
      arrivalTime: t.arrivalTime?.toISOString() ?? null,
      departureTime: t.departureTime?.toISOString() ?? null,
      totalHours: t.totalHours,
      overtimeHours: t.overtimeHours,
      overtimeType: t.overtimeType,
      status: t.status,
      outOfGeofence: t.outOfGeofence,
      contested: t.contestedAt != null,
    })),
  });
}
