"use client";

import { useState } from "react";
import { useCreateBank, useUpdateBank } from "@/hooks/useDafTreasury";
import { TreasuryModal, Field, inputCls } from "./TreasuryModal";

export interface BankInitial {
  id: string;
  bank: string;
  accountNumber: string;
  accountType: string;
  currency: string;
  balance: string;
  creditLineGranted: string;
  contact: { name?: string; phone?: string; email?: string } | null;
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  CURRENT: "Compte courant",
  ESCROW: "Compte séquestre",
  SAVING: "Compte épargne",
  GUARANTEE: "Compte de garantie",
  FOREIGN_CURRENCY: "Compte en devise",
};

interface Props {
  open: boolean;
  onClose: () => void;
  initial?: BankInitial | null;
}

export function BankAccountFormModal({ open, onClose, initial }: Props) {
  const isEdit = Boolean(initial);
  const create = useCreateBank();
  const update = useUpdateBank();
  const pending = create.isPending || update.isPending;

  const [bank, setBank] = useState(initial?.bank ?? "");
  const [accountNumber, setAccountNumber] = useState(initial?.accountNumber ?? "");
  const [accountType, setAccountType] = useState(initial?.accountType ?? "CURRENT");
  const [currency, setCurrency] = useState(initial?.currency ?? "XAF");
  const [balance, setBalance] = useState(initial?.balance ?? "0");
  const [creditLine, setCreditLine] = useState(initial?.creditLineGranted ?? "0");
  const [contactName, setContactName] = useState(initial?.contact?.name ?? "");
  const [contactPhone, setContactPhone] = useState(initial?.contact?.phone ?? "");
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const payload = {
      bank: bank.trim(),
      accountNumber: accountNumber.trim(),
      accountType,
      currency: currency.trim().toUpperCase(),
      balance: balance.replace(/\D/g, "") || "0",
      creditLineGranted: creditLine.replace(/\D/g, "") || "0",
      contact: { name: contactName || undefined, phone: contactPhone || undefined },
    };
    try {
      if (isEdit && initial) {
        await update.mutateAsync({ id: initial.id, ...payload });
      } else {
        await create.mutateAsync(payload);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  };

  return (
    <TreasuryModal open={open} onClose={onClose} title={isEdit ? "Modifier le compte bancaire" : "Nouveau compte bancaire"}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Banque">
          <input className={inputCls} value={bank} onChange={(e) => setBank(e.target.value)} placeholder="UBA, BICEC, Afriland…" required />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="N° de compte">
            <input className={inputCls} value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} required />
          </Field>
          <Field label="Type de compte">
            <select className={inputCls} value={accountType} onChange={(e) => setAccountType(e.target.value)}>
              {Object.entries(ACCOUNT_TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Solde initial (FCFA)">
            <input className={inputCls} inputMode="numeric" value={balance} onChange={(e) => setBalance(e.target.value)} />
          </Field>
          <Field label="Ligne de crédit accordée (FCFA)">
            <input className={inputCls} inputMode="numeric" value={creditLine} onChange={(e) => setCreditLine(e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Devise">
            <input className={inputCls} value={currency} onChange={(e) => setCurrency(e.target.value)} maxLength={3} />
          </Field>
          <Field label="Contact (gestionnaire)">
            <input className={inputCls} value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Nom" />
          </Field>
        </div>
        <Field label="Téléphone du contact">
          <input className={inputCls} value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+237…" />
        </Field>

        {error && <p className="rounded-md bg-rose-50 px-3 py-2 text-[12px] text-rose-700">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="rounded-md px-3 py-2 text-[13px] font-medium text-ink-3 hover:bg-surface-alt">
            Annuler
          </button>
          <button type="submit" disabled={pending} className="rounded-md bg-primary px-4 py-2 text-[13px] font-semibold text-white hover:bg-primary-600 disabled:opacity-50">
            {pending ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer le compte"}
          </button>
        </div>
      </form>
    </TreasuryModal>
  );
}
