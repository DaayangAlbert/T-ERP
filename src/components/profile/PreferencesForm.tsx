"use client";

import { useState, useEffect } from "react";
import { Save } from "lucide-react";
import { usePreferences, useUpdatePreferences } from "@/hooks/useDgProfile";
import { clsx } from "clsx";

const WIDGETS = [
  { key: "revenue", label: "Chiffre d'affaires" },
  { key: "margin", label: "Marge consolidée" },
  { key: "treasury", label: "Trésorerie" },
  { key: "validations", label: "Validations en attente" },
  { key: "alerts", label: "Alertes critiques" },
  { key: "objectives", label: "Avancement objectifs" },
  { key: "cashflow", label: "Trésorerie 12 sem." },
  { key: "subsidiaries", label: "Filiales" },
];

export function PreferencesForm() {
  const { data, isLoading } = usePreferences();
  const update = useUpdatePreferences();
  const [widgets, setWidgets] = useState<string[]>([]);
  const [treasuryMin, setTreasuryMin] = useState("");
  const [marginMin, setMarginMin] = useState(12);
  const [dailyEnabled, setDailyEnabled] = useState(false);
  const [dailyTime, setDailyTime] = useState("07:00");
  const [numberFormat, setNumberFormat] = useState<"M_FCFA" | "MD_FCFA" | "RAW">("M_FCFA");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data) {
      setWidgets(Array.isArray(data.dashboardWidgets) ? data.dashboardWidgets : []);
      setTreasuryMin(data.alertThresholds?.treasuryMin ?? "");
      setMarginMin(data.alertThresholds?.marginMin ?? 12);
      setDailyEnabled(data.dailyReportEnabled);
      setDailyTime(data.dailyReportTime ?? "07:00");
      setNumberFormat(data.numberFormat);
    }
  }, [data]);

  if (isLoading) return <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />;

  const toggleWidget = (k: string) => {
    setWidgets((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));
  };

  const submit = async () => {
    await update.mutateAsync({
      dashboardWidgets: widgets,
      alertThresholds: { treasuryMin: treasuryMin || undefined, marginMin },
      dailyReportEnabled: dailyEnabled,
      dailyReportTime: dailyEnabled ? dailyTime : null,
      numberFormat,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-line bg-white p-5 shadow-card">
        <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          Widgets du tableau de bord
        </h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {WIDGETS.map((w) => (
            <label
              key={w.key}
              className={clsx(
                "flex cursor-pointer items-center gap-2 rounded-md border p-2.5 text-[12.5px]",
                widgets.includes(w.key)
                  ? "border-primary-300 bg-primary-50 text-primary-800"
                  : "border-line bg-white text-ink-2 hover:border-primary-200"
              )}
            >
              <input
                type="checkbox"
                checked={widgets.includes(w.key)}
                onChange={() => toggleWidget(w.key)}
                className="h-3.5 w-3.5"
              />
              {w.label}
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-line bg-white p-5 shadow-card">
        <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          Seuils d'alerte
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-[11.5px] font-semibold text-ink-2">Trésorerie minimale (FCFA)</span>
            <input
              type="number"
              value={treasuryMin}
              onChange={(e) => setTreasuryMin(e.target.value)}
              placeholder="ex: 100000000"
              className="mt-1 h-9 w-full rounded-md border border-line bg-white px-2.5 text-[13px] font-mono"
            />
          </label>
          <label className="block">
            <span className="text-[11.5px] font-semibold text-ink-2">Marge minimale (%)</span>
            <input
              type="number"
              step="0.5"
              value={marginMin}
              onChange={(e) => setMarginMin(Number(e.target.value))}
              className="mt-1 h-9 w-full rounded-md border border-line bg-white px-2.5 text-[13px] font-mono"
            />
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-line bg-white p-5 shadow-card">
        <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          Rapport quotidien par email
        </h3>
        <label className="inline-flex items-center gap-2 text-[12.5px]">
          <input
            type="checkbox"
            checked={dailyEnabled}
            onChange={(e) => setDailyEnabled(e.target.checked)}
          />
          Recevoir un résumé chaque matin
        </label>
        {dailyEnabled && (
          <label className="mt-2 block">
            <span className="text-[11.5px] font-semibold text-ink-2">Heure d'envoi</span>
            <input
              type="time"
              value={dailyTime}
              onChange={(e) => setDailyTime(e.target.value)}
              className="mt-1 h-9 w-32 rounded-md border border-line bg-white px-2.5 text-[13px]"
            />
          </label>
        )}
      </section>

      <section className="rounded-xl border border-line bg-white p-5 shadow-card">
        <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          Format des nombres
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {(["M_FCFA", "MD_FCFA", "RAW"] as const).map((f) => (
            <label
              key={f}
              className={
                "cursor-pointer rounded-md border p-3 text-center text-[12.5px] " +
                (f === numberFormat
                  ? "border-primary-500 bg-primary-50 text-primary-800 font-semibold"
                  : "border-line bg-white text-ink-3 hover:border-primary-300")
              }
            >
              <input type="radio" checked={f === numberFormat} onChange={() => setNumberFormat(f)} className="sr-only" />
              {f === "M_FCFA" ? "M FCFA" : f === "MD_FCFA" ? "Md FCFA" : "Brut"}
            </label>
          ))}
        </div>
      </section>

      <div className="flex items-center justify-end gap-3">
        {saved && <span className="text-[12.5px] text-success">✓ Préférences enregistrées</span>}
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
