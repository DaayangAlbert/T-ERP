import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";
import { canAccess } from "@/lib/rbac/access-matrix";
import { MODULES } from "@/lib/rbac/modules";
import { canClockIn, canViewAllAttendance, canViewSiteAttendance, todayDate } from "@/lib/presence/access";
import { resolveAttendanceLocation } from "@/lib/presence/location";

export const dynamic = "force-dynamic";

/** Contexte de pointage de l'utilisateur courant : lieu attendu + pointage du jour + historique récent. */
export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const role = session.role as Role;
  if (!canAccess(role, MODULES.PRESENCE)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const today = todayDate();
  const [location, report, recent] = await Promise.all([
    resolveAttendanceLocation(session.sub, session.tenantId),
    prisma.timeReport.findUnique({
      where: { userId_date: { userId: session.sub, date: today } },
      select: { arrivalTime: true, departureTime: true, status: true, outOfGeofence: true },
    }),
    prisma.timeReport.findMany({
      where: { userId: session.sub },
      orderBy: { date: "desc" },
      take: 14,
      select: { id: true, date: true, arrivalTime: true, departureTime: true, totalHours: true, status: true, outOfGeofence: true },
    }),
  ]);

  return NextResponse.json({
    canClockIn: canClockIn(role),
    canViewAll: canViewAllAttendance(role),
    canViewSite: canViewSiteAttendance(role),
    location: location
      ? {
          type: location.type,
          name: location.name,
          lat: location.lat,
          lng: location.lng,
          radiusM: location.radiusM,
          configured: location.configured,
        }
      : null,
    today: report
      ? {
          arrivalTime: report.arrivalTime?.toISOString() ?? null,
          departureTime: report.departureTime?.toISOString() ?? null,
          status: report.status,
          outOfGeofence: report.outOfGeofence,
        }
      : null,
    recent: recent.map((r) => ({
      id: r.id,
      date: r.date.toISOString(),
      arrivalTime: r.arrivalTime?.toISOString() ?? null,
      departureTime: r.departureTime?.toISOString() ?? null,
      totalHours: r.totalHours,
      status: r.status,
      outOfGeofence: r.outOfGeofence,
    })),
  });
}
