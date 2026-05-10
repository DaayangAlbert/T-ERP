"use client";

import { CheckCircle2, AlertCircle } from "lucide-react";
import { clsx } from "clsx";
import { useAbsences } from "@/hooks/useRhLeaves";

function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short" });
}

function reasonClass(r: string): string {
  if (r === "UNJUSTIFIED") return "bg-rose-100 text-rose-800";
  if (r === "SICK") return "bg-amber-100 text-amber-800";
  if (r === "STRIKE") return "bg-purple-100 text-purple-800";
  return "bg-blue-100 text-blue-800";
}

export function AbsencesTable() {
  const { data, isLoading } = useAbsences();

  if (isLoading || !data) {
    return <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />;
  }

  if (data.items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-white p-6 text-center text-[12.5px] text-ink-3">
        Aucune absence enregistrée.
      </div>
    );
  }

  return (
    <>
      {/* Desktop : table */}
      <div className="hidden overflow-x-auto rounded-xl border border-line bg-white md:block">
        <table className="w-full text-[13px]">
          <thead className="bg-surface-alt text-[11.5px] uppercase tracking-wide text-ink-3">
            <tr>
              <th className="px-3 py-2 text-left">Date</th>
              <th className="px-3 py-2 text-left">Employé</th>
              <th className="px-3 py-2 text-left">Motif</th>
              <th className="px-3 py-2 text-left">Justifiée</th>
              <th className="px-3 py-2 text-left">Déclarée par</th>
              <th className="px-3 py-2 text-left">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {data.items.map((a) => (
              <tr key={a.id} className="hover:bg-surface-alt/40">
                <td className="px-3 py-2 text-[12px] text-ink-3">{fmtDate(a.date)}</td>
                <td className="px-3 py-2 font-medium text-ink">{a.employeeName}</td>
                <td className="px-3 py-2">
                  <span className={clsx("rounded px-1.5 py-0.5 text-[10.5px] font-semibold", reasonClass(a.reason))}>
                    {a.reasonLabel}
                  </span>
                </td>
                <td className="px-3 py-2 text-[12px]">
                  {a.justified ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700">
                      <CheckCircle2 className="h-3 w-3" /> Oui
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-rose-700">
                      <AlertCircle className="h-3 w-3" /> Non
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-[11.5px] text-ink-3">{a.reportedBy}</td>
                <td className="px-3 py-2 text-[11.5px] italic text-ink-3">{a.notes ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile : cards */}
      <ul className="space-y-2 md:hidden">
        {data.items.map((a) => (
          <li key={a.id} className="rounded-xl border border-line bg-white p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-ink">{a.employeeName}</div>
                <div className="text-[11.5px] text-ink-3">{fmtDate(a.date)}</div>
              </div>
              <span className={clsx("rounded px-1.5 py-0.5 text-[10px] font-semibold flex-shrink-0", reasonClass(a.reason))}>
                {a.reasonLabel}
              </span>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[11px]">
              <span className="text-ink-3">Déclarée par {a.reportedBy}</span>
              <span className={clsx("inline-flex items-center gap-1", a.justified ? "text-emerald-700" : "text-rose-700")}>
                {a.justified ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                {a.justified ? "Justifiée" : "Non justifiée"}
              </span>
            </div>
            {a.notes && <div className="mt-1 text-[11px] italic text-ink-3">« {a.notes} »</div>}
          </li>
        ))}
      </ul>
    </>
  );
}
