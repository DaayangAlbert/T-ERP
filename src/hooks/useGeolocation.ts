"use client";

import { useEffect, useState } from "react";

export type GeoStatus = "idle" | "requesting" | "granted" | "denied" | "unsupported" | "error";

export interface GeoPosition {
  lat: number;
  lng: number;
  accuracyM: number;
  timestamp: number;
}

interface UseGeolocationOptions {
  enabled?: boolean;
  maximumAgeMs?: number; // âge max d'une position cachée acceptable
  timeoutMs?: number;
}

/**
 * Lit la position GPS du smartphone de l'ouvrier. Single shot (pas de
 * watchPosition continu — sinon la batterie souffre, et le pointage ne
 * demande qu'un instant T+1m de précision).
 *
 * État renvoyé :
 *  - status : idle | requesting | granted | denied | unsupported | error
 *  - position : { lat, lng, accuracyM, timestamp } si granted
 *  - error : message si denied/error
 *  - refresh() : déclencher une nouvelle lecture (ex: bouton "Localiser à nouveau")
 */
export function useGeolocation({
  enabled = true,
  maximumAgeMs = 60_000,
  timeoutMs = 10_000,
}: UseGeolocationOptions = {}) {
  const [status, setStatus] = useState<GeoStatus>("idle");
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setStatus("unsupported");
      setError("Géolocalisation non supportée par ce navigateur");
      return;
    }
    setStatus("requesting");
    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (cancelled) return;
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracyM: Math.round(pos.coords.accuracy),
          timestamp: pos.timestamp,
        });
        setStatus("granted");
        setError(null);
      },
      (err) => {
        if (cancelled) return;
        if (err.code === err.PERMISSION_DENIED) {
          setStatus("denied");
          setError("Permission GPS refusée");
        } else if (err.code === err.TIMEOUT) {
          setStatus("error");
          setError("GPS trop long — réessaie à l'extérieur");
        } else {
          setStatus("error");
          setError(err.message || "GPS indisponible");
        }
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: maximumAgeMs }
    );
    return () => {
      cancelled = true;
    };
  }, [enabled, refreshTick, maximumAgeMs, timeoutMs]);

  return {
    status,
    position,
    error,
    refresh: () => setRefreshTick((n) => n + 1),
  };
}

/**
 * Formatte des coordonnées en DMS (degrés minutes secondes) façon prototype :
 *   3.866° → 3°51'58"N
 */
export function formatLatLngDms(lat: number, lng: number): string {
  const latDms = toDms(Math.abs(lat));
  const lngDms = toDms(Math.abs(lng));
  return `${latDms}${lat >= 0 ? "N" : "S"} · ${lngDms}${lng >= 0 ? "E" : "W"}`;
}

function toDms(deg: number): string {
  const d = Math.floor(deg);
  const minutesFull = (deg - d) * 60;
  const m = Math.floor(minutesFull);
  const s = Math.round((minutesFull - m) * 60);
  return `${d}°${String(m).padStart(2, "0")}'${String(s).padStart(2, "0")}"`;
}
