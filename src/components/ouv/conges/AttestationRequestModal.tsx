"use client";

import { useState } from "react";
import { X, Loader2, CheckCircle2 } from "lucide-react";
import type { OuvAttestationType } from "@/schemas/ouv-attestation";
import { attestationTypeLabel } from "@/schemas/ouv-attestation";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    type: OuvAttestationType;
    purpose?: string;
  }) => Promise<{ message: string; expectedReadyAt: string | null } | null>;
}

const TYPES: Array<{ value: OuvAttestationType; emoji: string }> = [
  { value: "SALARY", emoji: "💰" },
  { value: "EMPLOYMENT", emoji: "💼" },
  { value: "PRESENCE", emoji: "📋" },
  { value: "LEAVE_TAKEN", emoji: "🌴" },
  { value: "OTHER", emoji: "📄" },
];

// Modal : choix du type + motif court (où servira l'attestation).
// RH prépare le PDF signé sous 48h.
export function AttestationRequestModal({ isOpen, onClose, onSubmit }: Props) {
  const [type, setType] = useState<OuvAttestationType>("SALARY");
  const [purpose, setPurpose] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ message: string; ready: string | null } | null>(null);

  if (!isOpen) return null;

  function reset() {
    setType("SALARY");
    setPurpose("");
    setSubmitting(false);
    setError(null);
    setSuccess(null);
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await onSubmit({ type, purpose: purpose.trim() || undefined });
      if (res) setSuccess({ message: res.message, ready: res.expectedReadyAt });
    } catch (err: any) {
      setError(err?.message ?? "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50">
      <div className="w-full rounded-t-3xl bg-white p-5 pb-8 shadow-2xl">
        <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-slate-300" aria-hidden="true" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[18px] font-bold text-slate-900">
            {success ? "Demande envoyée" : "Demander une attestation"}
          </h2>
          <button
            type="button"
            onClick={() => {
              if (success) reset();
              onClose();
            }}
            aria-label="Fermer"
            className="grid h-10 w-10 place-items-center rounded-full bg-slate-100"
          >
            <X className="h-5 w-5 text-slate-600" />
          </button>
        </div>

        {success ? (
          <div className="py-4 text-center">
            <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <p className="text-[16px] font-bold text-slate-900">{success.message}</p>
            {success.ready && (
              <p className="mt-2 text-[12.5px] text-slate-500">
                Prête vers le {new Date(success.ready).toLocaleDateString("fr-FR", {
                  day: "2-digit",
                  month: "long",
                })}
              </p>
            )}
            <button
              type="button"
              onClick={() => {
                reset();
                onClose();
              }}
              className="mt-5 inline-flex h-12 items-center justify-center rounded-xl bg-amber-600 px-8 text-[15px] font-bold text-white"
            >
              Fermer
            </button>
          </div>
        ) : (
          <>
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-slate-500">
              Type d'attestation
            </p>
            <div className="mb-4 flex flex-col gap-1.5">
              {TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={`flex h-[56px] items-center gap-3 rounded-xl border-2 px-3 text-left text-[14px] font-semibold ${
                    type === t.value
                      ? "border-amber-500 bg-amber-50 text-amber-800"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  <span className="text-xl">{t.emoji}</span>
                  {attestationTypeLabel(t.value)}
                </button>
              ))}
            </div>

            <label className="mb-1 block text-[12px] font-semibold uppercase tracking-wide text-slate-500">
              Pour quoi faire ? (optionnel)
            </label>
            <textarea
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Exemple : ouverture compte Afriland, demande de visa, dossier locatif"
              maxLength={300}
              rows={3}
              className="mb-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[14px] text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
            />

            {error && (
              <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-[13px] text-rose-700 ring-1 ring-rose-200">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-amber-500 text-[16px] font-bold text-white shadow-lg active:scale-[0.98] disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-5 w-5 animate-spin" />}
              Envoyer à RH
            </button>
            <p className="mt-2 text-center text-[11px] text-slate-500">
              PDF signé sous 48 h ouvrées
            </p>
          </>
        )}
      </div>
    </div>
  );
}
