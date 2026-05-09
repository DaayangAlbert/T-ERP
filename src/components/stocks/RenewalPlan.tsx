"use client";

import { Calendar, AlertTriangle } from "lucide-react";
import { useFixedAssets } from "@/hooks/useStocks";
import { AssetCategory } from "@prisma/client";
import { formatFCFA } from "@/lib/format";
import { clsx } from "clsx";

const CATEGORY_LABEL: Record<AssetCategory, string> = {
  EQUIPMENT: "Engins",
  VEHICLE: "Véhicules",
  BUILDING: "Bâtiments",
  TOOLING: "Outillage",
  IT: "Informatique",
  FURNITURE: "Mobilier",
  OTHER: "Autres",
};

export function RenewalPlan() {
  const { data, isLoading } = useFixedAssets();
  if (isLoading || !data) return <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />;

  if (data.renewalPlan.length === 0) {
    return (
      <div className="rounded-lg border border-success/30 bg-success/5 p-4 text-[13px] text-success">
        ✓ Aucune immobilisation à renouveler dans les 24 prochains mois.
      </div>
    );
  }

  const totalValue = data.renewalPlan.reduce((s, r) => s + BigInt(r.netValue), 0n);

  return (
    <section className="rounded-xl border border-warning/30 bg-warning/5 p-4">
      <h3 className="mb-3 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wider text-warning">
        <Calendar className="h-3.5 w-3.5" />
        Plan de renouvellement (12-24 mois)
      </h3>
      <p className="mb-3 text-[12px] text-warning/80">
        {data.renewalPlan.length} immobilisation{data.renewalPlan.length > 1 ? "s" : ""} en fin de vie utile · VNC à renouveler {formatFCFA(totalValue)}
      </p>
      <ul className="space-y-2">
        {data.renewalPlan.map((r) => (
          <li
            key={r.id}
            className="flex items-center justify-between rounded-md border border-warning/20 bg-white px-3 py-2 text-[12.5px]"
          >
            <div>
              <span className="font-mono text-[10.5px] text-ink-3">{r.code}</span>
              <span className="ml-2 font-medium text-ink">{r.description}</span>
              <div className="text-[11px] text-ink-3">{CATEGORY_LABEL[r.category]}</div>
            </div>
            <div className="text-right">
              <div className={clsx("font-mono text-[12px] font-semibold", r.remainingMonths < 6 ? "text-danger" : "text-warning")}>
                {r.remainingMonths < 0 ? <AlertTriangle className="inline h-3 w-3" /> : null}
                {r.remainingMonths} mois
              </div>
              <div className="text-[10.5px] text-ink-3">VNC {formatFCFA(BigInt(r.netValue))}</div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
