"use client";

import { Calendar } from "lucide-react";
import { useSocialProvisions } from "@/hooks/useDafHr";

function fmt(amount: string): string {
  return new Intl.NumberFormat("fr-FR").format(Number(amount));
}

function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export function SocialProvisionsTable() {
  const { data, isLoading } = useSocialProvisions();

  if (isLoading || !data) {
    return <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />;
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {data.summary.byType.map((t) => (
          <div key={t.type} className="rounded-md border border-line bg-white p-2.5 text-center">
            <div className="text-[10.5px] uppercase text-ink-3">{t.label}</div>
            <div className="font-mono text-[13px] font-bold text-ink">{fmt(t.total)}</div>
          </div>
        ))}
      </div>

      <div className="mt-3 hidden overflow-x-auto rounded-xl border border-line bg-white md:block">
        <table className="w-full text-[13px]">
          <thead className="bg-surface-alt text-[11.5px] uppercase tracking-wide text-ink-3">
            <tr>
              <th className="px-3 py-2 text-left">Provision</th>
              <th className="px-3 py-2 text-right">Montant</th>
              <th className="px-3 py-2 text-left">Période</th>
              <th className="px-3 py-2 text-left">Calculée</th>
              <th className="px-3 py-2 text-left">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {data.items.map((p) => (
              <tr key={p.id} className="hover:bg-surface-alt/40">
                <td className="px-3 py-2 font-medium text-ink">{p.label}</td>
                <td className="px-3 py-2 text-right font-mono font-semibold text-ink">{fmt(p.amount)}</td>
                <td className="px-3 py-2 text-[12px] text-ink-3">{p.periodEnd}</td>
                <td className="px-3 py-2 text-[12px] text-ink-3">{fmtDate(p.calculatedAt)}</td>
                <td className="px-3 py-2 text-[11.5px] italic text-ink-3">{p.notes ?? "—"}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-surface-alt font-semibold">
            <tr>
              <td className="px-3 py-2">Total provisions</td>
              <td className="px-3 py-2 text-right font-mono">{fmt(data.summary.total)} FCFA</td>
              <td colSpan={3}></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-3 space-y-2 md:hidden">
        {data.items.map((p) => (
          <div key={p.id} className="rounded-xl border border-line bg-white p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-[13px] font-semibold text-ink">{p.label}</div>
                <div className="text-[11.5px] text-ink-3">
                  <Calendar className="mr-1 inline h-3 w-3" /> {p.periodEnd}
                </div>
              </div>
              <div className="font-mono text-[13.5px] font-bold text-ink">{fmt(p.amount)}</div>
            </div>
            {p.notes && <div className="mt-1 text-[11.5px] italic text-ink-3">« {p.notes} »</div>}
          </div>
        ))}
      </div>
    </>
  );
}
