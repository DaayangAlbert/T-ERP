"use client";

import { useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import { useBulkApprove } from "@/hooks/useValidations";
import { formatFCFA } from "@/lib/format";

interface Props {
  selectedIds: string[];
  totalAmount: bigint;
  onClear: () => void;
  onDone?: () => void;
}

export function BulkApproveBar({ selectedIds, totalAmount, onClear, onDone }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [comment, setComment] = useState("");
  const bulk = useBulkApprove();

  if (selectedIds.length === 0) return null;

  const submit = async () => {
    const res = await bulk.mutateAsync({ ids: selectedIds, comment: comment || undefined });
    setConfirmOpen(false);
    setComment("");
    onClear();
    onDone?.();
    alert(`Lot traité : ${res.approved} validations finales, ${res.advanced} avancées d'une étape.`);
  };

  return (
    <>
      <div className="sticky bottom-3 z-10 flex items-center gap-3 rounded-lg border border-success/40 bg-success/5 px-4 py-2.5 shadow-card">
        <CheckCircle2 className="h-5 w-5 text-success" />
        <div className="flex-1">
          <div className="text-[13px] font-semibold text-ink">
            {selectedIds.length} validation{selectedIds.length > 1 ? "s" : ""} sélectionnée
            {selectedIds.length > 1 ? "s" : ""}
          </div>
          {totalAmount > 0n && (
            <div className="text-[11.5px] text-ink-3">
              Total cumulé : <span className="font-mono font-semibold">{formatFCFA(totalAmount)}</span>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onClear}
          className="grid h-8 w-8 place-items-center rounded text-ink-3 hover:bg-white"
          aria-label="Désélectionner"
        >
          <X className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-success px-3.5 text-[12.5px] font-medium text-white hover:opacity-90"
        >
          Valider sélection ({selectedIds.length})
        </button>
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold text-ink">Confirmer la validation en lot</h3>
            <p className="mt-1.5 text-[13px] text-ink-2">
              Vous allez approuver <strong>{selectedIds.length}</strong> demande
              {selectedIds.length > 1 ? "s" : ""}.
            </p>
            {totalAmount > 0n && (
              <p className="mt-2 rounded-md bg-surface-alt px-3 py-2 text-[12.5px]">
                Total cumulé :{" "}
                <span className="font-mono font-bold text-ink">{formatFCFA(totalAmount)}</span>
              </p>
            )}
            <label className="mt-3 block">
              <span className="text-[12px] font-medium text-ink-2">Commentaire (optionnel)</span>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
                placeholder="Note interne pour la trace d'audit"
                className="mt-1 w-full rounded-md border border-line bg-surface-alt px-2.5 py-1.5 text-[13px] focus:border-primary-300 focus:outline-none"
              />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="inline-flex h-9 items-center rounded-md border border-line-2 bg-white px-3 text-[12.5px] text-ink-2"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={bulk.isPending}
                className="inline-flex h-9 items-center rounded-md bg-success px-3.5 text-[12.5px] font-medium text-white hover:opacity-90 disabled:opacity-60"
              >
                {bulk.isPending ? "Traitement…" : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
