"use client";

import { useState } from "react";
import { Save, Trash2, Plus } from "lucide-react";
import { useUpdateConfigSection } from "@/hooks/useConfig";
import type { WorkflowSettings } from "@/lib/tenant-settings";

interface Props {
  initial: WorkflowSettings;
}

const ROLES = ["RH", "DAF", "DG", "TECH_DIRECTOR", "WORKS_DIRECTOR", "SG"];
const TYPES = ["PAYROLL", "EXPENSE", "PURCHASE", "HIRING", "CONTRACT", "LEAVE", "OTHER"];

export function WorkflowEditor({ initial }: Props) {
  const [data, setData] = useState<WorkflowSettings>(initial);
  const [saved, setSaved] = useState(false);
  const update = useUpdateConfigSection();

  const submit = async () => {
    await update.mutateAsync({ section: "workflows", payload: data });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const updateRule = (i: number, patch: Partial<WorkflowSettings["rules"][number]>) => {
    setData((d) => ({
      ...d,
      rules: d.rules.map((r, idx) => (idx === i ? { ...r, ...patch } : r)),
    }));
  };

  const addRule = () =>
    setData((d) => ({
      ...d,
      rules: [...d.rules, { type: "OTHER", label: "Nouveau workflow", threshold: "0", levels: ["DG"] }],
    }));

  const removeRule = (i: number) =>
    setData((d) => ({ ...d, rules: d.rules.filter((_, idx) => idx !== i) }));

  const toggleLevel = (i: number, role: string) => {
    setData((d) => ({
      ...d,
      rules: d.rules.map((r, idx) => {
        if (idx !== i) return r;
        const has = r.levels.includes(role);
        return { ...r, levels: has ? r.levels.filter((x) => x !== role) : [...r.levels, role] };
      }),
    }));
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-line bg-white p-3 text-[12.5px] text-ink-3 shadow-card">
        Définissez pour chaque type de demande le seuil financier de déclenchement et la chaîne de validateurs.
        L'ordre des validateurs cochés respecte la hiérarchie RH → DAF → DG.
      </div>

      <div className="space-y-2">
        {data.rules.map((r, i) => (
          <div key={i} className="rounded-lg border border-line bg-white p-3 shadow-card">
            <div className="grid gap-3 sm:grid-cols-[1fr_2fr_1fr_auto]">
              <select
                value={r.type}
                onChange={(e) => updateRule(i, { type: e.target.value })}
                className="rounded-md border border-line bg-white px-2.5 py-1.5 text-[12.5px]"
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <input
                value={r.label}
                onChange={(e) => updateRule(i, { label: e.target.value })}
                placeholder="Libellé"
                className="rounded-md border border-line bg-white px-2.5 py-1.5 text-[12.5px]"
              />
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={r.threshold}
                  onChange={(e) => updateRule(i, { threshold: e.target.value })}
                  placeholder="Seuil FCFA"
                  className="w-full rounded-md border border-line bg-white px-2.5 py-1.5 text-right text-[12.5px] font-mono"
                />
                <span className="text-[10.5px] text-ink-3">FCFA</span>
              </div>
              <button
                type="button"
                onClick={() => removeRule(i)}
                className="grid h-8 w-8 place-items-center rounded text-rose-700 hover:bg-rose-50"
                aria-label="Supprimer"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              <span className="text-[11px] text-ink-3">Validateurs :</span>
              {ROLES.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => toggleLevel(i, role)}
                  className={
                    "rounded px-1.5 py-0.5 text-[11px] font-semibold transition " +
                    (r.levels.includes(role)
                      ? "bg-primary-500 text-white"
                      : "bg-surface-alt text-ink-3 hover:bg-primary-50")
                  }
                >
                  {role}
                </button>
              ))}
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={addRule}
          className="inline-flex items-center gap-1 rounded-md border border-dashed border-line-2 bg-white px-3 py-2 text-[12.5px] text-ink-3 hover:border-primary-300"
        >
          <Plus className="h-3.5 w-3.5" /> Ajouter un workflow
        </button>
      </div>

      <div className="flex items-center justify-end gap-3">
        {saved && <span className="text-[12.5px] text-success">✓ Enregistré</span>}
        <button
          type="button"
          onClick={submit}
          disabled={update.isPending}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary-500 px-3.5 text-[12.5px] font-medium text-white hover:bg-primary-600 disabled:opacity-60"
        >
          <Save className="h-3.5 w-3.5" /> {update.isPending ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}
