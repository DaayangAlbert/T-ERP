"use client";

import { ArrowRight, BookOpen } from "lucide-react";
import { useProvisions } from "@/hooks/useDafPurchase";

function fmt(amount: string): string {
  return new Intl.NumberFormat("fr-FR").format(Number(amount));
}

export function ProvisionsList() {
  const { data, isLoading } = useProvisions();

  if (isLoading || !data) {
    return <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />;
  }

  if (data.items.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-white p-6 text-center text-[13px] text-ink-3">
        Aucune provision à constituer ce mois-ci.
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border border-primary-200 bg-primary-50 p-3 sm:flex sm:items-center sm:justify-between">
        <div>
          <h3 className="text-[13px] font-semibold text-primary-900">Provisions à constituer (services en cours non facturés)</h3>
          <p className="text-[12px] text-primary-700">
            {data.summary.count} ligne{data.summary.count > 1 ? "s" : ""} · total à provisionner :{" "}
            <span className="font-mono font-bold">{fmt(data.summary.totalProvision)} FCFA</span>
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {data.items.map((p) => (
          <div key={p.id} className="rounded-xl border border-line bg-white p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-ink">{p.supplier}</div>
                <div className="text-[11.5px] text-ink-3">{p.category}</div>
                <div className="mt-1 font-mono text-[11px] text-ink-3">{p.poRef}</div>
              </div>
              <div className="text-right">
                <div className="text-[10.5px] uppercase text-ink-3">À provisionner</div>
                <div className="font-mono text-[14px] font-bold text-primary-700">{fmt(p.provisionAmount)}</div>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-[11.5px]">
              <div className="rounded-md bg-surface-alt p-2">
                <div className="text-[10.5px] uppercase text-ink-3">Livré</div>
                <div className="font-mono text-ink">{fmt(p.delivered)}</div>
              </div>
              <div className="rounded-md bg-surface-alt p-2">
                <div className="text-[10.5px] uppercase text-ink-3">Facturé</div>
                <div className="font-mono text-ink">{fmt(p.invoiced)}</div>
              </div>
            </div>
            <div className="mt-2 inline-flex items-center gap-1 text-[11.5px] text-ink-3">
              <BookOpen className="h-3 w-3" />
              <span>Écriture OD à passer :</span>
              <span className="font-mono font-semibold text-ink">{p.odReference}</span>
              <ArrowRight className="h-3 w-3" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
