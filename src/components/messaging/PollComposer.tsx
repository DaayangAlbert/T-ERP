"use client";

import { useState } from "react";
import { Plus, X, BarChart3 } from "lucide-react";
import { useCreatePoll } from "@/hooks/useDgMessaging";

interface Props {
  open: boolean;
  onClose: () => void;
  conversationId: string;
}

export function PollComposer({ open, onClose, conversationId }: Props) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [error, setError] = useState<string | null>(null);
  const create = useCreatePoll();

  if (!open) return null;

  const submit = async () => {
    setError(null);
    const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
    if (question.trim().length < 3 || cleanOptions.length < 2) {
      setError("Question (3 car. min) et 2 options minimum.");
      return;
    }
    try {
      await create.mutateAsync({ conversationId, question: question.trim(), options: cleanOptions });
      setQuestion("");
      setOptions(["", ""]);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <h3 className="flex items-center gap-2 text-base font-semibold text-ink">
          <BarChart3 className="h-4 w-4 text-primary-500" /> Créer un sondage
        </h3>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Votre question"
          className="mt-3 h-10 w-full rounded-md border border-line bg-white px-2.5 text-[14px] focus:border-primary-300 focus:outline-none"
          autoFocus
        />
        <div className="mt-3 space-y-2">
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={opt}
                onChange={(e) => setOptions((s) => s.map((x, idx) => (idx === i ? e.target.value : x)))}
                placeholder={`Option ${i + 1}`}
                className="h-9 flex-1 rounded-md border border-line bg-white px-2.5 text-[13px]"
              />
              {options.length > 2 && (
                <button
                  type="button"
                  onClick={() => setOptions((s) => s.filter((_, idx) => idx !== i))}
                  className="grid h-8 w-8 place-items-center rounded text-rose-700 hover:bg-rose-50"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
          {options.length < 10 && (
            <button
              type="button"
              onClick={() => setOptions((s) => [...s, ""])}
              className="inline-flex items-center gap-1 text-[12px] text-primary-700 hover:underline"
            >
              <Plus className="h-3 w-3" /> Ajouter une option
            </button>
          )}
        </div>
        {error && <p className="mt-2 text-[12.5px] text-rose-700">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="inline-flex h-9 items-center rounded-md border border-line-2 bg-white px-3 text-[12.5px] text-ink-2">Annuler</button>
          <button
            type="button"
            onClick={submit}
            disabled={create.isPending}
            className="inline-flex h-9 items-center rounded-md bg-primary-500 px-3.5 text-[12.5px] font-medium text-white hover:bg-primary-600 disabled:opacity-60"
          >
            {create.isPending ? "Création…" : "Publier le sondage"}
          </button>
        </div>
      </div>
    </div>
  );
}
