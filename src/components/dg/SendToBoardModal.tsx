"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, X, Mail } from "lucide-react";
import { clsx } from "clsx";
import { useSendBoardReport } from "@/hooks/useDgBoardReports";

interface Props {
  open: boolean;
  reportId: string;
  defaultRecipients?: Array<{ email: string; name: string }>;
  onClose: () => void;
  onSent?: () => void;
}

interface Recipient {
  id: string;
  email: string;
  name: string;
}

function newRecipient(): Recipient {
  return { id: Math.random().toString(36).slice(2, 9), email: "", name: "" };
}

export function SendToBoardModal({ open, reportId, defaultRecipients, onClose, onSent }: Props) {
  const send = useSendBoardReport();
  const [recipients, setRecipients] = useState<Recipient[]>([newRecipient()]);
  const [message, setMessage] = useState("");
  const [serverMsg, setServerMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (open) {
      const seed = (defaultRecipients ?? []).map((r) => ({ ...newRecipient(), ...r }));
      setRecipients(seed.length ? seed : [newRecipient()]);
      setMessage("");
      setServerMsg(null);
    }
  }, [open, defaultRecipients]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const valid = recipients.every((r) => r.email.includes("@") && r.name.length > 0);

  const submit = async () => {
    setServerMsg(null);
    try {
      const res = await send.mutateAsync({
        id: reportId,
        payload: {
          recipients: recipients.map((r) => ({ email: r.email, name: r.name })),
          message,
        },
      });
      setServerMsg({ tone: "ok", text: res.note ?? "Diffusion enregistrée." });
      onSent?.();
      setTimeout(onClose, 800);
    } catch (err) {
      setServerMsg({ tone: "error", text: err instanceof Error ? err.message : "Erreur" });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/55 px-4 py-8 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="send-board-title"
    >
      <div className="w-full max-w-[600px] animate-modal-slide-up overflow-hidden rounded-xl bg-white shadow-2xl">
        <div
          className="flex items-center justify-between px-5 py-4 text-white"
          style={{ background: "linear-gradient(135deg,#2A1B3D 0%,#7E22CE 100%)" }}
        >
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <h3 id="send-board-title" className="text-base font-semibold">
              Diffuser le rapport au Conseil
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="grid h-8 w-8 place-items-center rounded-md text-white/80 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div>
            <label className="mb-1.5 flex items-center justify-between text-[12px] font-medium text-ink-2">
              <span>Destinataires</span>
              <button
                type="button"
                onClick={() => setRecipients((r) => [...r, newRecipient()])}
                className="inline-flex items-center gap-1 rounded-md border border-line-2 bg-white px-2 py-0.5 text-[11px] hover:border-primary-300"
              >
                <Plus className="h-3 w-3" /> Ajouter
              </button>
            </label>
            <ul className="space-y-2">
              {recipients.map((r, i) => (
                <li key={r.id} className="flex items-center gap-2">
                  <input
                    placeholder="Nom"
                    value={r.name}
                    onChange={(e) =>
                      setRecipients((list) =>
                        list.map((x, j) => (j === i ? { ...x, name: e.target.value } : x))
                      )
                    }
                    className="h-9 w-44 rounded-md border border-line bg-white px-3 text-sm focus:border-primary-300 focus:outline-none"
                  />
                  <input
                    type="email"
                    placeholder="email@conseil.cm"
                    value={r.email}
                    onChange={(e) =>
                      setRecipients((list) =>
                        list.map((x, j) => (j === i ? { ...x, email: e.target.value } : x))
                      )
                    }
                    className="h-9 flex-1 rounded-md border border-line bg-white px-3 text-sm focus:border-primary-300 focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={recipients.length === 1}
                    onClick={() => setRecipients((list) => list.filter((_, j) => j !== i))}
                    className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-md text-ink-3 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                    aria-label="Retirer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-ink-2">
              Message d'accompagnement (optionnel)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Bonjour, vous trouverez en pièce jointe le reporting CA…"
              className="w-full resize-none rounded-md border border-line bg-white px-3 py-2 text-sm focus:border-primary-300 focus:outline-none"
            />
          </div>

          {serverMsg && (
            <p
              className={clsx(
                "rounded-md px-3 py-2 text-sm ring-1",
                serverMsg.tone === "ok"
                  ? "bg-green-50 text-green-700 ring-green-200"
                  : "bg-rose-50 text-rose-700 ring-rose-200"
              )}
            >
              {serverMsg.text}
            </p>
          )}

          <p className="rounded-md border border-dashed border-primary-200 bg-primary-50/40 p-2.5 text-[11.5px] text-primary-800">
            ⚠️ Mode démo : RESEND_API_KEY est vide en local — la diffusion enregistre les destinataires
            dans la base mais n'envoie pas d'email réel. Configurer la clé pour activer l'envoi.
          </p>

          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-md border border-line-2 bg-white px-3 text-sm text-ink-2 hover:border-primary-300"
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={!valid || send.isPending}
              onClick={submit}
              className="h-9 rounded-md bg-primary-500 px-3 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-60"
            >
              {send.isPending ? "Envoi…" : `Diffuser (${recipients.length})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
