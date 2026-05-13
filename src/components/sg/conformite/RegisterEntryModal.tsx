"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";
import { useAddRegisterEntry } from "@/hooks/useSgCompliance";

interface Props {
  registerId: string;
  registerName: string;
  onClose: () => void;
}

export function RegisterEntryModal({ registerId, registerName, onClose }: Props) {
  const add = useAddRegisterEntry(registerId);
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");

  async function submit() {
    try {
      await add.mutateAsync({ label: label.trim(), description: description.trim() || undefined });
      onClose();
    } catch {
      /* error rendered below */
    }
  }

  const valid = label.trim().length > 2;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-xl bg-white shadow-2xl sm:rounded-xl">
        <header className="flex items-center justify-between border-b border-line px-4 py-3">
          <div>
            <h2 className="text-[14px] font-bold text-ink">Nouvelle entrée · {registerName}</h2>
            <p className="mt-0.5 text-[11.5px] text-ink-3">Incrémente le compteur du registre</p>
          </div>
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
            <label className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Intitulé *</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ex : Convention règlementée — prêt actionnaire 2026-04"
              className="mt-1 h-8 w-full rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-violet-400"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Référence du document, parties, montant, conditions…"
              className="mt-1 w-full rounded-md border border-line bg-white px-2 py-1.5 text-[12px] outline-none focus:border-violet-400"
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
            <Plus className="h-3.5 w-3.5" /> Enregistrer
          </button>
        </footer>
      </div>
    </div>
  );
}
