"use client";

import { useEffect, useState } from "react";
import type { OuvClockState } from "@/hooks/useOuvDashboard";

interface Props {
  state: OuvClockState;
  arrivalTime: string | null;
  departureTime: string | null;
  totalHours: number;
}

// Card pleine largeur centrée : date + heure live 36px + badge état.
// Mirror direct de la première card de screen-ouv-pointage.
export function ClockStateCard({ state, arrivalTime, departureTime, totalHours }: Props) {
  const now = useNow(60_000);

  return (
    <article className="mb-3.5 rounded-2xl bg-white p-5 text-center shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
      <p className="text-[13px] font-semibold uppercase tracking-wide text-slate-500">
        {formatFrDate(now)}
      </p>
      <p
        className="my-1.5 text-[36px] font-extrabold text-slate-900"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {formatHHMM(now)}
      </p>
      <StateBadge state={state} arrivalTime={arrivalTime} departureTime={departureTime} totalHours={totalHours} />
    </article>
  );
}

function StateBadge({
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
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-4 py-1.5 text-[12px] font-bold text-amber-800">
        ⏰ Pas encore pointé aujourd'hui
      </span>
    );
  }
  if (state === "IN_PROGRESS") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-4 py-1.5 text-[12px] font-bold text-emerald-800">
        ✓ En poste depuis {arrivalTime ? formatHHMM(new Date(arrivalTime)) : "—"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-200 px-4 py-1.5 text-[12px] font-bold text-slate-700">
      ✓ Journée terminée · {totalHours.toFixed(1)}h
      {departureTime && ` (sortie ${formatHHMM(new Date(departureTime))})`}
    </span>
  );
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
