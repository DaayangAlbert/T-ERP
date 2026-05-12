"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wrench, Plus, X } from "lucide-react";
import { SectionCard } from "./SectionCard";

export function SkillsEditor({ initialSkills }: { initialSkills: string[] }) {
  const router = useRouter();
  const [skills, setSkills] = useState(initialSkills);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(next: string[]) {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/cand/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidateSkills: next }),
    });
    setSaving(false);
    if (!res.ok) {
      setError("Erreur de sauvegarde");
      return;
    }
    router.refresh();
  }

  function addSkill() {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (skills.includes(trimmed)) {
      setInput("");
      return;
    }
    const next = [...skills, trimmed];
    setSkills(next);
    setInput("");
    void save(next);
  }

  function removeSkill(s: string) {
    const next = skills.filter((x) => x !== s);
    setSkills(next);
    void save(next);
  }

  return (
    <SectionCard
      title="Compétences"
      icon={<Wrench className="h-4 w-4" />}
      action={
        saving ? <span className="text-xs text-ink-3">Sauvegarde…</span> : null
      }
    >
      <div className="flex flex-wrap gap-2">
        {skills.length === 0 ? (
          <p className="text-xs text-ink-3">
            Aucune compétence ajoutée. Tapez ci-dessous pour ajouter.
          </p>
        ) : null}
        {skills.map((s) => (
          <span
            key={s}
            className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700"
          >
            {s}
            <button
              type="button"
              onClick={() => removeSkill(s)}
              className="rounded-full p-0.5 hover:bg-primary-100"
              aria-label={`Retirer ${s}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addSkill();
            }
          }}
          placeholder="Ex: Suivi de chantier, AutoCAD…"
          className="flex-1 rounded-md border border-line-2 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          type="button"
          onClick={addSkill}
          disabled={!input.trim()}
          className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-xs font-medium text-white shadow-brand hover:bg-primary-600 disabled:opacity-60"
        >
          <Plus className="h-3.5 w-3.5" />
          Ajouter
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
