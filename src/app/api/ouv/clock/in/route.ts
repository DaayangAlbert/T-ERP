import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { guardOuv } from "@/lib/rbac/ouv-guard";
import { clockInSchema } from "@/schemas/ouv-clock";
import {
  DEFAULT_GEOFENCE_RADIUS_M,
  ALERT_GEOFENCE_RADIUS_M,
  haversineDistanceM,
} from "@/lib/ouv/geo";
import { TimeStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

// POST /api/ouv/clock/in — Pointage d'arrivée autonome ouvrier.
//
// Workflow :
//  1. Vérifie session WORKER (guardOuv)
//  2. Vérifie que le site appartient au tenant et au périmètre de l'ouvrier
//  3. Calcule la distance GPS vs site → outOfGeofence (> 100m)
//     · 100m-500m : warning soft (UI prévient, l'ouvrier peut confirmer)
//     · > 500m   : blocage tant que acknowledgeOutOfGeofence !== true,
//                  puis alerte WhatsApp CC (TODO fn 1.6 / integration WA)
//  4. Vérifie deviceFingerprint vs deviceFingerprints[] (max 3 appareils)
//  5. Upsert TimeReport du jour avec arrivalTime + GPS + selfie + status PRESENT
//  6. Retourne le TimeReport créé pour MAJ optimiste côté UI
//
// Idempotent : si l'ouvrier a déjà pointé son arrivée du jour, on renvoie le
// pointage existant sans erreur (utile pour le replay de la file offline).

export async function POST(req: Request) {
  const guard = guardOuv();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  try {
    const body = await req.json();
    const input = clockInSchema.parse(body);

    const me = await prisma.user.findUnique({
      where: { id: session.sub },
      select: {
        id: true,
        tenantId: true,
        assignedSiteIds: true,
        deviceFingerprints: true,
      },
    });
    if (!me) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

    // Sécurité : le site doit appartenir au périmètre de l'ouvrier
    if (!me.assignedSiteIds.includes(input.siteId)) {
      return NextResponse.json(
        { error: "Chantier non affecté à cet ouvrier" },
        { status: 403 }
      );
    }
    const site = await prisma.site.findFirst({
      where: { id: input.siteId, tenantId: me.tenantId ?? undefined },
      select: { id: true, lat: true, lng: true, name: true },
    });
    if (!site) return NextResponse.json({ error: "Chantier introuvable" }, { status: 404 });

    // Geofence : on calcule la distance si on a les deux paires de coords
    let distanceM: number | null = null;
    let outOfGeofence = false;
    let farFromSite = false;
    if (input.geo && site.lat != null && site.lng != null) {
      distanceM = haversineDistanceM(input.geo.lat, input.geo.lng, site.lat, site.lng);
      outOfGeofence = distanceM > DEFAULT_GEOFENCE_RADIUS_M;
      farFromSite = distanceM > ALERT_GEOFENCE_RADIUS_M;
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

    // Device fingerprint : limite 3 appareils enrôlés. Si nouveau, on l'enrôle
    // tant que < 3 ; au-delà on bloque (alerte CC en V2 fn 1.6 + OTP WhatsApp).
    let deviceFingerprints = me.deviceFingerprints;
    if (input.deviceFingerprint) {
      if (!deviceFingerprints.includes(input.deviceFingerprint)) {
        if (deviceFingerprints.length >= 3) {
          return NextResponse.json(
            {
              error: "Trop d'appareils enrôlés. Contactez votre chef de chantier.",
              code: "DEVICE_LIMIT_REACHED",
            },
            { status: 403 }
          );
        }
        deviceFingerprints = [...deviceFingerprints, input.deviceFingerprint];
        await prisma.user.update({
          where: { id: me.id },
          data: { deviceFingerprints },
        });
      }
    }

    const arrival = input.at ? new Date(input.at) : new Date();
    const date = new Date(
      Date.UTC(arrival.getUTCFullYear(), arrival.getUTCMonth(), arrival.getUTCDate())
    );

    // Idempotence : si déjà pointé, on retourne sans erreur
    const existing = await prisma.timeReport.findUnique({
      where: { userId_date: { userId: me.id, date } },
    });
    if (existing?.arrivalTime) {
      return NextResponse.json({
        timeReport: serializeTimeReport(existing),
        already: true,
        distanceM: distanceM != null ? Math.round(distanceM) : null,
        outOfGeofence,
      });
    }

    const selfieUrl = input.selfie ?? null;
    const created = await prisma.timeReport.upsert({
      where: { userId_date: { userId: me.id, date } },
      create: {
        tenantId: me.tenantId ?? "",
        userId: me.id,
        date,
        siteId: site.id,
        arrivalTime: arrival,
        breakMinutes: 60,
        totalHours: 0,
        standardHours: 0,
        overtimeHours: 0,
        status: TimeStatus.PRESENT,
        pointedBy: me.id, // pointage autonome ouvrier
        entryGeoLat: input.geo?.lat ?? null,
        entryGeoLng: input.geo?.lng ?? null,
        entryGeoAccuracyM: input.geo?.accuracyM ?? null,
        entrySelfieUrl: selfieUrl,
        deviceFingerprint: input.deviceFingerprint ?? null,
        outOfGeofence,
      },
      update: {
        arrivalTime: arrival,
        siteId: site.id,
        status: TimeStatus.PRESENT,
        entryGeoLat: input.geo?.lat ?? null,
        entryGeoLng: input.geo?.lng ?? null,
        entryGeoAccuracyM: input.geo?.accuracyM ?? null,
        entrySelfieUrl: selfieUrl,
        deviceFingerprint: input.deviceFingerprint ?? null,
        outOfGeofence,
      },
    });

    return NextResponse.json({
      timeReport: serializeTimeReport(created),
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
    console.error("[POST /api/ouv/clock/in]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

function serializeTimeReport(tr: {
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
