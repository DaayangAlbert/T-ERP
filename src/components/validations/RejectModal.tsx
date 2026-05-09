"use client";

import { useState } from "react";
import { useRejectValidation } from "@/hooks/useValidations";

interface Props {
  open: boolean;
  onClose: () => void;
  validationId: string;
  validationTitle: string;
  onDone?: () => void;
}

export function RejectModal({ open, onClose, validationId, validationTitle, onDone }: Props) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const reject = useRejectValidation();

  if (!open) return null;

  const submit = async () => {
    setError(null);
    if (reason.trim().length < 3) {
      setError("Motif requis (3 caractères min).");
      return;
    }
    try {
      await reject.mutateAsync({ id: validationId, reason: reason.trim() });
      setReason("");
      onClose();
      onDone?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <h3 className="text-base font-semibold text-ink">Rejeter la demande</h3>
        <p className="mt-1 truncate text-[12.5px] text-ink-3">{validationTitle}</p>
        <p className="mt-2 rounded-md bg-rose-50 px-3 py-2 text-[12px] text-rose-800 ring-1 ring-rose-200">
          Cette action est définitive. L'initiateur recevra le motif.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          placeholder="Motif du rejet (clair et factuel)"
          className="mt-3 w-full rounded-md border border-line bg-surface-alt px-2.5 py-2 text-[13px] focus:border-primary-300 focus:outline-none"
          autoFocus
        />
        {error && <p className="mt-2 text-[12.5px] text-rose-700">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center rounded-md border border-line-2 bg-white px-3 text-[12.5px] text-ink-2"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={reject.isPending}
            className="inline-flex h-9 items-center rounded-md bg-danger px-3.5 text-[12.5px] font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {reject.isPending ? "Rejet…" : "Confirmer le rejet"}
          </button>
        </div>
      </div>
    </div>
  );
}
