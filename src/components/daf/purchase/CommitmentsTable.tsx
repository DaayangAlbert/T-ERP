"use client";

import { Calendar } from "lucide-react";
import { clsx } from "clsx";
import { useCommitments } from "@/hooks/useDafPurchase";

function fmt(amount: string): string {
  return new Intl.NumberFormat("fr-FR").format(Number(amount));
}

function fmtDate(s: string | null): string {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export function CommitmentsTable() {
  const { data, isLoading } = useCommitments();

  if (isLoading || !data) {
    return <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />;
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-md border border-line bg-white p-2.5 text-center">
          <div className="text-[10.5px] uppercase text-ink-3">Engagements</div>
          <div className="font-mono text-[14px] font-bold text-ink">{data.summary.count}</div>
        </div>
        <div className="rounded-md border border-line bg-white p-2.5 text-center">
          <div className="text-[10.5px] uppercase text-ink-3">Total engagé</div>
          <div className="font-mono text-[13px] font-bold text-ink">{fmt(data.summary.total)}</div>
        </div>
        <div className="rounded-md border border-line bg-white p-2.5 text-center">
          <div className="text-[10.5px] uppercase text-ink-3">Restant à facturer</div>
          <div className="font-mono text-[13px] font-bold text-ink">{fmt(data.summary.remaining)}</div>
        </div>
        <div className={clsx("rounded-md border p-2.5 text-center", Number(data.summary.due30d) > 0 ? "border-amber-200 bg-amber-50" : "border-line bg-white")}>
          <div className={clsx("text-[10.5px] uppercase", Number(data.summary.due30d) > 0 ? "text-amber-800" : "text-ink-3")}>Impact tréso 30j</div>
          <div className={clsx("font-mono text-[13px] font-bold", Number(data.summary.due30d) > 0 ? "text-amber-800" : "text-ink")}>
            {fmt(data.summary.due30d)}
          </div>
        </div>
      </div>

      {data.items.length === 0 ? (
        <div className="mt-3 rounded-xl border border-line bg-white p-6 text-center text-[13px] text-ink-3">
          Aucun engagement actif.
        </div>
      ) : (
        <>
          <div className="mt-3 hidden overflow-x-auto rounded-xl border border-line bg-white md:block">
            <table className="w-full text-[13px]">
              <thead className="bg-surface-alt text-[11.5px] uppercase tracking-wide text-ink-3">
                <tr>
                  <th className="px-3 py-2 text-left">Fournisseur</th>
                  <th className="px-3 py-2 text-left">BC</th>
                  <th className="px-3 py-2 text-right">Montant engagé</th>
                  <th className="px-3 py-2 text-right">Livré</th>
                  <th className="px-3 py-2 text-right">Facturé</th>
                  <th className="px-3 py-2 text-right">Restant</th>
                  <th className="px-3 py-2 text-left">Livraison attendue</th>
                  <th className="px-3 py-2 text-center">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.items.map((it) => (
                  <tr key={it.id} className="hover:bg-surface-alt/40">
                    <td className="px-3 py-2 font-medium text-ink">{it.supplier}</td>
                    <td className="px-3 py-2 font-mono text-[12px] text-ink-3">{it.poRef}</td>
                    <td className="px-3 py-2 text-right font-mono">{fmt(it.amount)}</td>
                    <td className="px-3 py-2 text-right font-mono text-ink-3">{fmt(it.deliveredAmount)}</td>
                    <td className="px-3 py-2 text-right font-mono text-ink-3">{fmt(it.invoicedAmount)}</td>
                    <td className="px-3 py-2 text-right font-mono font-semibold text-ink">{fmt(it.remaining)}</td>
                    <td className="px-3 py-2 text-[12px] text-ink-3">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {fmtDate(it.expectedDeliveryDate)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center text-[11.5px]">
                      <span
                        className={clsx(
                          "rounded px-1.5 py-0.5 font-medium",
                          it.status === "PARTIAL_DELIVERY" ? "bg-amber-100 text-amber-800" : "bg-primary-100 text-primary-800"
                        )}
                      >
                        {it.status === "PARTIAL_DELIVERY" ? "partiel" : "actif"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 space-y-2 md:hidden">
            {data.items.map((it) => (
              <div key={it.id} className="rounded-xl border border-line bg-white p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[13px] font-semibold text-ink">{it.supplier}</div>
                    <div className="font-mono text-[11px] text-ink-3">{it.poRef}</div>
                  </div>
                  <span
                    className={clsx(
                      "rounded px-1.5 py-0.5 text-[10.5px] font-medium",
                      it.status === "PARTIAL_DELIVERY" ? "bg-amber-100 text-amber-800" : "bg-primary-100 text-primary-800"
                    )}
                  >
                    {it.status === "PARTIAL_DELIVERY" ? "partiel" : "actif"}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-[10px] uppercase text-ink-3">Engagé</div>
                    <div className="font-mono text-[11.5px] text-ink">{fmt(it.amount)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-ink-3">Facturé</div>
                    <div className="font-mono text-[11.5px] text-ink-3">{fmt(it.invoicedAmount)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-ink-3">Restant</div>
                    <div className="font-mono text-[11.5px] font-semibold text-ink">{fmt(it.remaining)}</div>
                  </div>
                </div>
                <div className="mt-1 text-[11px] text-ink-3">
                  <Calendar className="mr-1 inline h-3 w-3" /> Livraison : {fmtDate(it.expectedDeliveryDate)}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
