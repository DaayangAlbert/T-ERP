"use client";

import { useState } from "react";
import { useCreateSupplier, useUpdateSupplier } from "@/hooks/usePurchase";
import { TreasuryModal, Field, inputCls } from "@/components/daf/treasury/TreasuryModal";

const CATEGORIES = ["Ciment", "Acier", "Agrégats", "Carburant", "Engins / Location", "Sous-traitance", "Consommables", "Bois", "Électricité", "Plomberie", "Transport", "Assurance", "Autre"];

export interface SupplierFormValues {
  id?: string;
  name: string;
  category: string;
  taxId: string | null;
  rccm: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  strategic: boolean;
}

/**
 * Formulaire fournisseur partagé : création (sans `initial`) ou édition
 * (avec `initial.id`). En édition, on envoie tous les champs en PATCH.
 */
export function SupplierFormModal({ initial, onClose }: { initial?: SupplierFormValues; onClose: () => void }) {
  const isEdit = Boolean(initial?.id);
  const create = useCreateSupplier();
  const update = useUpdateSupplier(initial?.id ?? "");
  const pending = create.isPending || update.isPending;

  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState(initial?.category ?? CATEGORIES[0]);
  const [taxId, setTaxId] = useState(initial?.taxId ?? "");
  const [rccm, setRccm] = useState(initial?.rccm ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [strategic, setStrategic] = useState(initial?.strategic ?? false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 2) { setError("Nom requis"); return; }
    const payload = {
      name: name.trim(),
      category,
      taxId: taxId || undefined,
      rccm: rccm || undefined,
      phone: phone || undefined,
      email: email || undefined,
      city: city || undefined,
      strategic,
    };
    try {
      if (isEdit) await update.mutateAsync(payload);
      else await create.mutateAsync(payload);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  };

  return (
    <TreasuryModal open onClose={onClose} title={isEdit ? "Modifier le fournisseur" : "Nouveau fournisseur"}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Nom / Raison sociale"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} required /></Field>
        <Field label="Catégorie">
          <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            {/* Conserve une catégorie existante hors liste (ex: données seedées) */}
            {!CATEGORIES.includes(category) && <option value={category}>{category}</option>}
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
          <button type="submit" disabled={pending} className="rounded-md bg-primary-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-primary-700 disabled:opacity-50">
            {pending ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer le fournisseur"}
          </button>
        </div>
      </form>
    </TreasuryModal>
  );
}
