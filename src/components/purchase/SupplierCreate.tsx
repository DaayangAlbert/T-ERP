"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useCreateSupplier } from "@/hooks/usePurchase";
import { TreasuryModal, Field, inputCls } from "@/components/daf/treasury/TreasuryModal";

const CATEGORIES = ["Ciment", "Acier", "Agrégats", "Carburant", "Engins / Location", "Sous-traitance", "Consommables", "Bois", "Électricité", "Plomberie", "Transport", "Assurance", "Autre"];

export function SupplierCreate() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-3 flex justify-end">
      <button type="button" onClick={() => setOpen(true)} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary-600 px-3 text-[12.5px] font-medium text-white hover:bg-primary-700">
        <Plus className="h-3.5 w-3.5" /> Nouveau fournisseur
      </button>
      {open && <SupplierModal onClose={() => setOpen(false)} />}
    </div>
  );
}

function SupplierModal({ onClose }: { onClose: () => void }) {
  const create = useCreateSupplier();
  const [name, setName] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [taxId, setTaxId] = useState("");
  const [rccm, setRccm] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [strategic, setStrategic] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 2) { setError("Nom requis"); return; }
    try {
      await create.mutateAsync({ name: name.trim(), category, taxId: taxId || undefined, rccm: rccm || undefined, phone: phone || undefined, email: email || undefined, city: city || undefined, strategic });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  };

  return (
    <TreasuryModal open onClose={onClose} title="Nouveau fournisseur">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Nom / Raison sociale"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} required /></Field>
        <Field label="Catégorie">
          <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="NIU (n° contribuable)"><input className={inputCls} value={taxId} onChange={(e) => setTaxId(e.target.value)} /></Field>
          <Field label="RCCM"><input className={inputCls} value={rccm} onChange={(e) => setRccm(e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Téléphone"><input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+237…" /></Field>
          <Field label="Ville"><input className={inputCls} value={city} onChange={(e) => setCity(e.target.value)} /></Field>
        </div>
        <Field label="Email"><input className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contact@…" /></Field>
        <label className="flex items-center gap-2 text-[12.5px] text-ink-2">
          <input type="checkbox" checked={strategic} onChange={(e) => setStrategic(e.target.checked)} className="h-4 w-4 accent-primary-600" />
          Fournisseur stratégique
        </label>
        {error && <p className="rounded-md bg-rose-50 px-3 py-2 text-[12px] text-rose-700">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="rounded-md px-3 py-2 text-[13px] font-medium text-ink-3 hover:bg-surface-alt">Annuler</button>
          <button type="submit" disabled={create.isPending} className="rounded-md bg-primary-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-primary-700 disabled:opacity-50">{create.isPending ? "Création…" : "Créer le fournisseur"}</button>
        </div>
      </form>
    </TreasuryModal>
  );
}
