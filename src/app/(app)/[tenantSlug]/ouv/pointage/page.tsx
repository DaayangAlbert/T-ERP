"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useOuvDashboard } from "@/hooks/useOuvDashboard";
import {
  useClockToday,
  useClockWeek,
  useClockIn,
  useClockOut,
  useDispute,
} from "@/hooks/useOuvClock";
import { useGeolocation } from "@/hooks/useGeolocation";
import { getOrCreateDeviceFingerprint } from "@/lib/ouv/device-fingerprint";
import { haversineDistanceM, DEFAULT_GEOFENCE_RADIUS_M } from "@/lib/ouv/geo";

import { ClockStateCard } from "@/components/ouv/pointage/ClockStateCard";
import { ClockHeroButton } from "@/components/ouv/pointage/ClockHeroButton";
import { ClockConditionsCard } from "@/components/ouv/pointage/ClockConditionsCard";
import { ClockSelfieCapture } from "@/components/ouv/pointage/ClockSelfieCapture";
import { WeeklyHistoryList } from "@/components/ouv/pointage/WeeklyHistoryList";
import { WeekMonthKpis } from "@/components/ouv/pointage/WeekMonthKpis";
import { DisputeCard } from "@/components/ouv/pointage/DisputeCard";
import { DisputeFormModal } from "@/components/ouv/pointage/DisputeFormModal";
import { OfflineIndicator } from "@/components/ouv/pointage/OfflineIndicator";

// Page mirror du prototype screen-ouv-pointage. Orchestre :
//  - lecture pointage du jour + semaine
//  - capture GPS au mount (single shot)
//  - sur tap bouton héros : ouvre selfie modal → submit POST clock/in ou /out
//    avec fallback offline IndexedDB si réseau coupé
//  - confirmation utilisateur si > 500m du chantier (alertGeofence)
//  - signalement désaccord (modal bottom-sheet)

