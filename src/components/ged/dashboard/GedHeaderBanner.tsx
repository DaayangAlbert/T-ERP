"use client";

import { FolderOpen } from "lucide-react";
import type { GedDashboardResponse } from "@/hooks/useGedDashboard";

function formatVolume(bytes: number): string {
  if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(1)} Go`;
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(0)} Mo`;
  return `${(bytes / 1_000).toFixed(0)} Ko`;
}

interface Props {
  banner: GedDashboardResponse["banner"];
}

export function GedHeaderBanner({ banner }: Props) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#3C1361] via-[#5B2A86] to-[#7E3FB7] p-4 text-white shadow-lg sm:p-5">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-white/70">
        Référent documentaire
      </div>
      <div className="mt-1.5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-white/15">
            <FolderOpen className="h-6 w-6" />
          </div>
          <div className="font-mono text-[18px] font-bold leading-tight tracking-tight sm:text-[20px] md:text-[22px]">
            <span className="text-white">{banner.spacesCount}</span>
            <span className="ml-2 text-[13px] font-normal text-white/85 sm:text-[14px]">espaces</span>
            <span className="mx-2 text-white/60">·</span>
            <span className="text-white">{banner.activeDocumentsCount.toLocaleString("fr-FR")}</span>
            <span className="ml-2 text-[13px] font-normal text-white/85 sm:text-[14px]">documents</span>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 self-start rounded-full bg-white/15 px-2.5 py-1 text-[11.5px] font-semibold text-white sm:self-auto">
          Volume total · {formatVolume(banner.totalVolumeBytes)}
        </span>
      </div>
    </div>
  );
}
