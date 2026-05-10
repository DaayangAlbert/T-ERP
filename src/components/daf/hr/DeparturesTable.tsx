"use client";

import { clsx } from "clsx";
import { useDepartures } from "@/hooks/useDafHr";

function fmt(amount: string): string {
  return new Intl.NumberFormat("fr-FR").format(Number(amount));
}

function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function statusClasses(s: string): string {
  if (s === "PROVISIONED") return "bg-amber-100 text-amber-800";
  if (s === "PAID") return "bg-emerald-100 text-emerald-800";
  return "bg-rose-100 text-rose-800";
}

export function DeparturesTable() {
  const { data, isLoading } = useDepartures();

  if (isLoading || !data) {
    return <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />;
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-md border border-line bg-white p-2.5 text-center">
          <div className="text-[10.5px] uppercase text-ink-3">Départs 24m</div>
          <div className="font-mono text-[14px] font-bold text-ink">{data.summary.total}</div>
        </div>
        <div className="rounded-md border border-amber-200 bg-amber-50 p-2.5 text-center">
          <div className="text-[10.5px] uppercase text-amber-800">Provisionnés</div>
          <div className="font-mono text-[14px] font-bold text-amber-800">{data.summary.provisionedCount}</div>
        </div>
        <div className="rounded-md border border-line bg-white p-2.5 text-center">
          <div className="text-[10.5px] uppercase text-ink-3">À provisionner</div>
          <div className="font-mono text-[13px] font-bold text-ink">{fmt(data.summary.totalProvisionAmount)}</div>
        </div>
        <div className="rounded-md border border-line bg-white p-2.5 text-center">
          <div className="text-[10.5px] uppercase text-ink-3">Coût moyen</div>
          <div className="font-mono text-[13px] font-bold text-ink">{fmt(data.summary.avgCost)}</div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-6">
        {data.summary.byType.map((t) => (
          <div key={t.type} className="rounded-md border border-line bg-white p-2 text-center">
            <div className="text-[10px] uppercase text-ink-3">{t.label}</div>
            <div className="font-mono text-[12.5px] font-bold text-ink">{t.count}</div>
          </div>
        ))}
      </div>

      {data.items.length === 0 ? (
        <div className="mt-3 rounded-xl border border-dashed border-line bg-white p-6 text-center text-[13px] text-ink-3">
          Aucun départ enregistré.
        </div>
      ) : (
        <>
          <div className="mt-3 hidden overflow-x-auto rounded-xl border border-line bg-white md:block">
            <table className="w-full text-[13px]">
              <thead className="bg-surface-alt text-[11.5px] uppercase tracking-wide text-ink-3">
                <tr>
                  <th className="px-3 py-2 text-left">Salarié</th>
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-right">Indemnité</th>
                  <th className="px-3 py-2 text-right">CP non pris</th>
                  <th className="px-3 py-2 text-right">Prime au prorata</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2 text-center">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.items.map((d) => (
                  <tr key={d.id} className="hover:bg-surface-alt/40">
                    <td className="px-3 py-2">
                      <div className="font-medium text-ink">{d.employeeName}</div>
                      <div className="text-[11.5px] text-ink-3">{d.position ?? "—"}</div>
                    </td>
                    <td className="px-3 py-2 text-[12px]">{d.typeLabel}</td>
                    <td className="px-3 py-2 text-[12px] text-ink-3">{fmtDate(d.departureDate)}</td>
                    <td className="px-3 py-2 text-right font-mono">{fmt(d.severancePay)}</td>
                    <td className="px-3 py-2 text-right font-mono">{fmt(d.unusedLeavePay)}</td>
                    <td className="px-3 py-2 text-right font-mono">{fmt(d.bonusProrata)}</td>
                    <td className="px-3 py-2 text-right font-mono font-semibold text-ink">{fmt(d.totalCost)}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={clsx("rounded px-1.5 py-0.5 text-[10.5px] font-semibold", statusClasses(d.status))}>
                        {d.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 space-y-2 md:hidden">
            {data.items.map((d) => (
              <div key={d.id} className="rounded-xl border border-line bg-white p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold text-ink">{d.employeeName}</div>
                    <div className="text-[11.5px] text-ink-3">{d.position ?? "—"}</div>
                  </div>
                  <span className={clsx("rounded px-1.5 py-0.5 text-[10px] font-semibold", statusClasses(d.status))}>
                    {d.status}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11.5px] text-ink-3">
                  <span>{d.typeLabel}</span>
                  <span>{fmtDate(d.departureDate)}</span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-1 text-center">
                  <div>
                    <div className="text-[10px] uppercase text-ink-3">Indemnité</div>
                    <div className="font-mono text-[11px] text-ink">{fmt(d.severancePay)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-ink-3">CP</div>
                    <div className="font-mono text-[11px] text-ink">{fmt(d.unusedLeavePay)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-ink-3">Prime</div>
                    <div className="font-mono text-[11px] text-ink">{fmt(d.bonusProrata)}</div>
                  </div>
                </div>
                <div className="mt-2 text-right font-mono text-[13px] font-bold text-ink">
                  Total : {fmt(d.totalCost)} FCFA
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
