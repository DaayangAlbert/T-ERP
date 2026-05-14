import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { guardOuv } from "@/lib/rbac/ouv-guard";
import { clockOutSchema } from "@/schemas/ouv-clock";
import { computeOvertime } from "@/lib/ouv/overtime";
import {
  ALERT_GEOFENCE_RADIUS_M,
  DEFAULT_GEOFENCE_RADIUS_M,
  haversineDistanceM,
} from "@/lib/ouv/geo";

export const dynamic = "force-dynamic";

// POST /api/ouv/clock/out — Pointage de sortie autonome ouvrier.
//
// Pré-condition : un TimeReport existe pour le jour avec arrivalTime non nul
// (sinon erreur métier — l'ouvrier doit pointer son arrivée d'abord).
//
// À la sortie :
//  - calcul heures travaillées (arrivée → sortie - pause)
//  - calcul heures supplémentaires selon convention BTP CM
//    (cf src/lib/ouv/overtime.ts)
//  - update TimeReport avec departureTime + totals + selfie sortie

export async function POST(req: Request) {
  const guard = guardOuv();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  try {
    const body = await req.json();
    const input = clockOutSchema.parse(body);

    const now = input.at ? new Date(input.at) : new Date();
    const date = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    );

    const existing = await prisma.timeReport.findUnique({
      where: { userId_date: { userId: session.sub, date } },
      include: { user: { select: { tenantId: true } } },
    });
    if (!existing || !existing.arrivalTime) {
      return NextResponse.json(
        {
          error: "Vous devez pointer votre arrivée avant de pointer la sortie",
          code: "NO_ARRIVAL_YET",
        },
        { status: 409 }
      );
    }

    // Idempotence : si déjà sorti, on renvoie sans erreur
    if (existing.departureTime) {
      return NextResponse.json({
        timeReport: serialize(existing),
        already: true,
      });
    }

    // Geofence sortie
    let distanceM: number | null = null;
    let outOfGeofence = existing.outOfGeofence;
    let farFromSite = false;
    if (input.geo && existing.siteId) {
      const site = await prisma.site.findUnique({
        where: { id: existing.siteId },
        select: { lat: true, lng: true },
      });
      if (site?.lat != null && site.lng != null) {
        distanceM = haversineDistanceM(input.geo.lat, input.geo.lng, site.lat, site.lng);
        if (distanceM > DEFAULT_GEOFENCE_RADIUS_M) outOfGeofence = true;
        farFromSite = distanceM > ALERT_GEOFENCE_RADIUS_M;
      }
    }
    if (farFromSite && !input.acknowledgeOutOfGeofence) {
      return NextResponse.json(
        {
          error: "Vous êtes à plus de 500 m du chantier — confirmation requise",
          code: "OUT_OF_GEOFENCE_FAR",
          distanceM: Math.round(distanceM ?? 0),
          requiresAcknowledge: true,
        },
        { status: 409 }
      );
    }

    const ot = computeOvertime(existing.arrivalTime, now, {
      breakMinutes: existing.breakMinutes ?? 60,
    });

    const updated = await prisma.timeReport.update({
      where: { id: existing.id },
      data: {
        departureTime: now,
        totalHours: ot.totalHours,
        standardHours: ot.standardHours,
        overtimeHours: ot.overtimeHours,
        overtimeType: ot.overtimeType,
        exitGeoLat: input.geo?.lat ?? null,
        exitGeoLng: input.geo?.lng ?? null,
        exitGeoAccuracyM: input.geo?.accuracyM ?? null,
        exitSelfieUrl: input.selfie ?? null,
        outOfGeofence,
        deviceFingerprint: input.deviceFingerprint ?? existing.deviceFingerprint,
      },
    });

    return NextResponse.json({
      timeReport: serialize(updated),
      overtime: ot,
      distanceM: distanceM != null ? Math.round(distanceM) : null,
      outOfGeofence,
    });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: "Données invalides", issues: err.flatten() },
        { status: 400 }
      );
    }
    console.error("[POST /api/ouv/clock/out]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

function serialize(tr: {
  id: string;
  date: Date;
  arrivalTime: Date | null;
  departureTime: Date | null;
  totalHours: number;
  overtimeHours: number;
  status: string;
  outOfGeofence: boolean;
}) {
  return {
    id: tr.id,
    date: tr.date.toISOString(),
    arrivalTime: tr.arrivalTime?.toISOString() ?? null,
    departureTime: tr.departureTime?.toISOString() ?? null,
    totalHours: tr.totalHours,
    overtimeHours: tr.overtimeHours,
    status: tr.status,
    outOfGeofence: tr.outOfGeofence,
  };
}
