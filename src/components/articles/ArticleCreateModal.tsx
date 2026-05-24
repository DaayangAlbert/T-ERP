"use client";

import { useState } from "react";
import { useCreateArticle, ARTICLE_CATEGORIES, type ArticleItem } from "@/hooks/useArticles";
import { TreasuryModal, Field, inputCls } from "@/components/daf/treasury/TreasuryModal";

const UNITS = ["sac", "tonne", "m³", "m²", "ml", "barre", "unité", "litre", "kg", "rouleau", "carton", "paquet", "jour", "forfait"];

export function ArticleCreateModal({ onClose, onCreated }: { onClose: () => void; onCreated?: (a: ArticleItem) => void }) {
  const create = useCreateArticle();
  const [name, setName] = useState("");
  const [category, setCategory] = useState(ARTICLE_CATEGORIES[0].value);
  const [unit, setUnit] = useState(UNITS[0]);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 2) { setError("Nom requis"); return; }
    try {
      const a = await create.mutateAsync({ name: name.trim(), category, unit, code: code.trim() || undefined });
      onCreated?.(a);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  };

  return (
    <TreasuryModal open onClose={onClose} title="Nouvel article">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Désignation de l'article"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Ciment CPJ 42.5" /></Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Catégorie">
            <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>
              {ARTICLE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="Unité">
            <select className={inputCls} value={unit} onChange={(e) => setUnit(e.target.value)}>
              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Code article (optionnel — généré sinon)"><input className={inputCls} value={code} onChange={(e) => setCode(e.target.value)} placeholder="ART-0001" /></Field>
        {error && <p className="rounded-md bg-rose-50 px-3 py-2 text-[12px] text-rose-700">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="rounded-md px-3 py-2 text-[13px] font-medium text-ink-3 hover:bg-surface-alt">Annuler</button>
          <button type="submit" disabled={create.isPending} className="rounded-md bg-primary-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-primary-700 disabled:opacity-50">{create.isPending ? "Création…" : "Créer l'article"}</button>
        </div>
      </form>
    </TreasuryModal>
  );
}
