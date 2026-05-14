import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardOuv } from "@/lib/rbac/ouv-guard";

export const dynamic = "force-dynamic";

// GET /api/ouv/clock/today — État du pointage du jour pour l'ouvrier connecté.
// Lecture rapide, mise en cache côté SW (sw-ouv.js) pour fonctionner offline.
export async function GET() {
  const guard = guardOuv();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const tr = await prisma.timeReport.findUnique({
    where: { userId_date: { userId: session.sub, date: today } },
    select: {
      id: true,
      date: true,
      siteId: true,
      arrivalTime: true,
      departureTime: true,
      breakMinutes: true,
      totalHours: true,
      standardHours: true,
      overtimeHours: true,
      overtimeType: true,
      status: true,
      outOfGeofence: true,
      contestedAt: true,
      contestReason: true,
    },
  });

  const state: "NOT_CLOCKED" | "IN_PROGRESS" | "DONE" = !tr
    ? "NOT_CLOCKED"
    : tr.departureTime
      ? "DONE"
      : "IN_PROGRESS";

  return NextResponse.json({
    state,
    timeReport: tr
      ? {
          id: tr.id,
          date: tr.date.toISOString(),
          siteId: tr.siteId,
          arrivalTime: tr.arrivalTime?.toISOString() ?? null,
          departureTime: tr.departureTime?.toISOString() ?? null,
          breakMinutes: tr.breakMinutes,
          totalHours: tr.totalHours,
          standardHours: tr.standardHours,
          overtimeHours: tr.overtimeHours,
          overtimeType: tr.overtimeType,
          status: tr.status,
          outOfGeofence: tr.outOfGeofence,
          contested: tr.contestedAt != null,
          contestReason: tr.contestReason,
        }
      : null,
  });
}
