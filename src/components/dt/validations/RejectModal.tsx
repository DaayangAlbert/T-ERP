"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => Promise<void>;
}

export function RejectModal({ open, onCancel, onConfirm }: Props) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onCancel} aria-hidden />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-xl border border-line bg-white shadow-2xl">
          <header className="flex items-center justify-between border-b border-line px-4 py-3">
            <h3 className="text-[14px] font-semibold text-ink">Rejeter la validation</h3>
            <button onClick={onCancel} className="rounded p-1 text-ink-3 hover:bg-line">
              <X className="h-4 w-4" />
            </button>
          </header>
          <div className="p-4">
            <label className="block text-[12px] font-medium text-ink-2">
              Motif du rejet (obligatoire)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="mt-1 w-full rounded-md border border-line-2 bg-white p-2 text-[12.5px] focus:border-rose-500 focus:outline-none"
              placeholder="Ex. : Justificatifs manquants, écart de prix non motivé…"
            />
          </div>
          <footer className="flex justify-end gap-2 border-t border-line px-4 py-3">
            <button
              onClick={onCancel}
              className="rounded border border-line-2 bg-white px-3 py-1.5 text-[12px] font-semibold text-ink-2 hover:border-primary-300"
            >
              Annuler
            </button>
            <button
              disabled={!reason.trim() || submitting}
              onClick={async () => {
                setSubmitting(true);
                try {
                  await onConfirm(reason.trim());
                  setReason("");
                } finally {
                  setSubmitting(false);
                }
              }}
              className="rounded bg-rose-600 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
            >
              Rejeter
            </button>
          </footer>
        </div>
      </div>
    </>
  );
}
