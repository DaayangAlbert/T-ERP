"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Languages, Plus, X } from "lucide-react";
import { SectionCard } from "./SectionCard";

export interface LanguageItem {
  name: string;
  level: "natif" | "courant" | "intermediaire" | "notions";
}

const LEVEL_LABELS: Record<LanguageItem["level"], string> = {
  natif: "Natif",
  courant: "Courant",
  intermediaire: "Intermédiaire",
  notions: "Notions",
};

const LEVEL_CLS: Record<LanguageItem["level"], string> = {
  natif: "bg-emerald-100 text-emerald-700",
  courant: "bg-blue-100 text-blue-700",
  intermediaire: "bg-amber-100 text-amber-800",
  notions: "bg-ink-3/10 text-ink-2",
};

export function LanguagesEditor({
  initialLanguages,
}: {
  initialLanguages: LanguageItem[];
}) {
  const router = useRouter();
  const [languages, setLanguages] = useState<LanguageItem[]>(initialLanguages);
  const [name, setName] = useState("");
  const [level, setLevel] = useState<LanguageItem["level"]>("courant");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(next: LanguageItem[]) {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/cand/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidateLanguages: next }),
    });
    setSaving(false);
    if (!res.ok) {
      setError("Erreur de sauvegarde");
      return;
    }
    router.refresh();
  }

  function add() {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (languages.some((l) => l.name.toLowerCase() === trimmed.toLowerCase())) {
      setName("");
      return;
    }
    const next = [...languages, { name: trimmed, level }];
    setLanguages(next);
    setName("");
    void save(next);
  }

  function remove(idx: number) {
    const next = languages.filter((_, i) => i !== idx);
    setLanguages(next);
    void save(next);
  }

  return (
    <SectionCard
      title="Langues"
      icon={<Languages className="h-4 w-4" />}
      action={
        saving ? <span className="text-xs text-ink-3">Sauvegarde…</span> : null
      }
    >
      {languages.length === 0 ? (
        <p className="text-xs text-ink-3">Aucune langue renseignée.</p>
      ) : (
        <ul className="divide-y divide-line">
          {languages.map((l, idx) => (
            <li key={idx} className="flex items-center justify-between py-2">
              <span className="text-sm font-medium text-ink">{l.name}</span>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${LEVEL_CLS[l.level]}`}
                >
                  {LEVEL_LABELS[l.level]}
                </span>
                <button
                  type="button"
                  onClick={() => remove(idx)}
                  className="rounded p-1 text-ink-3 hover:bg-surface-alt hover:text-rose-600"
                  aria-label={`Retirer ${l.name}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Langue (ex: Français)"
          className="rounded-md border border-line-2 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value as LanguageItem["level"])}
          className="rounded-md border border-line-2 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {(Object.keys(LEVEL_LABELS) as LanguageItem["level"][]).map((lv) => (
            <option key={lv} value={lv}>
              {LEVEL_LABELS[lv]}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={add}
          disabled={!name.trim()}
          className="inline-flex items-center justify-center gap-1 rounded-md bg-primary px-3 py-2 text-xs font-medium text-white shadow-brand hover:bg-primary-600 disabled:opacity-60"
        >
          <Plus className="h-3.5 w-3.5" /> Ajouter
        </button>
      </div>

      {error ? (
        <p className="mt-2 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </p>
      ) : null}
    </SectionCard>
  );
}
