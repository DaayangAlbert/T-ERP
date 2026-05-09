"use client";

import Link from "next/link";
import { clsx } from "clsx";
import { Sparkline } from "./Sparkline";
import { formatDelta } from "@/lib/format";
import type { DashboardKpi } from "@/hooks/useDashboardDg";

interface Props {
  label: string;
  href?: string;
  kpi: DashboardKpi;
  /** Pre-formatted main value (e.g., "2,84 Md FCFA"). */
  value: string;
  /** Suffix rendered smaller next to the value (e.g., "Md FCFA", "%"). */
  unit?: string;
  /** Hex color for the sparkline; defaults to violet. */
  sparkColor?: string;
}

const TONE_CLASSES = {
  up: "text-success bg-green-50",
  down: "text-danger bg-rose-50",
  flat: "text-ink-3 bg-surface-alt",
} as const;

export function KpiCard({ label, href, kpi, value, unit, sparkColor = "#A855F7" }: Props) {
  const delta = formatDelta(kpi.trend, { unit: kpi.trendUnit });
  const Inner = (
    <div className="group flex h-full flex-col rounded-xl border border-line bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-brand-lg">
      <div className="text-[11px] font-medium uppercase tracking-wide text-ink-3">{label}</div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <div className="font-semibold leading-none">
          <span className="font-mono text-[26px] text-ink tabular-nums">{value}</span>
          {unit && <span className="ml-1 text-[12px] font-medium text-ink-3">{unit}</span>}
        </div>
        <Sparkline values={kpi.sparkline} stroke={sparkColor} />
      </div>
      <div className="mt-2 flex items-center gap-2 text-[11.5px]">
        <span
          className={clsx(
            "rounded-md px-1.5 py-0.5 font-semibold",
            TONE_CLASSES[delta.tone]
          )}
        >
          {delta.label}
        </span>
        <span className="text-ink-3">{kpi.trendLabel}</span>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} aria-label={label}>
        {Inner}
      </Link>
    );
  }
  return Inner;
}
