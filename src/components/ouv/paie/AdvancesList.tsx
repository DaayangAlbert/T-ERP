"use client";

import type { AdvanceItem } from "@/hooks/useOuvAdvances";

interface Props {
  advances: AdvanceItem[];
}

// Liste compacte des dernières demandes d'avance. Statut colorié.
// Affichée uniquement si au moins une demande existe.
const STATUS_META: Record<AdvanceItem["status"], { label: string; tone: string }> = {
  PENDING: { label: "En attente", tone: "bg-amber-50 text-amber-800" },
  APPROVED: { label: "Approuvée", tone: "bg-blue-50 text-blue-700" },
  PAID: { label: "Payée", tone: "bg-emerald-50 text-emerald-700" },
  RECOVERED: { label: "Récupérée", tone: "bg-slate-100 text-slate-600" },
  REJECTED: { label: "Refusée", tone: "bg-rose-50 text-rose-700" },
  CANCELLED: { label: "Annulée", tone: "bg-slate-100 text-slate-500" },
};

export function AdvancesList({ advances }: Props) {
  if (!advances.length) return null;
  const visible = advances.slice(0, 4);
  return (
    <section className="mb-3.5">
      <h3 className="mb-2.5 text-[16px] font-bold text-slate-900">Mes avances</h3>
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
        {visible.map((a, idx) => {
          const meta = STATUS_META[a.status] ?? STATUS_META.PENDING;
          return (
            <div
              key={a.id}
              className={`flex min-h-[60px] items-center gap-3 px-4 py-3.5 ${
                idx < visible.length - 1 ? "border-b border-slate-100" : ""
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-bold text-slate-900">
                  {a.amountXAF.toLocaleString("fr-FR")} FCFA
                </p>
                <p className="truncate text-[12px] text-slate-500">
                  {new Date(a.createdAt).toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "long",
                  })}
                  {a.reason ? ` · ${a.reason}` : ""}
                </p>
              </div>
              <span className={`flex-shrink-0 rounded-md px-2.5 py-1 text-[11px] font-bold ${meta.tone}`}>
                {meta.label}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
