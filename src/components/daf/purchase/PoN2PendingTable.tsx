"use client";

import { useState } from "react";
import { Check, X, MessageCircleQuestion, AlertTriangle } from "lucide-react";
import { clsx } from "clsx";
import { useN2Decision, usePoN2Pending, type PoN2Item } from "@/hooks/useDafPurchase";
import { useAccess } from "@/hooks/useAccess";
import { MODULES } from "@/lib/rbac/modules";

function fmt(amount: string): string {
  return new Intl.NumberFormat("fr-FR").format(Number(amount));
}

function ageClasses(days: number): string {
  if (days >= 5) return "text-rose-700";
  if (days >= 3) return "text-amber-700";
  return "text-ink-3";
}

function DecisionDialog({
  item,
  decision,
  onClose,
}: {
  item: PoN2Item;
  decision: "APPROVE" | "REJECT" | "REQUEST_INFO";
  onClose: () => void;
}) {
  const [note, setNote] = useState("");
  const mut = useN2Decision();

  const titleByDecision = {
    APPROVE: "Valider le BC",
    REJECT: "Rejeter le BC",
    REQUEST_INFO: "Demander un complément",
  } as const;

  const noteRequired = decision !== "APPROVE";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-3" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <header className="mb-2">
          <h3 className="text-sm font-semibold text-ink">{titleByDecision[decision]}</h3>
          <p className="text-[12px] text-ink-3">
            {item.reference} · {item.supplier} · {fmt(item.amount)} FCFA
          </p>
        </header>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder={
            decision === "APPROVE"
              ? "Note (optionnelle)"
              : decision === "REJECT"
                ? "Motif du rejet (obligatoire)"
                : "Quelle information manque ?"
          }
          className="w-full rounded-md border border-line bg-white px-2.5 py-2 text-[13px] focus:border-primary-500 focus:outline-none"
        />
        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-8 rounded-md border border-line bg-white px-3 text-[12.5px] font-medium text-ink-3 hover:bg-surface-alt"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={(noteRequired && !note.trim()) || mut.isPending}
            onClick={() => {
              mut.mutate(
                { id: item.id, decision, note: note.trim() || undefined },
                { onSuccess: onClose }
              );
            }}
            className={clsx(
              "h-8 rounded-md px-3 text-[12.5px] font-semibold text-white disabled:opacity-50",
              decision === "APPROVE"
                ? "bg-emerald-600 hover:bg-emerald-700"
                : decision === "REJECT"
                  ? "bg-rose-600 hover:bg-rose-700"
                  : "bg-primary-500 hover:bg-primary-600"
            )}
          >
            {mut.isPending ? "..." : titleByDecision[decision]}
          </button>
        </div>
      </div>
    </div>
  );
}

