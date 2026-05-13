"use client";

import { useState } from "react";
import { X, Banknote, ArrowRight, AlertTriangle } from "lucide-react";
import { clsx } from "clsx";
import { useAdjustProvision } from "@/hooks/useSgLegalCases";

interface Props {
  caseId: string;
  currentProvision: number;
  amountAtStake: number;
  onClose: () => void;
}

export function ProvisionAdjustmentModal({ caseId, currentProvision, amountAtStake, onClose }: Props) {
  const adjust = useAdjustProvision(caseId);
  const [newAmount, setNewAmount] = useState<string>(String(currentProvision));
  const [reason, setReason] = useState("");
  const [validatedByDaf, setValidatedByDaf] = useState("");

  const newAmountNum = Number(newAmount);
  const delta = newAmountNum - currentProvision;
  const exceedsStake = newAmountNum > amountAtStake;
  const isMaterial = Math.abs(delta) >= 10_000_000; // > 10 M FCFA = validation DAF requise

  async function submit() {
    try {
      await adjust.mutateAsync({
        newAmount: newAmountNum,
        reason: reason.trim(),
        validatedByDafName: validatedByDaf.trim() || undefined,
      });
      onClose();
    } catch {
      /* error rendered below */
    }
  }

  const valid =
    newAmount !== "" &&
    newAmountNum >= 0 &&
    !exceedsStake &&
    reason.trim().length > 4 &&
    (!isMaterial || validatedByDaf.trim().length > 1);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-xl bg-white shadow-2xl sm:rounded-xl">
        <header className="flex items-center justify-between border-b border-line px-4 py-3">
          <div>
            <h2 className="text-[14px] font-bold text-ink">Ajuster la provision IFRS</h2>
            <p className="mt-0.5 text-[11.5px] text-ink-3">
              Enjeu plafond : {amountAtStake.toLocaleString("fr-FR")} FCFA
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-md text-ink-3 hover:bg-surface-alt"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
          <div className="grid grid-cols-3 items-center gap-2 rounded-md bg-surface-alt/50 p-3 text-[12px]">
            <div className="text-center">
              <div className="text-[10px] uppercase tracking-wider text-ink-3">Actuelle</div>
              <div className="mt-0.5 font-bold text-ink">{currentProvision.toLocaleString("fr-FR")}</div>
            </div>
            <div className="text-center">
              <ArrowRight className="mx-auto h-4 w-4 text-ink-3" />
            </div>
            <div className="text-center">
              <div className="text-[10px] uppercase tracking-wider text-ink-3">Nouvelle</div>
              <div className={clsx("mt-0.5 font-bold", delta > 0 ? "text-rose-700" : delta < 0 ? "text-emerald-700" : "text-ink")}>
                {newAmountNum.toLocaleString("fr-FR")}
              </div>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Nouvelle provision (FCFA) *</label>
            <input
              type="number"
              min={0}
              max={amountAtStake}
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              className="mt-1 h-8 w-full rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-violet-400"
            />
            {exceedsStake && (
              <p className="mt-1 text-[11px] text-rose-600">Ne peut pas dépasser l'enjeu.</p>
            )}
          </div>

          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11.5px] text-amber-900">
            <strong>Δ {delta >= 0 ? "+" : ""}{delta.toLocaleString("fr-FR")} FCFA</strong> ·{" "}
            {delta > 0
              ? "Hausse : aggravation du risque"
              : delta < 0
                ? "Baisse : amélioration de la position"
                : "Aucun changement"}
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Motif *</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Évolution dossier, audience défavorable, expertise indépendante, etc."
              className="mt-1 w-full rounded-md border border-line bg-white px-2 py-1.5 text-[12px] outline-none focus:border-violet-400"
            />
          </div>

          {isMaterial && (
            <div className="space-y-1">
              <div className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[11.5px] text-rose-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  Variation matérielle (≥ 10 M FCFA). Validation DAF requise pour comptabilisation et reporting CAC.
                </div>
              </div>
              <input
                type="text"
                value={validatedByDaf}
                onChange={(e) => setValidatedByDaf(e.target.value)}
                placeholder="Nom du DAF qui valide"
                className="h-8 w-full rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-violet-400"
              />
            </div>
          )}

          {adjust.isError && (
            <p className="text-[11.5px] text-rose-600">{(adjust.error as Error)?.message ?? "Erreur"}</p>
          )}
        </div>

        <footer className="flex items-center justify-between gap-2 border-t border-line bg-surface-alt/40 px-4 py-2.5">
          <button
            type="button"
            onClick={onClose}
            className="h-8 rounded-md border border-line bg-white px-3 text-[12px] font-semibold text-ink hover:bg-surface-alt"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!valid || adjust.isPending}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-amber-600 px-3 text-[12px] font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
          >
            <Banknote className="h-3.5 w-3.5" /> Ajuster
          </button>
        </footer>
      </div>
    </div>
  );
}
