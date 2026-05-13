"use client";

import { CheckCircle2, AlertTriangle } from "lucide-react";

interface Props {
  registersUpToDate: boolean;
  toUpdateCount: number;
  tenantName: string;
}

export function SgHeaderBanner({ registersUpToDate, toUpdateCount, tenantName }: Props) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#3C1361] via-[#5B2A86] to-[#7E3FB7] p-4 text-white shadow-lg sm:p-5">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-white/70">
        Secrétariat Général · {tenantName}
      </div>
      <div className="mt-1.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="font-mono text-[18px] font-bold leading-tight tracking-tight sm:text-[22px] md:text-[24px]">
          Gouvernance · Juridique · Affaires institutionnelles
        </div>
        {registersUpToDate ? (
          <span className="inline-flex shrink-0 items-center gap-1 self-start rounded-full bg-emerald-500/25 px-2.5 py-1 text-[11.5px] font-semibold text-emerald-100 sm:self-auto">
            <CheckCircle2 className="h-3 w-3" /> Tous registres à jour
          </span>
        ) : (
          <span className="inline-flex shrink-0 items-center gap-1 self-start rounded-full bg-amber-500/25 px-2.5 py-1 text-[11.5px] font-semibold text-amber-100 sm:self-auto">
            <AlertTriangle className="h-3 w-3" /> {toUpdateCount} registre{toUpdateCount > 1 ? "s" : ""} à mettre à jour
          </span>
        )}
      </div>
    </div>
  );
}
