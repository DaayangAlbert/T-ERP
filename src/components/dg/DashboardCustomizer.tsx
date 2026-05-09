"use client";

import { useEffect, useState } from "react";
import { X, Sliders } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface WidgetOption {
  id: string;
  label: string;
  description: string;
  defaultEnabled: boolean;
  group: "Pilotage" | "Production" | "Ressources humaines";
}

// Liste indicative — la persistance des préférences (table dg_settings) est livrée en fn 1.5.
const WIDGETS: WidgetOption[] = [
  { id: "kpis-primary", label: "KPIs principaux", description: "CA, marge, trésorerie, effectif", defaultEnabled: true, group: "Pilotage" },
  { id: "kpis-secondary", label: "KPIs secondaires", description: "Carnet, prévisionnel, HSE, satisfaction", defaultEnabled: true, group: "Pilotage" },
  { id: "daily-stats", label: "Mes chiffres du jour", description: "Bandeau violet 6 mini-stats", defaultEnabled: true, group: "Pilotage" },
  { id: "revenue-chart", label: "CA & marge 12 mois", description: "Barres + ligne", defaultEnabled: true, group: "Production" },
  { id: "donut", label: "Répartition par type", description: "Donut SiteType", defaultEnabled: true, group: "Production" },
  { id: "weekly-trend", label: "Tendance hebdomadaire", description: "Aire 7 jours", defaultEnabled: true, group: "Production" },
  { id: "alerts", label: "Alertes système", description: "DRIFTING, AT_RISK, DIPE", defaultEnabled: true, group: "Pilotage" },
  { id: "validations", label: "Validations en attente", description: "Bulletins à approuver", defaultEnabled: true, group: "Pilotage" },
  { id: "top-sites", label: "Top chantiers", description: "Avancement & marge top 5", defaultEnabled: true, group: "Production" },
  { id: "headcount-breakdown", label: "Répartition effectifs", description: "Cadres / ETAM / OQ / OS / Manœuvres", defaultEnabled: false, group: "Ressources humaines" },
];

export function DashboardCustomizer({ open, onClose }: Props) {
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(WIDGETS.map((w) => [w.id, w.defaultEnabled]))
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const groups = ["Pilotage", "Production", "Ressources humaines"] as const;
  const enabledCount = Object.values(enabled).filter(Boolean).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/55 px-4 py-8 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dg-customizer-title"
    >
      <div className="w-full max-w-[560px] animate-modal-slide-up overflow-hidden rounded-xl bg-white shadow-2xl">
        <div
          className="flex items-center justify-between px-5 py-4 text-white"
          style={{ background: "linear-gradient(135deg,#2A1B3D 0%,#7E22CE 100%)" }}
        >
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4" />
            <div>
              <h3 id="dg-customizer-title" className="text-base font-semibold">
                Personnaliser mon tableau de bord
              </h3>
              <p className="text-[11px] text-primary-100">
                {enabledCount} / {WIDGETS.length} widgets affichés
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="grid h-8 w-8 place-items-center rounded-md text-white/80 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          {groups.map((group) => (
            <section key={group}>
              <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                {group}
              </h4>
              <ul className="space-y-1.5">
                {WIDGETS.filter((w) => w.group === group).map((w) => (
                  <li key={w.id}>
                    <label className="flex cursor-pointer items-start gap-3 rounded-md border border-line bg-white p-3 transition hover:border-primary-300">
                      <input
                        type="checkbox"
                        checked={Boolean(enabled[w.id])}
                        onChange={(e) =>
                          setEnabled((prev) => ({ ...prev, [w.id]: e.target.checked }))
                        }
                        className="mt-0.5 h-4 w-4 rounded border-line-2 text-primary-500 focus:ring-primary-500"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-semibold text-ink">{w.label}</span>
                        <span className="block text-[11.5px] text-ink-3">{w.description}</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <div className="rounded-md border border-dashed border-primary-200 bg-primary-50/40 p-3 text-[11.5px] text-primary-800">
            La persistance des préférences (table <code className="font-mono">dg_settings</code>) et le réordonnancement par drag-and-drop arriveront avec la fonction 1.5.
          </div>

          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <button
              onClick={onClose}
              className="h-9 rounded-md border border-line-2 bg-white px-3 text-sm text-ink-2 hover:border-primary-300"
            >
              Fermer
            </button>
            <button
              disabled
              title="Persistance disponible en fn 1.5"
              className="h-9 rounded-md bg-primary-500 px-3 text-sm font-medium text-white opacity-60"
            >
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
