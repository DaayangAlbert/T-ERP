"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { ContractingAuthorityType, ContractPhase } from "@prisma/client";
import { useCreateContract } from "@/hooks/useSgContracts";

const AUTHORITY_LABEL: Record<ContractingAuthorityType, string> = {
  PUBLIC_MINISTRY: "Ministère",
  PUBLIC_MUNICIPALITY: "Commune",
  PUBLIC_INSTITUTION: "Institution publique",
  PRIVATE_COMPANY: "Société privée",
  PRIVATE_INDIVIDUAL: "Particulier",
};

const PHASE_LABEL: Record<string, string> = {
  CALL_FOR_TENDERS_WATCH: "Veille AO",
  STUDY_AND_SUBMISSION: "Étude & soumission",
  CONTRACT_SIGNATURE: "Signature contrat",
};

interface Props {
  onClose: () => void;
  onCreated?: (id: string) => void;
}

export function NewContractModal({ onClose, onCreated }: Props) {
  const create = useCreateContract();
  const [reference, setReference] = useState("");
  const [title, setTitle] = useState("");
  const [authority, setAuthority] = useState("");
  const [authorityType, setAuthorityType] = useState<ContractingAuthorityType>(ContractingAuthorityType.PUBLIC_MINISTRY);
  const [amountM, setAmountM] = useState<number | "">("");
  const [phase, setPhase] = useState<ContractPhase>(ContractPhase.CALL_FOR_TENDERS_WATCH);
  const [closeDate, setCloseDate] = useState("");
  const [err, setErr] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (typeof amountM !== "number") return;
    setErr(null);
    create.mutate(
      {
        reference: reference.trim().toUpperCase(),
        title: title.trim(),
        contractingAuthority: authority.trim(),
        authorityType,
        amountHT: amountM * 1_000_000,
        phase,
        callForTendersCloseDate: closeDate ? new Date(closeDate).toISOString() : undefined,
      },
      {
        onSuccess: ({ id }) => {
          onCreated?.(id);
          onClose();
        },
        onError: (e: Error) => setErr(e.message),
      },
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-3 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-[14px] font-bold text-ink">Nouveau marché / Appel d'offres</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-ink-3 hover:bg-surface-alt"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <form onSubmit={submit} className="space-y-3 px-4 py-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">Référence *</span>
              <input
                required
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="M-2026-XXX ou AO-2026-XXX"
                className="mt-0.5 h-9 w-full rounded-md border border-line bg-white px-2 font-mono text-[12.5px] uppercase outline-none focus:border-violet-400"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">Phase initiale *</span>
              <select
                value={phase}
                onChange={(e) => setPhase(e.target.value as ContractPhase)}
                className="mt-0.5 h-9 w-full rounded-md border border-line bg-white px-2 text-[12.5px] outline-none focus:border-violet-400"
              >
                <option value={ContractPhase.CALL_FOR_TENDERS_WATCH}>{PHASE_LABEL.CALL_FOR_TENDERS_WATCH}</option>
                <option value={ContractPhase.STUDY_AND_SUBMISSION}>{PHASE_LABEL.STUDY_AND_SUBMISSION}</option>
                <option value={ContractPhase.CONTRACT_SIGNATURE}>{PHASE_LABEL.CONTRACT_SIGNATURE}</option>
              </select>
            </label>
          </div>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">Intitulé *</span>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex. Construction école primaire Mfoundi"
              className="mt-0.5 h-9 w-full rounded-md border border-line bg-white px-2 text-[12.5px] outline-none focus:border-violet-400"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">Type MOA *</span>
              <select
                value={authorityType}
                onChange={(e) => setAuthorityType(e.target.value as ContractingAuthorityType)}
                className="mt-0.5 h-9 w-full rounded-md border border-line bg-white px-2 text-[12.5px] outline-none focus:border-violet-400"
              >
                {(Object.keys(AUTHORITY_LABEL) as ContractingAuthorityType[]).map((a) => (
                  <option key={a} value={a}>{AUTHORITY_LABEL[a]}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">Montant HT (M FCFA) *</span>
              <input
                type="number"
                required
                value={amountM}
                onChange={(e) => setAmountM(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="Ex. 350"
                className="mt-0.5 h-9 w-full rounded-md border border-line bg-white px-2 font-mono text-[12.5px] outline-none focus:border-violet-400"
              />
            </label>
          </div>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">Maître d'ouvrage *</span>
            <input
              required
              value={authority}
              onChange={(e) => setAuthority(e.target.value)}
              placeholder="Ex. MINTP, Commune Yaoundé III, …"
              className="mt-0.5 h-9 w-full rounded-md border border-line bg-white px-2 text-[12.5px] outline-none focus:border-violet-400"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">Date clôture AO</span>
            <input
              type="date"
              value={closeDate}
              onChange={(e) => setCloseDate(e.target.value)}
              className="mt-0.5 h-9 w-full rounded-md border border-line bg-white px-2 text-[12.5px] outline-none focus:border-violet-400"
            />
          </label>
          {err && (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[11.5px] text-rose-800">
              {err}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 items-center rounded-md border border-line bg-white px-3 text-[12.5px] font-semibold text-ink hover:bg-surface-alt"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={create.isPending}
              className="inline-flex h-9 items-center rounded-md bg-violet-600 px-3 text-[12.5px] font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {create.isPending ? "Création…" : "Créer le marché"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
