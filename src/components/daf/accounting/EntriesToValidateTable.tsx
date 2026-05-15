"use client";

import { Check, X, Clock } from "lucide-react";
import { useEntriesToValidate, useValidateEntry, useRejectEntry } from "@/hooks/useDafAccounting";
import { useAccess } from "@/hooks/useAccess";
import { MODULES } from "@/lib/rbac/modules";
import { formatFCFA } from "@/lib/format";

export function EntriesToValidateTable() {
  const { data, isLoading } = useEntriesToValidate();
  const validate = useValidateEntry();
  const reject = useRejectEntry();
  // Validation écritures comptables : DAF a FULL sur DAF, canValidate=true.
  const canAct = useAccess(MODULES.DAF).canValidate;

  if (isLoading || !data) return <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />;

  const onReject = async (id: string) => {
    const reason = prompt("Motif du rejet (3 car. min) :")?.trim();
    if (!reason || reason.length < 3) return;
    await reject.mutateAsync({ id, reason });
  };

  if (data.items.length === 0) {
    return (
      <section className="rounded-lg border border-success/30 bg-success/5 p-6 text-center text-[13px] text-success">
        ✓ Aucune écriture en brouillard à valider.
      </section>
    );
  }

  return (
    <section>
      <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
        Écritures à valider ({data.items.length})
      </h3>

      {/* Desktop : tableau ≥ md */}
      <div className="hidden overflow-x-auto rounded-xl border border-line bg-white shadow-card md:block">
        <table className="w-full min-w-[760px] text-[12.5px]">
          <thead className="bg-surface-alt text-[11px] uppercase tracking-wide text-ink-3">
            <tr>
              <th className="py-2 pl-3 text-left">Référence</th>
              <th className="py-2 text-left">Journal</th>
              <th className="py-2 text-left">Libellé</th>
              <th className="py-2 text-right">Montant</th>
              <th className="py-2 text-left">Saisie par</th>
              <th className="py-2 text-center">Ancienneté</th>
              <th className="py-2 pr-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((e) => (
              <tr key={e.id} className="border-t border-line hover:bg-surface-alt">
                <td className="py-2 pl-3 font-mono text-[11px]">{e.reference}</td>
                <td className="py-2 text-ink-3">{e.journal}</td>
                <td className="py-2 text-ink">{e.label}</td>
                <td className="py-2 text-right font-mono tabular-nums font-semibold">{formatFCFA(BigInt(e.totalDebit))}</td>
                <td className="py-2 text-ink-2">{e.enteredBy}</td>
                <td className="py-2 text-center">
                  <span className="inline-flex items-center gap-1 text-[11px] text-warning">
                    <Clock className="h-3 w-3" />
                    {e.hoursSinceEntry}h
                  </span>
                </td>
                <td className="py-2 pr-3 text-right">
                  {canAct && (
                    <div className="inline-flex gap-1">
                      <button
                        type="button"
                        onClick={() => validate.mutate(e.id)}
                        disabled={validate.isPending}
                        className="grid h-8 w-8 place-items-center rounded-md bg-success text-white hover:opacity-90"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onReject(e.id)}
                        className="grid h-8 w-8 place-items-center rounded-md bg-danger text-white hover:opacity-90"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile : cards */}
      <ul className="space-y-2 md:hidden">
        {data.items.map((e) => (
          <li key={e.id} className="rounded-xl border border-line bg-white p-3 shadow-card">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="font-mono text-[10.5px] text-ink-3">{e.reference} · {e.journal}</div>
                <div className="mt-0.5 text-[14px] font-semibold text-ink">{e.label}</div>
                <div className="mt-1 font-mono text-[16px] font-bold text-ink">{formatFCFA(BigInt(e.totalDebit))}</div>
                <div className="text-[11px] text-ink-3">
                  {e.enteredBy} · <Clock className="inline h-3 w-3" /> {e.hoursSinceEntry}h
                </div>
              </div>
            </div>
            {canAct && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => validate.mutate(e.id)}
                  disabled={validate.isPending}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md bg-success px-3 text-[13px] font-medium text-white"
                >
                  <Check className="h-4 w-4" /> Valider
                </button>
                <button
                  type="button"
                  onClick={() => onReject(e.id)}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md bg-danger px-3 text-[13px] font-medium text-white"
                >
                  <X className="h-4 w-4" /> Rejeter
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
