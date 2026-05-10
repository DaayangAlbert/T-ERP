"use client";

import { useState } from "react";
import { ValidationType } from "@prisma/client";
import { useCreateDelegation, useEligibleApprovers } from "@/hooks/useValidations";

const TYPE_LABEL: Record<ValidationType, string> = {
  PAYROLL: "Paie",
  EXPENSE: "Dépense",
  PURCHASE: "Achat",
  HIRING: "Embauche",
  CONTRACT: "Marché / contrat",
  LEAVE: "Congé",
  OTHER: "Autre",
  AMENDMENT: "Avenant marché",
  SUBCONTRACTING: "Sous-traitance",
  EQUIPMENT: "Acquisition matériel",
  SPECIAL_METHOD: "Méthode spéciale",
  TECHNICAL_HANDOVER: "Mise en service",
};

interface Props {
  open: boolean;
  onClose: () => void;
  onDone?: () => void;
}

export function DelegateModal({ open, onClose, onDone }: Props) {
  const { data: approvers } = useEligibleApprovers();
  const create = useCreateDelegation();
  const [toUserId, setToUserId] = useState("");
  const [types, setTypes] = useState<ValidationType[]>([]);
  const [maxAmount, setMaxAmount] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const toggleType = (t: ValidationType) => {
    setTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const submit = async () => {
    setError(null);
    if (!toUserId) return setError("Sélectionnez un destinataire.");
    if (types.length === 0) return setError("Sélectionnez au moins un type.");
    try {
      await create.mutateAsync({
        toUserId,
        types,
        maxAmount: maxAmount ? maxAmount : null,
        startDate,
        endDate: endDate || null,
        reason: reason || undefined,
      });
      // reset
      setToUserId("");
      setTypes([]);
      setMaxAmount("");
      setEndDate("");
      setReason("");
      onClose();
      onDone?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl">
        <h3 className="text-base font-semibold text-ink">Nouvelle délégation</h3>
        <p className="mt-1 text-[12.5px] text-ink-3">
          Permettre à un autre cadre de valider à votre place pour certains types de demandes.
        </p>

        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-[12px] font-semibold text-ink-2">Destinataire</span>
            <select
              value={toUserId}
              onChange={(e) => setToUserId(e.target.value)}
              className="mt-1 w-full rounded-md border border-line bg-white px-2.5 py-2 text-[13px] focus:border-primary-300 focus:outline-none"
            >
              <option value="">— Sélectionner —</option>
              {approvers?.items.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.role})
                </option>
              ))}
            </select>
          </label>

          <div>
            <span className="text-[12px] font-semibold text-ink-2">Types de validation délégués</span>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {(Object.keys(TYPE_LABEL) as ValidationType[]).map((t) => (
                <label
                  key={t}
                  className={
                    "flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1.5 text-[12px] " +
                    (types.includes(t)
                      ? "border-primary-300 bg-primary-50 text-primary-800"
                      : "border-line bg-white text-ink-2 hover:border-primary-200")
                  }
                >
                  <input
                    type="checkbox"
                    checked={types.includes(t)}
                    onChange={() => toggleType(t)}
                    className="h-3.5 w-3.5"
                  />
                  {TYPE_LABEL[t]}
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-[12px] font-semibold text-ink-2">Plafond FCFA (optionnel)</span>
              <input
                type="number"
                min={0}
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                placeholder="ex: 20000000"
                className="mt-1 w-full rounded-md border border-line bg-white px-2.5 py-2 text-[13px] font-mono"
              />
            </label>
            <label className="block">
              <span className="text-[12px] font-semibold text-ink-2">Début</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 w-full rounded-md border border-line bg-white px-2.5 py-2 text-[13px]"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-[12px] font-semibold text-ink-2">Fin (vide = permanente)</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 w-full rounded-md border border-line bg-white px-2.5 py-2 text-[13px]"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-[12px] font-semibold text-ink-2">Raison / contexte</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder="Ex : déplacement à l'étranger 15-30 mai"
              className="mt-1 w-full rounded-md border border-line bg-surface-alt px-2.5 py-1.5 text-[13px]"
            />
          </label>

          {error && <p className="text-[12.5px] text-rose-700">{error}</p>}
        </div>

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
            disabled={create.isPending}
            className="inline-flex h-9 items-center rounded-md bg-primary-500 px-3.5 text-[12.5px] font-medium text-white hover:bg-primary-600 disabled:opacity-60"
          >
            {create.isPending ? "Création…" : "Créer la délégation"}
          </button>
        </div>
      </div>
    </div>
  );
}
