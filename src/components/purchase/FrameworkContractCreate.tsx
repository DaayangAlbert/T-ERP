"use client";

import { useState } from "react";
import { ContractStatus } from "@prisma/client";
import { useCreateFrameworkContract, useSuppliers } from "@/hooks/usePurchase";
import { TreasuryModal, Field, inputCls } from "@/components/daf/treasury/TreasuryModal";
import { formatFCFA } from "@/lib/format";

const onlyDigits = (s: string) => s.replace(/\D/g, "");
const today = () => new Date().toISOString().slice(0, 10);
const inOneYear = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
};

export function FrameworkContractCreate({ onClose }: { onClose: () => void }) {
  const create = useCreateFrameworkContract();
  const { data: suppliers } = useSuppliers();

  const [supplierId, setSupplierId] = useState("");
  const [reference, setReference] = useState(`CC-${new Date().getFullYear()}-`);
  const [subject, setSubject] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState(inOneYear());
  const [status, setStatus] = useState<ContractStatus>(ContractStatus.ACTIVE);
  const [paymentTerms, setPaymentTerms] = useState("");
  const [penalties, setPenalties] = useState("");
  const [error, setError] = useState<string | null>(null);

  const amountNum = onlyDigits(maxAmount);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!supplierId) { setError("Choisissez un fournisseur"); return; }
    if (reference.trim().length < 2) { setError("Référence requise"); return; }
    if (subject.trim().length < 3) { setError("Objet requis"); return; }
    if (!amountNum || amountNum === "0") { setError("Plafond requis"); return; }
    if (new Date(endDate) <= new Date(startDate)) { setError("La date de fin doit suivre la date de début"); return; }
    const conditions: { paymentTerms?: number; penalties?: string } = {};
    if (paymentTerms) conditions.paymentTerms = Number(paymentTerms);
    if (penalties.trim()) conditions.penalties = penalties.trim();
    try {
      await create.mutateAsync({
        supplierId,
        reference: reference.trim(),
        subject: subject.trim(),
        maxAmount: amountNum,
        startDate,
        endDate,
        status,
        conditions: Object.keys(conditions).length ? conditions : undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  };

  return (
    <TreasuryModal open onClose={onClose} title="Nouveau contrat-cadre">
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Fournisseur">
            <select className={inputCls} value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required>
              <option value="">Sélectionner…</option>
              {(suppliers?.items ?? []).filter((s) => !s.blocked).map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.category})</option>
              ))}
            </select>
          </Field>
          <Field label="Référence"><input className={inputCls} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="CC-2026-001" /></Field>
        </div>
        <Field label="Objet du contrat"><input className={inputCls} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Ex: Fourniture ciment — exercice 2026" /></Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Plafond (FCFA)">
            <input className={inputCls} inputMode="numeric" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} placeholder="Ex: 50 000 000" />
          </Field>
          <Field label="Statut">
            <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value as ContractStatus)}>
              <option value={ContractStatus.ACTIVE}>Actif</option>
              <option value={ContractStatus.DRAFT}>Brouillon</option>
            </select>
          </Field>
        </div>
        {amountNum && amountNum !== "0" && (
          <p className="rounded-md bg-surface-alt px-3 py-1.5 text-[12px] text-ink-2">Plafond : <strong>{formatFCFA(BigInt(amountNum), { scale: "raw" })}</strong></p>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Date de début"><input type="date" className={inputCls} value={startDate} onChange={(e) => setStartDate(e.target.value)} /></Field>
          <Field label="Date de fin"><input type="date" className={inputCls} value={endDate} onChange={(e) => setEndDate(e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Délai de paiement (jours, optionnel)"><input className={inputCls} inputMode="numeric" value={paymentTerms} onChange={(e) => setPaymentTerms(onlyDigits(e.target.value))} placeholder="Ex: 60" /></Field>
          <Field label="Pénalités (optionnel)"><input className={inputCls} value={penalties} onChange={(e) => setPenalties(e.target.value)} placeholder="Ex: 0,5%/jour de retard" /></Field>
        </div>
        {error && <p className="rounded-md bg-rose-50 px-3 py-2 text-[12px] text-rose-700">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="rounded-md px-3 py-2 text-[13px] font-medium text-ink-3 hover:bg-surface-alt">Annuler</button>
          <button type="submit" disabled={create.isPending} className="rounded-md bg-primary-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-primary-700 disabled:opacity-50">{create.isPending ? "Création…" : "Créer le contrat"}</button>
        </div>
      </form>
    </TreasuryModal>
  );
}
