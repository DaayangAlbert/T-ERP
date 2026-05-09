"use client";

import { useState } from "react";
import { Plus, X, Send } from "lucide-react";
import { useSendReport } from "@/hooks/useReports";

interface Props {
  open: boolean;
  onClose: () => void;
  reportId: string;
  defaultRecipients?: Array<{ email: string; name?: string }>;
}

export function SendReportModal({ open, onClose, reportId, defaultRecipients = [] }: Props) {
  const [recipients, setRecipients] = useState<Array<{ email: string; name: string }>>(
    defaultRecipients.length
      ? defaultRecipients.map((r) => ({ email: r.email, name: r.name ?? "" }))
      : [{ email: "", name: "" }]
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const send = useSendReport();

  if (!open) return null;

  const update = (i: number, patch: Partial<{ email: string; name: string }>) => {
    setRecipients((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };
  const add = () => setRecipients((rs) => [...rs, { email: "", name: "" }]);
  const remove = (i: number) => setRecipients((rs) => rs.filter((_, idx) => idx !== i));

  const submit = async () => {
    setError(null);
    const valid = recipients.filter((r) => r.email.trim().length > 0);
    if (valid.length === 0) {
      setError("Au moins un email requis");
      return;
    }
    try {
      const res = await send.mutateAsync({
        id: reportId,
        recipients: valid,
        message: message.trim() || undefined,
      });
      onClose();
      alert(`${res.sent} destinataires enregistrés.\n${res.note}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl">
        <h3 className="text-base font-semibold text-ink">Diffuser le rapport</h3>
        <p className="mt-1 text-[12.5px] text-ink-3">
          Le rapport sera envoyé par email aux destinataires choisis (PDF en pièce jointe).
        </p>

        <div className="mt-4 space-y-2">
          {recipients.map((r, i) => (
            <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <input
                type="email"
                value={r.email}
                onChange={(e) => update(i, { email: e.target.value })}
                placeholder="email@exemple.com"
                className="rounded-md border border-line bg-white px-2.5 py-1.5 text-[13px] focus:border-primary-300 focus:outline-none"
              />
              <input
                type="text"
                value={r.name}
                onChange={(e) => update(i, { name: e.target.value })}
                placeholder="Nom (optionnel)"
                className="rounded-md border border-line bg-white px-2.5 py-1.5 text-[13px]"
              />
              <button
                type="button"
                onClick={() => remove(i)}
                disabled={recipients.length === 1}
                className="grid h-8 w-8 place-items-center rounded text-ink-3 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-30"
                aria-label="Retirer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={add}
          className="mt-2 inline-flex items-center gap-1 text-[12px] text-primary-700 hover:underline"
        >
          <Plus className="h-3.5 w-3.5" /> Ajouter un destinataire
        </button>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          placeholder="Message d'accompagnement (optionnel)"
          className="mt-3 w-full rounded-md border border-line bg-surface-alt px-2.5 py-1.5 text-[13px]"
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
            disabled={send.isPending}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary-500 px-3.5 text-[12.5px] font-medium text-white hover:bg-primary-600 disabled:opacity-60"
          >
            <Send className="h-3.5 w-3.5" />
            {send.isPending ? "Envoi…" : "Diffuser"}
          </button>
        </div>
      </div>
    </div>
  );
}
