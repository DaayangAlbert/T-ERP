"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";
import { useAddLegalCaseEvent } from "@/hooks/useSgLegalCases";

interface Props {
  caseId: string;
  onClose: () => void;
}

const EVENT_TYPES = [
  { id: "HEARING", label: "Audience" },
  { id: "DECISION", label: "Décision juridiction" },
  { id: "MEMORANDUM_FILED", label: "Mémoire déposé" },
  { id: "CORRESPONDENCE", label: "Courrier officiel" },
  { id: "COMMUNICATION", label: "Échange avec avocat" },
  { id: "STRATEGY", label: "Note stratégique" },
  { id: "INCIDENT", label: "Incident" },
];

export function EventAddModal({ caseId, onClose }: Props) {
  const add = useAddLegalCaseEvent(caseId);
  const [eventType, setEventType] = useState<string>("HEARING");
  const [eventDate, setEventDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");

  async function submit() {
    try {
      await add.mutateAsync({
        eventType,
        eventDate: eventDate ? new Date(eventDate).toISOString() : undefined,
        description: description.trim(),
        documentUrl: documentUrl.trim() || undefined,
      });
      onClose();
    } catch {
      /* error rendered below */
    }
  }

  const valid = description.trim().length > 2;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-xl bg-white shadow-2xl sm:rounded-xl">
        <header className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-[14px] font-bold text-ink">Ajouter un acte procédural</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-md text-ink-3 hover:bg-surface-alt"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Type *</label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="mt-1 h-8 w-full rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-violet-400"
            >
              {EVENT_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Date</label>
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="mt-1 h-8 w-full rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-violet-400"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Description *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Détails de l'acte, références, conséquences attendues…"
              className="mt-1 w-full rounded-md border border-line bg-white px-2 py-1.5 text-[12px] outline-none focus:border-violet-400"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">URL document (optionnel)</label>
            <input
              type="url"
              value={documentUrl}
              onChange={(e) => setDocumentUrl(e.target.value)}
              placeholder="https://ged.terp.cm/…"
              className="mt-1 h-8 w-full rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-violet-400"
            />
          </div>
          {add.isError && (
            <p className="text-[11.5px] text-rose-600">{(add.error as Error)?.message ?? "Erreur"}</p>
          )}
        </div>

        <footer className="flex items-center justify-between gap-2 border-t border-line bg-surface-alt/40 px-4 py-2.5">
          <button
            type="button"
            onClick={onClose}
            className="h-8 rounded-md border border-line bg-white px-3 text-[12px] font-semibold text-ink hover:bg-surface-alt"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!valid || add.isPending}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-violet-600 px-3 text-[12px] font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" /> Ajouter
          </button>
        </footer>
      </div>
    </div>
  );
}
