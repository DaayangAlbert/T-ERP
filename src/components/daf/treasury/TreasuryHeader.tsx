"use client";

import { RefreshCw } from "lucide-react";
import { useSyncBanks } from "@/hooks/useDafTreasury";
import { useAccess } from "@/hooks/useAccess";
import { MODULES } from "@/lib/rbac/modules";
import { formatFCFA } from "@/lib/format";

interface Props {
  consolidatedPosition: string;
  totalAvailable: string;
}

export function TreasuryHeader({ consolidatedPosition, totalAvailable }: Props) {
  const sync = useSyncBanks();
  // Édition autorisée via matrice : FULL sur DAF = canEdit=true. Un DG en
  // drill-down (READ) verra le bouton de sync désactivé.
  const canAct = useAccess(MODULES.DAF).canEdit;

  return (
    <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-primary-700 via-primary-600 to-primary-500 p-4 text-white shadow-brand sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-white/80 sm:text-[11px]">
            Position consolidée temps réel
          </div>
          <div className="mt-1 font-mono text-[24px] font-bold tabular-nums sm:text-[32px] xl:text-[36px]">
            {formatFCFA(BigInt(consolidatedPosition), { scale: "raw" })}
          </div>
          <div className="mt-0.5 text-[11.5px] text-white/80 sm:text-[12.5px]">
            Disponible (lignes incl.) · {formatFCFA(BigInt(totalAvailable))}
          </div>
        </div>
        <button
          type="button"
          onClick={() => sync.mutate()}
          disabled={!canAct || sync.isPending}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-white/15 px-3 text-[12.5px] font-medium text-white backdrop-blur hover:bg-white/25 disabled:opacity-50"
        >
          <RefreshCw className={sync.isPending ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
          {sync.isPending ? "Sync…" : "Synchroniser"}
        </button>
      </div>
    </section>
  );
}
