"use client";

import { useState } from "react";
import { AlertTriangle, Star, TrendingUp } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { clsx } from "clsx";
import {
  useSupplierPaymentHistory,
  useSuppliersFinancial,
  type SupplierFinancialItem,
} from "@/hooks/useDafPurchase";

function fmt(amount: string): string {
  return new Intl.NumberFormat("fr-FR").format(Number(amount));
}

function ratingClasses(rating: string | null): string {
  if (!rating) return "bg-surface-alt text-ink-3";
  if (rating.startsWith("A")) return "bg-emerald-100 text-emerald-800";
  if (rating.startsWith("B")) return "bg-amber-100 text-amber-800";
  if (rating.startsWith("C")) return "bg-rose-100 text-rose-800";
  return "bg-surface-alt text-ink-3";
}

function delayBadge(delta: number): { cls: string; label: string } {
  if (delta <= 0) return { cls: "bg-emerald-100 text-emerald-800", label: "à temps" };
  if (delta <= 7) return { cls: "bg-amber-100 text-amber-800", label: `+${delta} j` };
  return { cls: "bg-rose-100 text-rose-800", label: `+${delta} j` };
}

function MiniDelayChart({ items }: { items: Array<{ month: string; avgDelay: number }> }) {
  return (
    <div className="h-16 w-full">
      <ResponsiveContainer>
        <BarChart data={items} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <XAxis dataKey="month" hide />
          <YAxis hide />
          <Tooltip
            cursor={{ fill: "#F8F4FB" }}
            formatter={(v: number) => [`${v} j`, "Délai"]}
            labelStyle={{ fontSize: 10 }}
          />
          <Bar dataKey="avgDelay" fill="#A855F7" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function SupplierDetailDrawer({ supplierId, onClose }: { supplierId: string; onClose: () => void }) {
  const { data, isLoading } = useSupplierPaymentHistory(supplierId);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <aside className="h-full w-full max-w-lg overflow-y-auto bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-white px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-ink">Suivi financier fournisseur</h3>
            {data && <p className="text-[12px] text-ink-3">{data.supplier.name}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded text-ink-3 hover:bg-surface-alt"
            aria-label="Fermer"
          >
            ✕
          </button>
        </header>

        {isLoading || !data ? (
          <div className="p-4">
            <div className="h-32 animate-pulse rounded-md bg-surface-alt" />
          </div>
        ) : (
          <div className="space-y-3 p-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-md border border-line bg-surface-alt p-2.5">
                <div className="text-[10.5px] uppercase text-ink-3">Délai contrat</div>
                <div className="font-mono text-[14px] font-bold text-ink">{data.supplier.paymentTermsContract} j</div>
              </div>
              <div className="rounded-md border border-line bg-surface-alt p-2.5">
                <div className="text-[10.5px] uppercase text-ink-3">Délai effectif</div>
                <div className="font-mono text-[14px] font-bold text-ink">{data.supplier.paymentTermsActual} j</div>
              </div>
              <div className="rounded-md border border-line bg-surface-alt p-2.5">
                <div className="text-[10.5px] uppercase text-ink-3">Rating financier</div>
                <div className={clsx("inline-block rounded px-1.5 font-mono text-[12px] font-bold", ratingClasses(data.supplier.financialRating))}>
                  {data.supplier.financialRating ?? "—"}
                </div>
                {data.supplier.financialRatingSource && (
                  <div className="text-[10px] text-ink-3">{data.supplier.financialRatingSource}</div>
                )}
              </div>
              <div className="rounded-md border border-line bg-surface-alt p-2.5">
                <div className="text-[10.5px] uppercase text-ink-3">Incidents</div>
                <div className={clsx("font-mono text-[14px] font-bold", data.supplier.incidentsCount > 0 ? "text-rose-700" : "text-emerald-700")}>
                  {data.supplier.incidentsCount}
                </div>
              </div>
            </div>

            <div>
              <h4 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-ink-3">
                Délais de paiement (12 derniers mois)
              </h4>
              <div className="rounded-md border border-line bg-white p-2">
                <MiniDelayChart items={data.months} />
              </div>
            </div>

            {data.incidents.length > 0 && (
              <div>
                <h4 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-ink-3">Incidents</h4>
                <div className="space-y-2">
                  {data.incidents.map((inc, i) => (
                    <div key={i} className="rounded-md border border-line bg-white p-2.5">
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="font-medium text-ink">{inc.type}</span>
                        <span className="text-ink-3">{inc.date}</span>
                      </div>
                      <div className="text-[11.5px] text-ink-3">
                        {fmt(inc.amount)} FCFA · {inc.resolved ? "résolu" : "en cours"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}

export function SuppliersFinancialTable() {
  const { data, isLoading } = useSuppliersFinancial();
  const [selected, setSelected] = useState<string | null>(null);

  if (isLoading || !data) {
    return <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />;
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-md border border-line bg-white p-2.5 text-center">
          <div className="text-[10.5px] uppercase text-ink-3">Fournisseurs</div>
          <div className="font-mono text-[14px] font-bold text-ink">{data.summary.total}</div>
        </div>
        <div className="rounded-md border border-line bg-white p-2.5 text-center">
          <div className="text-[10.5px] uppercase text-ink-3">Volume YTD</div>
          <div className="font-mono text-[14px] font-bold text-ink">{fmt(data.summary.totalVolume)}</div>
        </div>
        <div className="rounded-md border border-line bg-white p-2.5 text-center">
          <div className="text-[10.5px] uppercase text-ink-3">Avec incidents</div>
          <div className={clsx("font-mono text-[14px] font-bold", data.summary.withIncidents > 0 ? "text-rose-700" : "text-emerald-700")}>
            {data.summary.withIncidents}
          </div>
        </div>
        <div className="rounded-md border border-line bg-white p-2.5 text-center">
          <div className="text-[10.5px] uppercase text-ink-3">Délai vs contrat</div>
          <div className={clsx("font-mono text-[14px] font-bold", data.summary.avgPaymentDelta > 5 ? "text-amber-700" : "text-emerald-700")}>
            {data.summary.avgPaymentDelta > 0 ? "+" : ""}
            {data.summary.avgPaymentDelta.toFixed(1)} j
          </div>
        </div>
      </div>

      {/* Desktop : tableau enrichi */}
      <div className="mt-3 hidden overflow-x-auto rounded-xl border border-line bg-white md:block">
        <table className="w-full text-[13px]">
          <thead className="bg-surface-alt text-[11.5px] uppercase tracking-wide text-ink-3">
            <tr>
              <th className="px-3 py-2 text-left">Fournisseur</th>
              <th className="px-3 py-2 text-right">Volume YTD</th>
              <th className="px-3 py-2 text-right">% achats</th>
              <th className="px-3 py-2 text-right">Délai contrat</th>
              <th className="px-3 py-2 text-right">Délai effectif</th>
              <th className="px-3 py-2 text-right">Encours</th>
              <th className="px-3 py-2 text-center">Rating</th>
              <th className="px-3 py-2 text-right">Incidents</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {data.items.slice(0, 25).map((s: SupplierFinancialItem) => {
              const dlb = delayBadge(s.paymentDelayDelta);
              return (
                <tr
                  key={s.id}
                  onClick={() => setSelected(s.id)}
                  className="cursor-pointer hover:bg-surface-alt/60"
                >
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1 font-medium text-ink">
                      {s.strategic && <Star className="h-3 w-3 text-amber-500" />}
                      {s.name}
                    </div>
                    <div className="text-[11px] text-ink-3">{s.category}</div>
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{fmt(s.volumeYTD)}</td>
                  <td className="px-3 py-2 text-right text-[12px] text-ink-3">{s.sharePercent.toFixed(1)} %</td>
                  <td className="px-3 py-2 text-right font-mono">{s.paymentTermsContract} j</td>
                  <td className="px-3 py-2 text-right">
                    <span className={clsx("rounded px-1.5 py-0.5 font-mono text-[11.5px] font-semibold", dlb.cls)}>
                      {s.paymentTermsActual} j ({dlb.label})
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{fmt(s.outstanding)}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={clsx("rounded px-1.5 py-0.5 font-mono text-[11.5px] font-bold", ratingClasses(s.financialRating))}>
                      {s.financialRating ?? "—"}
                    </span>
                  </td>
                  <td className={clsx("px-3 py-2 text-right font-mono", s.incidentsCount > 0 ? "text-rose-700" : "text-ink-3")}>
                    {s.incidentsCount > 0 ? (
                      <span className="inline-flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {s.incidentsCount}
                      </span>
                    ) : (
                      "0"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile : cards avec mini-graphique */}
      <div className="mt-3 space-y-2 md:hidden">
        {data.items.slice(0, 25).map((s) => {
          const dlb = delayBadge(s.paymentDelayDelta);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelected(s.id)}
              className="block w-full rounded-xl border border-line bg-white p-3 text-left hover:bg-surface-alt"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 text-[13px] font-semibold text-ink">
                    {s.strategic && <Star className="h-3 w-3 text-amber-500" />}
                    {s.name}
                  </div>
                  <div className="text-[11px] text-ink-3">{s.category}</div>
                </div>
                <span className={clsx("rounded px-1.5 py-0.5 font-mono text-[10.5px] font-bold", ratingClasses(s.financialRating))}>
                  {s.financialRating ?? "—"}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-[10px] uppercase text-ink-3">Volume</div>
                  <div className="font-mono text-[11.5px] text-ink">{fmt(s.volumeYTD)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-ink-3">Délai</div>
                  <div className={clsx("rounded font-mono text-[11.5px] font-semibold", dlb.cls)}>
                    {s.paymentTermsActual} j
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-ink-3">Incidents</div>
                  <div className={clsx("font-mono text-[11.5px]", s.incidentsCount > 0 ? "text-rose-700" : "text-emerald-700")}>
                    {s.incidentsCount}
                  </div>
                </div>
              </div>
              <div className="mt-2 inline-flex items-center gap-1 text-[10.5px] text-primary-600">
                <TrendingUp className="h-3 w-3" /> Voir historique paiements
              </div>
            </button>
          );
        })}
      </div>

      {selected && <SupplierDetailDrawer supplierId={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
