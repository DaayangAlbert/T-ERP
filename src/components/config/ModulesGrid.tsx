"use client";

import { useState } from "react";
import { Save, Lock } from "lucide-react";
import { useUpdateConfigSection } from "@/hooks/useConfig";
import { MODULE_LABELS, type ModulesSettings } from "@/lib/tenant-settings";
import { clsx } from "clsx";

interface Props {
  initial: ModulesSettings;
}

export function ModulesGrid({ initial }: Props) {
  const [modules, setModules] = useState<ModulesSettings>(initial);
  const [saved, setSaved] = useState(false);
  const update = useUpdateConfigSection();

  const toggle = (key: string) => {
    const meta = MODULE_LABELS[key];
    if (meta?.essential) return; // ne peut pas désactiver les essentiels
    setModules((m) => ({
      ...m,
      [key]: { ...(m[key] ?? { active: false }), active: !(m[key]?.active ?? false) },
    }));
  };

  const submit = async () => {
    await update.mutateAsync({ section: "modules", payload: modules });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const activeCount = Object.values(modules).filter((m) => m?.active).length;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-line bg-white p-3 text-[12.5px] text-ink-3 shadow-card">
        {activeCount} / {Object.keys(MODULE_LABELS).length} modules actifs · les modules{" "}
        <span className="rounded bg-warning/10 px-1.5 py-0.5 text-[10.5px] font-semibold text-warning">essentiels</span>{" "}
        ne peuvent pas être désactivés.
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(MODULE_LABELS).map(([key, meta]) => {
          const isOn = modules[key]?.active ?? false;
          const locked = meta.essential;
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggle(key)}
              disabled={locked}
              className={clsx(
                "flex items-center gap-3 rounded-lg border p-3 text-left transition",
                isOn ? "border-primary-300 bg-primary-50" : "border-line bg-white hover:border-primary-200",
                locked && "opacity-90 cursor-not-allowed"
              )}
            >
              <span
                className={clsx(
                  "grid h-9 w-14 place-items-center rounded-full text-[10px] font-semibold uppercase tracking-wide transition",
                  isOn ? "bg-primary-500 text-white" : "bg-ink-3/15 text-ink-3"
                )}
              >
                {isOn ? "On" : "Off"}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] font-semibold text-ink">{meta.label}</span>
                  {meta.essential && (
                    <span className="inline-flex items-center gap-0.5 rounded bg-warning/10 px-1 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-warning">
                      <Lock className="h-2.5 w-2.5" /> Essentiel
                    </span>
                  )}
                  {meta.premium && (
                    <span className="rounded bg-primary-100 px-1 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-primary-700">
                      Premium
                    </span>
                  )}
                </div>
                {modules[key]?.activatedAt && (
                  <div className="text-[10.5px] text-ink-3">
                    Activé le {new Date(modules[key].activatedAt!).toLocaleDateString("fr-FR")}
                  </div>
                )}
              </div>
            </button>
          );
        })}
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