export default function OuvPointagePage() {
  const params = useParams<{ tenantSlug: string }>();
  const tenantSlug = params?.tenantSlug ?? "";

  const dashboard = useOuvDashboard();
  const today = useClockToday();
  const week = useClockWeek();
  const clockIn = useClockIn();
  const clockOut = useClockOut();
  const disputeMut = useDispute();
  const geo = useGeolocation({ enabled: true });

  const [deviceFp, setDeviceFp] = useState<string | null>(null);
  const [selfieOpen, setSelfieOpen] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error" | "warning"; message: string } | null>(null);

  useEffect(() => {
    void getOrCreateDeviceFingerprint().then(setDeviceFp);
  }, []);

  // Calcul distance + geofence côté client (vérif visuelle ; le serveur revérifie)
  const { distanceM, insideGeofence } = useMemo(() => {
    const a = dashboard.data?.assignment;
    if (!geo.position || !a?.siteLat || !a?.siteLng) {
      return { distanceM: null as number | null, insideGeofence: null as boolean | null };
    }
    const d = haversineDistanceM(geo.position.lat, geo.position.lng, a.siteLat, a.siteLng);
    return { distanceM: d, insideGeofence: d <= DEFAULT_GEOFENCE_RADIUS_M };
  }, [geo.position, dashboard.data?.assignment]);

  const state = today.data?.state ?? "NOT_CLOCKED";
  const chiefFullName = dashboard.data?.assignment?.chief
    ? `${dashboard.data.assignment.chief.firstName} ${dashboard.data.assignment.chief.lastName}`
    : null;
  const initials = dashboard.data?.user.initials ?? "??";

  function startPointage() {
    if (state === "DONE") return;
    setFeedback(null);
    setSelfieOpen(true);
  }

  async function handleSelfieCaptured(dataUrl: string | null) {
    setSelfieOpen(false);
    const a = dashboard.data?.assignment;
    if (!a) {
      setFeedback({ tone: "error", message: "Pas d'affectation chantier active" });
      return;
    }
    setSubmitting(true);
    const payload = {
      siteId: a.siteId,
      geo: geo.position
        ? { lat: geo.position.lat, lng: geo.position.lng, accuracyM: geo.position.accuracyM }
        : null,
      selfie: dataUrl,
      deviceFingerprint: deviceFp,
    };

    const submit = async (ack: boolean) => {
      if (state === "NOT_CLOCKED") {
        return clockIn.mutateAsync({ ...payload, acknowledgeOutOfGeofence: ack });
      }
      const { siteId: _siteId, ...rest } = payload;
      return clockOut.mutateAsync({ ...rest, acknowledgeOutOfGeofence: ack });
    };

    try {
      let result = await submit(false);
      if (!result.ok && result.errorCode === "OUT_OF_GEOFENCE_FAR") {
        const confirmed = window.confirm(
          `Vous êtes à ${result.distanceM ?? "?"} m du chantier (> 500 m). Confirmer le pointage malgré tout ?`
        );
        if (!confirmed) {
          setSubmitting(false);
          return;
        }
        result = await submit(true);
      }
      if (result.queued) {
        setFeedback({
          tone: "warning",
          message: "📵 Pas de réseau — pointage stocké, sera synchronisé au retour",
        });
      } else if (result.ok) {
        setFeedback({
          tone: "success",
          message:
            state === "NOT_CLOCKED"
              ? "✓ Pointage d'arrivée enregistré"
              : "✓ Pointage de sortie enregistré",
        });
      } else {
        setFeedback({ tone: "error", message: result.message ?? "Erreur" });
      }
    } catch (err: any) {
      setFeedback({ tone: "error", message: err?.message ?? "Erreur réseau" });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDispute(id: string, reason: string) {
    await disputeMut.mutateAsync({ id, reason });
    setFeedback({ tone: "success", message: "✓ Désaccord transmis au chef chantier" });
  }

  const heroDisabled = geo.status === "denied" || geo.status === "unsupported" || !dashboard.data?.assignment;

  return (
    <>
      <OfflineIndicator />

      {/* Header avec back arrow */}
      <header className="flex items-center gap-3 bg-[#2A1B3D] px-4 py-3 text-white">
        <Link
          href={`/${tenantSlug}/ouv/dashboard`}
          aria-label="Retour"
          className="grid h-9 w-9 place-items-center rounded-full bg-white/10"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <p className="text-[17px] font-bold leading-tight">Mon pointage</p>
        </div>
        <span className="grid h-9 w-9 place-items-center rounded-full bg-purple-500 text-[13px] font-bold">
          {initials}
        </span>
      </header>

      <main className="page mx-auto w-full max-w-screen-md px-3 pt-3.5">
        <ClockStateCard
          state={state}
          arrivalTime={today.data?.timeReport?.arrivalTime ?? null}
          departureTime={today.data?.timeReport?.departureTime ?? null}
          totalHours={today.data?.timeReport?.totalHours ?? 0}
        />

        <ClockHeroButton
          state={state}
          pending={submitting || clockIn.isPending || clockOut.isPending}
          disabled={heroDisabled}
          onClick={startPointage}
        />

        {feedback && (
          <div
            className={`mb-3.5 rounded-xl px-4 py-3 text-[14px] font-semibold ${
              feedback.tone === "success"
                ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
                : feedback.tone === "warning"
                  ? "bg-amber-50 text-amber-900 ring-1 ring-amber-200"
                  : "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
            }`}
            role="status"
          >
            {feedback.message}
          </div>
        )}

        <ClockConditionsCard
          geoStatus={geo.status}
          geoPosition={geo.position}
          geoError={geo.error}
          distanceM={distanceM}
          insideGeofence={insideGeofence}
          onRetryGeo={geo.refresh}
        />

        <WeeklyHistoryList week={week.data} isLoading={week.isLoading} />

        {week.data && (
          <WeekMonthKpis
            weekTotalHours={week.data.kpis.weekTotalHours}
            monthOvertimeHours={week.data.kpis.monthOvertimeHours}
          />
        )}

        <DisputeCard chiefFullName={chiefFullName} onOpen={() => setDisputeOpen(true)} />
      </main>

      <ClockSelfieCapture
        isOpen={selfieOpen}
        onClose={() => setSelfieOpen(false)}
        onCapture={handleSelfieCaptured}
      />

      <DisputeFormModal
        isOpen={disputeOpen}
        onClose={() => setDisputeOpen(false)}
        days={week.data?.days ?? []}
        onSubmit={handleDispute}
      />
    </>
  );
}
