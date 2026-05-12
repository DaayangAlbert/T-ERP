"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Target, Save } from "lucide-react";
import { SectionCard } from "./SectionCard";

const CONTRACT_OPTIONS = [
  { value: "", label: "Indifférent" },
  { value: "CDI", label: "CDI" },
  { value: "CDD", label: "CDD" },
  { value: "JOURNALIER", label: "Journalier" },
  { value: "INTERIM", label: "Intérim" },
  { value: "STAGE", label: "Stage" },
] as const;

export interface SearchPrefsData {
  desiredJob: string | null;
  desiredContractType: string | null;
  desiredLocation: string | null;
  desiredSalaryMin: number | null;
  desiredSalaryMax: number | null;
  availability: string | null;
  mobilityDailyTravel: boolean;
  mobilityMissions: boolean;
  mobilityExpatriation: boolean;
}

export function SearchPreferencesSection({
  initial,
}: {
  initial: SearchPrefsData;
}) {
  const router = useRouter();
  const [state, setState] = useState<SearchPrefsData>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = JSON.stringify(state) !== JSON.stringify(initial);

  function update<K extends keyof SearchPrefsData>(k: K, v: SearchPrefsData[K]) {
    setState((s) => ({ ...s, [k]: v }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    const body = {
      desiredJob: state.desiredJob || null,
      desiredContractType: state.desiredContractType || null,
      desiredLocation: state.desiredLocation || null,
      desiredSalaryMin: state.desiredSalaryMin,
      desiredSalaryMax: state.desiredSalaryMax,
      availability: state.availability || null,
      mobilityDailyTravel: state.mobilityDailyTravel,
      mobilityMissions: state.mobilityMissions,
      mobilityExpatriation: state.mobilityExpatriation,
    };
    const res = await fetch("/api/cand/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Erreur de sauvegarde");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <SectionCard
      title="Ma recherche"
      icon={<Target className="h-4 w-4" />}
      action={
        dirty ? (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white shadow-brand hover:bg-primary-600 disabled:opacity-60"
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? "Sauvegarde…" : "Enregistrer"}
          </button>
        ) : saved ? (
          <span className="text-xs text-emerald-700">✓ Enregistré</span>
        ) : null
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Poste recherché">
          <input
            type="text"
            value={state.desiredJob ?? ""}
            placeholder="Ex: Conducteur de Travaux"
            onChange={(e) => update("desiredJob", e.target.value)}
            className="mt-1 w-full rounded-md border border-line-2 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </Field>
        <Field label="Type de contrat">
          <select
            value={state.desiredContractType ?? ""}
            onChange={(e) =>
              update("desiredContractType", e.target.value || null)
            }
            className="mt-1 w-full rounded-md border border-line-2 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {CONTRACT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Lieu souhaité">
          <input
            type="text"
            value={state.desiredLocation ?? ""}
            placeholder="Ex: Yaoundé, Douala"
            onChange={(e) => update("desiredLocation", e.target.value)}
            className="mt-1 w-full rounded-md border border-line-2 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </Field>
        <Field label="Disponibilité">
          <input
            type="text"
            value={state.availability ?? ""}
            placeholder="Ex: Immédiate, sous 1 mois"
            onChange={(e) => update("availability", e.target.value)}
            className="mt-1 w-full rounded-md border border-line-2 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </Field>
        <Field label="Salaire min (FCFA)">
          <input
            type="number"
            min="0"
            step="50000"
            value={state.desiredSalaryMin ?? ""}
            onChange={(e) =>
              update(
                "desiredSalaryMin",
                e.target.value ? parseInt(e.target.value, 10) : null,
              )
            }
            className="mt-1 w-full rounded-md border border-line-2 bg-white px-3 py-2 text-sm tabular-nums focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </Field>
        <Field label="Salaire max (FCFA)">
          <input
            type="number"
            min="0"
            step="50000"
            value={state.desiredSalaryMax ?? ""}
            onChange={(e) =>
              update(
                "desiredSalaryMax",
                e.target.value ? parseInt(e.target.value, 10) : null,
              )
            }
            className="mt-1 w-full rounded-md border border-line-2 bg-white px-3 py-2 text-sm tabular-nums focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </Field>
      </div>

      <div className="mt-4 border-t border-line pt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-3">
          Mobilité acceptée
        </p>
        <div className="mt-2 flex flex-wrap gap-4 text-sm">
          <Checkbox
            checked={state.mobilityDailyTravel}
            onChange={(v) => update("mobilityDailyTravel", v)}
            label="Déplacements quotidiens"
          />
          <Checkbox
            checked={state.mobilityMissions}
            onChange={(v) => update("mobilityMissions", v)}
            label="Missions (1-3 semaines)"
          />
          <Checkbox
            checked={state.mobilityExpatriation}
            onChange={(v) => update("mobilityExpatriation", v)}
            label="Expatriation"
          />
        </div>
      </div>

      {error ? (
        <p className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </p>
      ) : null}
    </SectionCard>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-ink-2">{label}</span>
      {children}
    </label>
  );
}

function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-ink-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-line text-primary focus:ring-primary"
      />
      {label}
    </label>
  );
}
