"use client";

import { MapPin, Camera, Loader2 } from "lucide-react";
import type { GeoStatus, GeoPosition } from "@/hooks/useGeolocation";
import { formatLatLngDms } from "@/hooks/useGeolocation";

interface Props {
  geoStatus: GeoStatus;
  geoPosition: GeoPosition | null;
  geoError: string | null;
  distanceM: number | null;
  insideGeofence: boolean | null;
  onRetryGeo: () => void;
}

// Card pré-pointage : statut GPS + statut Selfie (info statique car la
// caméra n'est ouverte qu'au tap du bouton héros). 2 lignes empilées.
export function ClockConditionsCard({
  geoStatus,
  geoPosition,
  geoError,
  distanceM,
  insideGeofence,
  onRetryGeo,
}: Props) {
  return (
    <article className="mb-3.5 rounded-2xl border border-slate-100 bg-white p-4">
      {/* GPS row */}
      <div className="mb-2.5 flex items-center gap-3">
        <span
          className={`grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl ${
            geoStatus === "granted" ? "bg-emerald-50 text-emerald-600" : geoStatus === "denied" ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-500"
          }`}
        >
          {geoStatus === "requesting" ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <MapPin className="h-5 w-5" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-bold text-slate-900">
            {labelForGeoStatus(geoStatus, geoError)}
          </p>
          <p className="truncate font-mono text-[12px] text-slate-500">
            {geoPosition
              ? `${formatLatLngDms(geoPosition.lat, geoPosition.lng)} · ±${geoPosition.accuracyM} m`
              : geoError ?? "En attente du GPS…"}
          </p>
        </div>
        {geoStatus === "granted" && insideGeofence != null && (
          <span
            className={`flex-shrink-0 rounded-md px-2.5 py-1 text-[11px] font-bold ${
              insideGeofence
                ? "bg-emerald-50 text-emerald-600"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            {insideGeofence
              ? "OK chantier"
              : distanceM != null
                ? `${formatDistance(distanceM)} loin`
                : "Hors zone"}
          </span>
        )}
        {(geoStatus === "denied" || geoStatus === "error") && (
          <button
            type="button"
            onClick={onRetryGeo}
            className="flex-shrink-0 rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700"
          >
            Réessayer
          </button>
        )}
      </div>

      {/* Selfie row */}
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl bg-purple-50 text-purple-600">
          <Camera className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-bold text-slate-900">Selfie requis</p>
          <p className="text-[12px] text-slate-500">Photo prise au tap du bouton héros</p>
        </div>
      </div>
    </article>
  );
}

function labelForGeoStatus(status: GeoStatus, error: string | null): string {
  if (status === "granted") return "Position GPS ✓ détectée";
  if (status === "requesting") return "Recherche du GPS…";
  if (status === "denied") return "GPS refusé — active la localisation";
  if (status === "unsupported") return "GPS non supporté";
  if (status === "error") return error ?? "GPS indisponible";
  return "GPS en attente";
}

function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}
