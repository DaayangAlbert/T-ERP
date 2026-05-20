"use client";

import { TrendingUp } from "lucide-react";
import type { DtDashboardResponse } from "@/hooks/useDtDashboard";

function formatBillions(amount: number): string {
  if (amount >= 1_000_000_000) return `${new Intl.NumberFormat("fr-FR").format(Math.round(amount))} FCFA`;
  if (amount >= 1_000_000) return `${new Intl.NumberFormat("fr-FR").format(Math.round(amount))} FCFA`;
  return `${amount.toLocaleString("fr-FR")} FCFA`;
}

interface Props {
  banner: DtDashboardResponse["banner"];
}

export function DtProductionBanner({ banner }: Props) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#3C1361] via-[#5B2A86] to-[#7E3FB7] p-4 text-white shadow-lg sm:p-5">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-white/70">
        Production cumulée YTD
      </div>
      <div className="mt-1.5 flex flex-col gap-1.5 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div className="font-mono text-[22px] font-bold leading-none tracking-tight sm:text-[24px] md:text-[28px] lg:text-[32px]">
          {formatBillions(banner.cumulativeProductionYtd)}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-white/85 sm:text-[12px]">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/25 px-2 py-0.5 font-semibold text-emerald-100">
            <TrendingUp className="h-3 w-3" /> +{banner.productionDeltaVsN1.toFixed(1)} % vs N-1
          </span>
          <span>
            <strong className="text-white">{banner.activeSites}</strong> chantiers ·{" "}
            <strong className="text-white">{banner.headcountOnSite}</strong> sur site
          </span>
          <span>
            Marge <strong className="text-white">{banner.marginAvg.toFixed(1)} %</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
