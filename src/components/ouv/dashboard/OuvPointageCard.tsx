"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Clock, MapPin } from "lucide-react";
import type { OuvClockState } from "@/hooks/useOuvDashboard";

interface Props {
  state: OuvClockState;
  arrivalTime: string | null;
  departureTime: string | null;
  totalHours: number;
}

// Card pointage du jour avec bouton HÉROS vert (68px) — élément le plus
// critique du dashboard ouvrier. Tap target XXL pour mains gantées.
// Le bouton navigue vers /ouv/pointage (fn 1.2 traitera la capture GPS+selfie).
export function OuvPointageCard({ state, arrivalTime, departureTime, totalHours }: Props) {
  const params = useParams<{ tenantSlug: string }>();
  const tenantSlug = params?.tenantSlug ?? "";
  const now = useNow(60_000); // tick chaque minute pour l'horloge live

  const dateLabel = formatFrDate(now);
  const timeLabel = formatHHMM(now);

  return (
    <article className="mb-3.5 rounded-2xl bg-white p-[18px] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-wide text-slate-500">
            {dateLabel}
          </p>
          <h2 className="mt-0.5 text-[22px] font-extrabold text-slate-900">
            {timeLabel} <span className="text-base font-medium text-slate-500">· ☀ 26°C</span>
          </h2>
        </div>
        <div className="text-right">
          <p className="text-[12px] text-slate-500">Pointage</p>
          <ClockStateBadge state={state} arrivalTime={arrivalTime} departureTime={departureTime} totalHours={totalHours} />
        </div>
      </div>

      <Link
        href={`/${tenantSlug}/ouv/pointage`}
        className="flex h-[68px] w-full items-center justify-center gap-2.5 rounded-xl bg-[#16A34A] px-4 text-[18px] font-bold text-white shadow-[0_4px_12px_rgba(22,163,74,0.3)] transition active:scale-[0.98]"
      >
        <Clock className="h-7 w-7" strokeWidth={2.5} />
        {labelForState(state)}
      </Link>

      <p className="mt-2.5 flex items-center justify-center gap-1.5 text-[12px] text-slate-500">
        <MapPin className="h-3.5 w-3.5" />
        GPS + selfie · automatique
      </p>
    </article>
  );
}

function ClockStateBadge({
  state,
  arrivalTime,
  departureTime,
  totalHours,
}: {
  state: OuvClockState;
  arrivalTime: string | null;
  departureTime: string | null;
  totalHours: number;
}) {
  if (state === "NOT_CLOCKED") {
    return <p className="text-[14px] font-bold text-[#16A34A]">⏰ Pas encore pointé</p>;
  }
  if (state === "IN_PROGRESS") {
    return (
      <p className="text-[14px] font-bold text-[#16A34A]">
        ✓ En poste depuis {arrivalTime ? formatHHMM(new Date(arrivalTime)) : "—"}
      </p>
    );
  }
  return (
    <p className="text-[14px] font-bold text-slate-700">
      ✓ Fini · {totalHours.toFixed(1)}h
      {departureTime && (
        <span className="block text-[11px] font-normal text-slate-500">
          sortie {formatHHMM(new Date(departureTime))}
        </span>
      )}
    </p>
  );
}

function labelForState(state: OuvClockState): string {
  if (state === "NOT_CLOCKED") return "Je pointe mon arrivée";
  if (state === "IN_PROGRESS") return "Je pointe ma sortie";
  return "Voir mon pointage";
}

function useNow(intervalMs: number): Date {
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function formatFrDate(d: Date): string {
  return d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatHHMM(d: Date): string {
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}
