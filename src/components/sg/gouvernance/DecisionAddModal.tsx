"use client";

import { useState } from "react";
import { X, Gavel } from "lucide-react";
import type { DecisionType } from "@prisma/client";
import { useAddDecision, type MeetingsListResponse } from "@/hooks/useSgGovernance";

interface Props {
  meeting: NonNullable<MeetingsListResponse["nextMeeting"]>;
  onClose: () => void;
  onSuccess: () => void;
}

const DECISION_TYPES: { id: DecisionType; label: string; hint: string }[] = [
  { id: "APPROVAL", label: "Approbation", hint: "Comptes, rapport, budget" },
  { id: "RATIFICATION", label: "Ratification", hint: "Décisions DG, actes" },
  { id: "AUTHORIZATION", label: "Autorisation", hint: "Engagements, garanties" },
  { id: "NOMINATION", label: "Nomination", hint: "Administrateur, dirigeant" },
  { id: "REVOCATION", label: "Révocation", hint: "Cessation de fonctions" },
  { id: "OTHER", label: "Autre", hint: "" },
];

export function DecisionAddModal({ meeting, onClose, onSuccess }: Props) {
  const add = useAddDecision(meeting.id);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [decisionType, setDecisionType] = useState<DecisionType>("APPROVAL");
  const [followUpStatus, setFollowUpStatus] = useState<string>("PENDING");

  async function submit() {
    try {
      await add.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        decisionType,
        followUpStatus: followUpStatus || undefined,
      });
      onSuccess();
      onClose();
    } catch {
      /* error rendered below */
    }
  }

  const valid = title.trim().length > 2 && description.trim().length > 5;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-xl flex-col rounded-t-xl bg-white shadow-2xl sm:rounded-xl">
        <header className="flex items-center justify-between border-b border-line px-4 py-3">
          <div>
            <h2 className="text-[14px] font-bold text-ink">Enregistrer une décision</h2>
            <p className="mt-0.5 text-[11.5px] text-ink-3">
              {meeting.decisionsCount} déjà enregistrée{meeting.decisionsCount > 1 ? "s" : ""} · sera indexée au Registre
            </p>
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
            <label className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Type *</label>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {DECISION_TYPES.map((t) => {
                const active = decisionType === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setDecisionType(t.id)}
                    className={
                      active
                        ? "rounded-md border border-violet-500 bg-violet-50 px-2 py-1.5 text-left text-[11.5px] font-semibold text-violet-700"
                        : "rounded-md border border-line bg-white px-2 py-1.5 text-left text-[11.5px] text-ink hover:bg-surface-alt"
                    }
                  >
                    <div>{t.label}</div>
                    {t.hint && <div className="text-[10px] font-normal text-ink-3">{t.hint}</div>}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Intitulé *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex : Approbation des comptes annuels 2025"
              className="mt-1 h-8 w-full rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-violet-400"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Description *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Texte exact tel que consigné au PV, références, votes pour/contre/abstention…"
              className="mt-1 w-full rounded-md border border-line bg-white px-2 py-1.5 text-[12px] outline-none focus:border-violet-400"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Suivi</label>
            <select
              value={followUpStatus}
              onChange={(e) => setFollowUpStatus(e.target.value)}
              className="mt-1 h-8 w-full rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-violet-400"
            >
              <option value="PENDING">En attente d'exécution</option>
              <option value="IN_PROGRESS">En cours</option>
              <option value="EXECUTED">Exécutée</option>
              <option value="N/A">Sans suite</option>
            </select>
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
            <Gavel className="h-3.5 w-3.5" /> Enregistrer
          </button>
        </footer>
      </div>
    </div>
  );
}
