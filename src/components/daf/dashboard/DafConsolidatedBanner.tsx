"use client";

import { TrendingUp, TrendingDown } from "lucide-react";
import { formatFCFA } from "@/lib/format";

interface Props {
  position: {
    value: string;
    dailyDelta: number;
    creditLines: { granted: string; used: string; available: string };
    totalAvailable: string;
  };
}

export function DafConsolidatedBanner({ position }: Props) {
  const isPositive = position.dailyDelta >= 0;
  return (
    <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-primary-700 via-primary-600 to-primary-500 p-4 text-white shadow-brand sm:p-5">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-white/80 sm:text-[11px]">
        Position consolidée du jour
      </div>
      <div className="mt-1 font-mono text-[24px] font-bold tabular-nums sm:text-[32px] xl:text-[36px]">
        {formatFCFA(BigInt(position.value), { scale: "raw" })}
      </div>
      <div className="mt-1 flex items-center gap-1 text-[12px] text-white/90 sm:text-[13px]">
        {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
        {isPositive ? "+" : ""}
        {formatFCFA(position.dailyDelta)} vs hier
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <Stat label="Lignes accordées" value={formatFCFA(BigInt(position.creditLines.granted))} />
        <Stat label="Utilisées" value={formatFCFA(BigInt(position.creditLines.used))} />
        <Stat label="Disponible" value={formatFCFA(BigInt(position.totalAvailable))} highlight />
      </div>
    </section>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className={
        "rounded-lg p-2 backdrop-blur " +
        (highlight ? "bg-white/20 ring-1 ring-white/30" : "bg-white/10")
      }
    >
      <div className="text-[10px] uppercase tracking-wider text-white/70">{label}</div>
      <div className="mt-0.5 font-mono text-[14px] font-semibold sm:text-[15px]">{value}</div>
    </div>
  );
}
