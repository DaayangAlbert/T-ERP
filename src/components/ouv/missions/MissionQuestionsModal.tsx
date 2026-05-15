"use client";

import { useState } from "react";
import { X, Loader2, CheckCircle2, MessageSquare } from "lucide-react";
import type { MissionItem } from "@/hooks/useOuvMissions";

interface Props {
  isOpen: boolean;
  mission: MissionItem | null;
  onClose: () => void;
  onSubmit: (id: string, questions: string) => Promise<void>;
}

// Modal "Poser questions" — l'ouvrier écrit ses questions au CC avant
// d'accepter ou pendant la mission. Affiche aussi l'historique des
// questions déjà posées (workerQuestionsRaised).
export function MissionQuestionsModal({ isOpen, mission, onClose, onSubmit }: Props) {
  const [questions, setQuestions] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen || !mission) return null;

  function reset() {
    setQuestions("");
    setSubmitting(false);
    setError(null);
    setSuccess(null);
  }

  async function submit() {
    if (questions.trim().length < 5) {
      setError("Précise tes questions (≥ 5 caractères)");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      if (mission) await onSubmit(mission.id, questions.trim());
      setSuccess("Questions envoyées — le chef répondra rapidement");
    } catch (err: any) {
      setError(err?.message ?? "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  const history = (mission.workerQuestionsRaised ?? "")
    .split("\n\n")
    .map((e) => e.trim())
    .filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50">
      <div className="w-full rounded-t-3xl bg-white p-5 pb-8 shadow-2xl">
        <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-slate-300" aria-hidden="true" />
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-purple-600" />
            <h2 className="text-[18px] font-bold text-slate-900">
              {success ? "Envoyées" : "Poser des questions"}
            </h2>
          </div>
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
            <p className="text-[16px] font-bold text-slate-900">{success}</p>
            <button
              type="button"
              onClick={() => {
                reset();
                onClose();
              }}
              className="mt-5 inline-flex h-12 items-center justify-center rounded-xl bg-purple-600 px-8 text-[15px] font-bold text-white"
            >
              Fermer
            </button>
          </div>
        ) : (
          <>
            <p className="mb-2 text-[12.5px] text-slate-600">
              <strong className="font-bold">{mission.title}</strong> · affecté par{" "}
              {mission.assignedBy.fullName}
            </p>

            {history.length > 0 && (
              <div className="mb-3 max-h-32 overflow-y-auto rounded-xl bg-slate-50 px-3 py-2 text-[12.5px] text-slate-700">
                <p className="mb-1 text-[11px] font-bold uppercase text-slate-500">
                  Historique
                </p>
                {history.map((entry, i) => (
                  <p key={i} className="mb-1.5 last:mb-0">
                    {entry}
                  </p>
                ))}
              </div>
            )}

            <label className="mb-1 block text-[12px] font-semibold uppercase tracking-wide text-slate-500">
              Tes questions
            </label>
            <textarea
              value={questions}
              onChange={(e) => setQuestions(e.target.value)}
              placeholder="Exemple : on commence par C3 ou par C8 ? Le béton est dosé à combien ?"
              maxLength={1000}
              rows={5}
              autoFocus
              className="mb-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[14px] text-slate-900 placeholder:text-slate-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
            />
            <p className="mb-3 text-right text-[11px] text-slate-400">{questions.length}/1000</p>

            {error && (
              <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-[13px] text-rose-700 ring-1 ring-rose-200">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-purple-600 text-[16px] font-bold text-white shadow-lg active:scale-[0.98] disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-5 w-5 animate-spin" />}
              Envoyer au chef
            </button>
            <p className="mt-2 text-center text-[11px] text-slate-500">
              Réponse sous 24 h ouvrées · escalade DTrav sinon
            </p>
          </>
        )}
      </div>
    </div>
  );
}
