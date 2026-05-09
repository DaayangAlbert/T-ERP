"use client";

import { useState } from "react";
import { useRequestInfo } from "@/hooks/useValidations";

interface Props {
  open: boolean;
  onClose: () => void;
  validationId: string;
  validationTitle: string;
}

export function RequestInfoModal({ open, onClose, validationId, validationTitle }: Props) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const ask = useRequestInfo();

  if (!open) return null;

  const submit = async () => {
    setError(null);
    if (message.trim().length < 3) {
      setError("Message trop court (3 caractères min).");
      return;
    }
    try {
      await ask.mutateAsync({ id: validationId, message: message.trim() });
      setMessage("");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <h3 className="text-base font-semibold text-ink">Demander un complément d'information</h3>
        <p className="mt-1 truncate text-[12.5px] text-ink-3">{validationTitle}</p>
        <p className="mt-2 text-[12px] text-ink-3">
          Le message sera envoyé à l'initiateur sans rejeter la demande.
        </p>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          placeholder="Précisez ce que vous souhaitez vérifier (devis, justificatif, contexte…)"
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
            disabled={ask.isPending}
            className="inline-flex h-9 items-center rounded-md bg-primary-500 px-3.5 text-[12.5px] font-medium text-white hover:bg-primary-600 disabled:opacity-60"
          >
            {ask.isPending ? "Envoi…" : "Envoyer la demande"}
          </button>
        </div>
      </div>
    </div>
  );
}
