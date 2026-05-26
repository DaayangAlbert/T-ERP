import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role, TimeStatus } from "@prisma/client";
import { canAccess } from "@/lib/rbac/access-matrix";
import { MODULES } from "@/lib/rbac/modules";
import { canClockIn, todayDate } from "@/lib/presence/access";
import { resolveAttendanceLocation } from "@/lib/presence/location";
import { haversineDistanceM } from "@/lib/ouv/geo";

export const dynamic = "force-dynamic";

const schema = z.object({
  action: z.enum(["in", "out"]),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracyM: z.number().int().min(0).max(100000).optional(),
});

/**
 * Pointage d'arrivée / départ avec contrôle GPS strict (blocage hors zone).
 * Le lieu attendu est déterminé automatiquement (chantier affecté → GPS du
 * chantier ; sinon bureau). Le DG et le PCA ne pointent pas (consultation).
 */
export async function POST(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const role = session.role as Role;
  if (!canAccess(role, MODULES.PRESENCE)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  if (!canClockIn(role)) return NextResponse.json({ error: "Ce profil consulte les présences mais ne pointe pas" }, { status: 403 });

  try {
    const data = schema.parse(await req.json());

    const location = await resolveAttendanceLocation(session.sub, session.tenantId);
    if (!location) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    if (!location.configured || location.lat == null || location.lng == null) {
      return NextResponse.json(
        { error: `Le lieu de pointage (${location.name}) n'a pas de coordonnées GPS. Contactez l'informaticien.`, code: "NOT_CONFIGURED" },
        { status: 400 },
      );
    }

    // Contrôle GPS strict : blocage si hors du rayon de tolérance.
    const distanceM = Math.round(haversineDistanceM(data.lat, data.lng, location.lat, location.lng));
    if (distanceM > location.radiusM) {
      return NextResponse.json(
        {
          error: `Vous êtes à ${distanceM} m de ${location.name} (zone autorisée : ${location.radiusM} m). Rapprochez-vous pour pointer.`,
          code: "OUT_OF_ZONE",
          distanceM,
          radiusM: location.radiusM,
        },
        { status: 422 },
      );
    }

    const now = new Date();
    const date = todayDate();
    const existing = await prisma.timeReport.findUnique({
      where: { userId_date: { userId: session.sub, date } },
      select: { id: true, arrivalTime: true, departureTime: true },
    });

    if (data.action === "in") {
      if (existing?.arrivalTime) {
        return NextResponse.json({ error: "Arrivée déjà pointée aujourd'hui." }, { status: 409 });
      }
      const created = await prisma.timeReport.upsert({
        where: { userId_date: { userId: session.sub, date } },
        create: {
          tenantId: session.tenantId,
          userId: session.sub,
          date,
          siteId: location.siteId,
          arrivalTime: now,
          status: TimeStatus.PRESENT,
          pointedBy: session.sub,
          entryGeoLat: data.lat,
          entryGeoLng: data.lng,
          entryGeoAccuracyM: data.accuracyM ?? null,
          outOfGeofence: false,
        },
        update: {
          siteId: location.siteId,
          arrivalTime: now,
          status: TimeStatus.PRESENT,
          entryGeoLat: data.lat,
          entryGeoLng: data.lng,
          entryGeoAccuracyM: data.accuracyM ?? null,
          outOfGeofence: false,
        },
        select: { arrivalTime: true, departureTime: true, status: true },
      });
      return NextResponse.json({
        ok: true,
        action: "in",
        distanceM,
        arrivalTime: created.arrivalTime?.toISOString() ?? null,
      });
    }

    // action === "out"
    if (!existing?.arrivalTime) {
      return NextResponse.json({ error: "Pointez d'abord votre arrivée." }, { status: 400 });
    }
    if (existing.departureTime) {
      return NextResponse.json({ error: "Départ déjà pointé aujourd'hui." }, { status: 409 });
    }

    const arrival = existing.arrivalTime;
    const breakMinutes = 60;
    const grossMs = now.getTime() - arrival.getTime();
    const totalHours = Math.max(0, Math.round((grossMs / 3_600_000 - breakMinutes / 60) * 100) / 100);

    const updated = await prisma.timeReport.update({
      where: { id: existing.id },
      data: {
        departureTime: now,
        exitGeoLat: data.lat,
        exitGeoLng: data.lng,
        exitGeoAccuracyM: data.accuracyM ?? null,
        breakMinutes,
        totalHours,
        standardHours: totalHours,
      },
      select: { arrivalTime: true, departureTime: true, totalHours: true },
    });
    return NextResponse.json({
      ok: true,
      action: "out",
      distanceM,
      departureTime: updated.departureTime?.toISOString() ?? null,
      totalHours: updated.totalHours,
    });
  } catch (err) {
    if (err instanceof ZodError) return NextResponse.json({ error: "Données invalides", issues: err.flatten() }, { status: 400 });
    console.error("[POST /api/presence/clock]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
