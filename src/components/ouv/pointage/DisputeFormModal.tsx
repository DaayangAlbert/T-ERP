"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import type { ClockWeekDay } from "@/hooks/useOuvClock";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  days: ClockWeekDay[];
  onSubmit: (id: string, reason: string) => Promise<void>;
}

// Modal bottom-sheet pour signaler un désaccord. Choix du jour parmi
// les pointages des 7 derniers jours (fenêtre 48h vs date du pointage
// côté API), puis saisie du motif (≥ 5 caractères).
export function DisputeFormModal({ isOpen, onClose, days, onSubmit }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Filtre : pointages des 48 dernières heures uniquement (fenêtre côté API)
  const eligible = days.filter((d) => {
    const ageMs = Date.now() - new Date(d.date).getTime();
    return ageMs <= 48 * 3600 * 1000 && !d.contested;
  });

  async function submit() {
    if (!selectedId) {
      setError("Sélectionne le jour concerné");
      return;
    }
    if (reason.trim().length < 5) {
      setError("Précise ton désaccord (≥ 5 caractères)");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(selectedId, reason.trim());
      setSelectedId(null);
      setReason("");
      onClose();
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
          <h2 className="text-[18px] font-bold text-slate-900">Signaler un désaccord</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="grid h-10 w-10 place-items-center rounded-full bg-slate-100"
          >
            <X className="h-5 w-5 text-slate-600" />
          </button>
        </div>

        <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-slate-500">
          Jour concerné
        </p>
        {eligible.length === 0 ? (
          <p className="mb-4 rounded-lg bg-slate-50 px-3 py-3 text-[13px] text-slate-600">
            Aucun pointage des 48 dernières heures n'est contestable (déjà signalé ou trop ancien).
          </p>
        ) : (
          <div className="mb-4 space-y-1.5">
            {eligible.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setSelectedId(d.id)}
                className={`flex w-full items-center justify-between rounded-lg border-2 px-3 py-2.5 text-left text-[14px] ${
                  selectedId === d.id
                    ? "border-purple-500 bg-purple-50"
                    : "border-slate-200 bg-white"
                }`}
              >
                <span className="font-semibold text-slate-900">
                  {new Date(d.date).toLocaleDateString("fr-FR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </span>
                <span className="text-slate-500">
                  {d.totalHours.toFixed(1)} h
                  {d.overtimeHours > 0 ? ` (+${d.overtimeHours.toFixed(1)}h sup)` : ""}
                </span>
              </button>
            ))}
          </div>
        )}

        <label className="mb-1 block text-[12px] font-semibold uppercase tracking-wide text-slate-500">
          Motif du désaccord
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Exemple : je suis arrivé à 6:30 mais le pointage indique 6:48"
          maxLength={500}
          rows={4}
          className="mb-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[14px] text-slate-900 placeholder:text-slate-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
        />
        <p className="mb-4 text-right text-[11px] text-slate-400">{reason.length}/500</p>

        {error && (
          <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-[13px] text-rose-700 ring-1 ring-rose-200">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={submit}
          disabled={submitting || eligible.length === 0}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 text-[16px] font-bold text-white shadow-lg active:scale-[0.98] disabled:opacity-60"
        >
          {submitting && <Loader2 className="h-5 w-5 animate-spin" />}
          Envoyer au chef chantier
        </button>
        <p className="mt-2 text-center text-[11px] text-slate-500">
          Sous 48 h après le pointage uniquement
        </p>
      </div>
    </div>
  );
}
