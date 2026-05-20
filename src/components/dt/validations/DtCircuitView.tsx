"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Bell } from "lucide-react";
import { clsx } from "clsx";
import { useDtCircuit } from "@/hooks/useDtCircuit";

function fmt(n: number | null): string {
  if (n === null) return "—";
  if (n >= 1_000_000_000) return `${new Intl.NumberFormat("fr-FR").format(Math.round(n))}`;
  return `${new Intl.NumberFormat("fr-FR").format(Math.round(n))}`;
}

const TYPE_LABEL: Record<string, string> = {
  AMENDMENT: "Avenant",
  SUBCONTRACTING: "Sous-traitance",
  EQUIPMENT: "Matériel",
  SPECIAL_METHOD: "Méthode spéc.",
  TECHNICAL_HANDOVER: "Mise en service",
};

export function DtCircuitView() {
  const { data, isLoading } = useDtCircuit();

  if (isLoading || !data) {
    return <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />;
  }
  if (data.items.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-emerald-50/60 px-4 py-3 text-[12.5px] text-emerald-700">
        Aucun dossier technique en cours dans le circuit.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-line bg-white">
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-[12.5px]">
          <thead className="bg-surface-alt text-[11px] uppercase text-ink-3">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Réf.</th>
              <th className="px-3 py-2 text-left font-medium">Type</th>
              <th className="px-3 py-2 text-left font-medium">Objet</th>
              <th className="px-3 py-2 text-left font-medium">Initiateur</th>
              <th className="px-3 py-2 text-right font-medium">Montant</th>
              <th className="px-3 py-2 text-left font-medium">Étape actuelle</th>
              <th className="px-3 py-2 text-right font-medium">Depuis</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((v) => (
              <tr
                key={v.id}
                className={clsx(
                  "border-t border-line",
                  v.stuckDays > 3 && "bg-rose-50/50"
                )}
              >
                <td className="px-3 py-2 font-mono text-[11.5px]">{v.reference}</td>
                <td className="px-3 py-2 text-ink-2">{TYPE_LABEL[v.type] ?? v.type}</td>
                <td className="px-3 py-2 font-medium text-ink">{v.title}</td>
                <td className="px-3 py-2 text-ink-2">{v.initiator ?? "—"}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmt(v.amount)}</td>
                <td className="px-3 py-2 text-ink-2">
                  {v.currentStep} · {v.currentApprover ?? "—"}
                </td>
                <td
                  className={clsx(
                    "px-3 py-2 text-right tabular-nums",
                    v.stuckDays > 3 && "font-semibold text-rose-700"
                  )}
                >
                  {v.stuckDays} j
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={() => alert(`Relance envoyée à ${v.currentApprover ?? "—"}`)}
                    disabled={v.stuckDays <= 1}
                    className="inline-flex items-center gap-1 rounded border border-line-2 bg-white px-2 py-1 text-[11px] font-semibold text-ink-2 hover:border-primary-300 disabled:opacity-50"
                  >
                    <Bell className="h-3 w-3" /> Relancer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="flex flex-col gap-2 p-3 md:hidden">
        {data.items.map((v) => (
          <div
            key={v.id}
            className={clsx(
              "rounded-lg border p-3",
              v.stuckDays > 3 ? "border-rose-200 bg-rose-50/40" : "border-line bg-white"
            )}
          >
            <div className="flex justify-between gap-2">
              <div className="font-mono text-[11px] text-ink-3">{v.reference}</div>
              <span
                className={clsx(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                  v.stuckDays > 3 ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600"
                )}
              >
                {v.stuckDays} j
              </span>
            </div>
            <div className="text-[13px] font-semibold text-ink">{v.title}</div>
            <div className="mt-1 text-[11px] text-ink-3">
              {TYPE_LABEL[v.type] ?? v.type} · {fmt(v.amount)}
            </div>
            <div className="mt-1 text-[11px] text-ink-2">
              Étape : {v.currentStep} · {v.currentApprover ?? "—"}
            </div>
            <button
              onClick={() => alert(`Relance envoyée à ${v.currentApprover ?? "—"}`)}
              disabled={v.stuckDays <= 1}
              className="mt-2 w-full rounded border border-line-2 bg-white py-1.5 text-[12px] font-semibold text-ink-2 disabled:opacity-50"
            >
              Relancer le validateur
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