export function PoN2PendingTable() {
  const { data, isLoading } = usePoN2Pending();
  // Validation N2 achats : seul un FULL (canValidate) peut décider.
  // Un DG en READ verra la liste sans pouvoir approuver/rejeter.
  const canDecide = useAccess(MODULES.DAF).canValidate;
  const [target, setTarget] = useState<{ item: PoN2Item; decision: "APPROVE" | "REJECT" | "REQUEST_INFO" } | null>(null);

  if (isLoading || !data) {
    return <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />;
  }

  if (data.items.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-white p-6 text-center text-[13px] text-ink-3">
        Aucun BC entre 5 M et 50 M FCFA en attente de validation N2.
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-md border border-line bg-white p-2.5 text-center">
          <div className="text-[10.5px] uppercase text-ink-3">À valider</div>
          <div className="font-mono text-[14px] font-bold text-ink">{data.summary.total}</div>
        </div>
        <div className="rounded-md border border-line bg-white p-2.5 text-center">
          <div className="text-[10.5px] uppercase text-ink-3">Montant total</div>
          <div className="font-mono text-[14px] font-bold text-ink">{fmt(data.summary.totalAmount)}</div>
        </div>
        <div className={clsx("rounded-md border p-2.5 text-center", data.summary.criticalCount > 0 ? "border-rose-200 bg-rose-50" : "border-line bg-white")}>
          <div className={clsx("text-[10.5px] uppercase", data.summary.criticalCount > 0 ? "text-rose-700" : "text-ink-3")}>Critiques (&gt; 3 j)</div>
          <div className={clsx("font-mono text-[14px] font-bold", data.summary.criticalCount > 0 ? "text-rose-700" : "text-ink")}>
            {data.summary.criticalCount}
          </div>
        </div>
      </div>

      {/* Desktop : tableau */}
      <div className="mt-3 hidden overflow-x-auto rounded-xl border border-line bg-white md:block">
        <table className="w-full text-[13px]">
          <thead className="bg-surface-alt text-[11.5px] uppercase tracking-wide text-ink-3">
            <tr>
              <th className="px-3 py-2 text-left">Référence</th>
              <th className="px-3 py-2 text-left">Fournisseur</th>
              <th className="px-3 py-2 text-left">Libellé</th>
              <th className="px-3 py-2 text-right">Montant</th>
              <th className="px-3 py-2 text-left">Demandeur</th>
              <th className="px-3 py-2 text-center">Budget</th>
              <th className="px-3 py-2 text-center">Marché</th>
              <th className="px-3 py-2 text-right">Ancienneté</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {data.items.map((it) => (
              <tr key={it.id} className="hover:bg-surface-alt/40">
                <td className="px-3 py-2 font-mono text-[12px] text-ink-3">{it.reference}</td>
                <td className="px-3 py-2 font-medium text-ink">{it.supplier}</td>
                <td className="px-3 py-2 text-ink">{it.label}</td>
                <td className="px-3 py-2 text-right font-mono font-semibold text-ink">{fmt(it.amount)}</td>
                <td className="px-3 py-2 text-[12px] text-ink-3">{it.initiator}</td>
                <td className="px-3 py-2 text-center text-[12px]">
                  <span className={clsx("rounded px-1.5 py-0.5 text-[11px]", it.budgetRemainingPercent < 15 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800")}>
                    {it.budgetRemainingPercent}% restant
                  </span>
                </td>
                <td className="px-3 py-2 text-center text-[12px]">
                  {it.marketPriceCheck === "OK" ? (
                    <span className="text-emerald-700">✓ conforme</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-amber-700">
                      <AlertTriangle className="h-3 w-3" /> au-dessus
                    </span>
                  )}
                </td>
                <td className={clsx("px-3 py-2 text-right font-mono text-[12px]", ageClasses(it.ageDays))}>
                  {it.ageDays} j
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      disabled={!canDecide}
                      onClick={() => setTarget({ item: it, decision: "APPROVE" })}
                      className="grid h-7 w-7 place-items-center rounded text-emerald-600 hover:bg-emerald-50 disabled:opacity-40"
                      title="Valider"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={!canDecide}
                      onClick={() => setTarget({ item: it, decision: "REJECT" })}
                      className="grid h-7 w-7 place-items-center rounded text-rose-600 hover:bg-rose-50 disabled:opacity-40"
                      title="Rejeter"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={!canDecide}
                      onClick={() => setTarget({ item: it, decision: "REQUEST_INFO" })}
                      className="grid h-7 w-7 place-items-center rounded text-primary-600 hover:bg-primary-50 disabled:opacity-40"
                      title="Demander complément"
                    >
                      <MessageCircleQuestion className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile : cards */}
      <div className="mt-3 space-y-2 md:hidden">
        {data.items.map((it) => (
          <div key={it.id} className="rounded-xl border border-line bg-white p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="font-mono text-[11px] text-ink-3">{it.reference}</div>
                <div className="text-[14px] font-bold text-ink">{it.supplier}</div>
                <div className="font-mono text-[15px] font-bold text-ink">{fmt(it.amount)}</div>
                <div className="text-[12px] text-ink-3">{it.label}</div>
              </div>
              <span className={clsx("rounded-full px-2 py-0.5 text-[10.5px] font-semibold", ageClasses(it.ageDays), "bg-surface-alt")}>
                {it.ageDays} j
              </span>
            </div>
            <div className="mt-2 text-[11.5px] text-ink-3">
              {it.initiator}
            </div>
            <div className="my-2 border-t border-line"></div>
            <div className="space-y-1 text-[11.5px]">
              <div className="flex items-center justify-between">
                <span className="text-ink-3">Conso budget</span>
                <span className={clsx("font-medium", it.budgetRemainingPercent < 15 ? "text-amber-700" : "text-emerald-700")}>
                  {it.budgetRemainingPercent}% restant
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-3">Prix marché</span>
                <span className={clsx("font-medium", it.marketPriceCheck === "OK" ? "text-emerald-700" : "text-amber-700")}>
                  {it.marketPriceCheck === "OK" ? "conforme" : "au-dessus"}
                </span>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-1">
              <button
                type="button"
                disabled={!canDecide}
                onClick={() => setTarget({ item: it, decision: "APPROVE" })}
                className="inline-flex items-center justify-center gap-1 rounded-md bg-emerald-600 px-2 py-1.5 text-[11.5px] font-semibold text-white disabled:opacity-40"
              >
                <Check className="h-3 w-3" /> Valider
              </button>
              <button
                type="button"
                disabled={!canDecide}
                onClick={() => setTarget({ item: it, decision: "REJECT" })}
                className="inline-flex items-center justify-center gap-1 rounded-md bg-rose-600 px-2 py-1.5 text-[11.5px] font-semibold text-white disabled:opacity-40"
              >
                <X className="h-3 w-3" /> Rejeter
              </button>
              <button
                type="button"
                disabled={!canDecide}
                onClick={() => setTarget({ item: it, decision: "REQUEST_INFO" })}
                className="inline-flex items-center justify-center gap-1 rounded-md border border-primary-500 px-2 py-1.5 text-[11.5px] font-semibold text-primary-600 disabled:opacity-40"
              >
                Compl.
              </button>
            </div>
          </div>
        ))}
      </div>

      {target && (
        <DecisionDialog
          item={target.item}
          decision={target.decision}
          onClose={() => setTarget(null)}
        />
      )}
    </>
  );
}
