"use client";

import { useEffect, useState } from "react";
import { Bell, Save } from "lucide-react";
import { clsx } from "clsx";
import { useAlertPreferences, useUpdateAlertPreferences } from "@/hooks/useDafProfile";

const CHANNELS = [
  { key: "IN_APP", label: "Notif in-app" },
  { key: "EMAIL", label: "Email" },
  { key: "SMS", label: "SMS" },
  { key: "PUSH", label: "Push mobile" },
];

function fmt(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(n);
}

export function AlertPreferencesCard() {
  const { data, isLoading } = useAlertPreferences();
  const update = useUpdateAlertPreferences();
  const [treasuryThreshold, setTreasuryThreshold] = useState(50_000_000);
  const [poAlertThreshold, setPoAlertThreshold] = useState(20_000_000);
  const [dsoIncreaseAlert, setDsoIncreaseAlert] = useState(true);
  const [taxDeadlineDaysBefore, setTaxDeadlineDaysBefore] = useState(3);
  const [channels, setChannels] = useState<string[]>(["IN_APP", "EMAIL"]);

  useEffect(() => {
    if (data) {
      setTreasuryThreshold(data.treasuryThreshold);
      setPoAlertThreshold(data.poAlertThreshold);
      setDsoIncreaseAlert(data.dsoIncreaseAlert);
      setTaxDeadlineDaysBefore(data.taxDeadlineDaysBefore);
      setChannels(data.channels);
    }
  }, [data]);

  if (isLoading || !data) {
    return <div className="h-48 animate-pulse rounded-xl bg-surface-alt" />;
  }

  const toggleChannel = (k: string) => setChannels((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));

  return (
    <div className="space-y-3 rounded-xl border border-line bg-white p-4">
      <header className="flex items-center gap-2">
        <Bell className="h-4 w-4 text-primary-600" />
        <h3 className="text-sm font-semibold text-ink">Préférences alertes financières</h3>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-[11px] uppercase tracking-wide text-ink-3">Trésorerie sous seuil</label>
          <div className="mt-1 flex items-center gap-2">
            <input
              type="text"
              value={treasuryThreshold}
              onChange={(e) => setTreasuryThreshold(Number(e.target.value.replace(/\D/g, "") || "0"))}
              className="h-9 w-full rounded-md border border-line bg-white px-2 font-mono text-[13px]"
            />
            <span className="text-[11px] text-ink-3">FCFA</span>
          </div>
          <div className="mt-1 text-[11px] text-ink-3">Alerte si la trésorerie consolidée descend sous {fmt(treasuryThreshold)}.</div>
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-wide text-ink-3">BC dépassant ce seuil</label>
          <div className="mt-1 flex items-center gap-2">
            <input
              type="text"
              value={poAlertThreshold}
              onChange={(e) => setPoAlertThreshold(Number(e.target.value.replace(/\D/g, "") || "0"))}
              className="h-9 w-full rounded-md border border-line bg-white px-2 font-mono text-[13px]"
            />
            <span className="text-[11px] text-ink-3">FCFA</span>
          </div>
          <div className="mt-1 text-[11px] text-ink-3">Alerte immédiate dès qu&apos;un BC déposé dépasse {fmt(poAlertThreshold)}.</div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex items-start gap-2 rounded-md border border-line bg-surface-alt p-3 text-[12.5px]">
          <input
            type="checkbox"
            checked={dsoIncreaseAlert}
            onChange={(e) => setDsoIncreaseAlert(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-primary-500"
          />
          <span>
            <span className="font-semibold text-ink">DSO en hausse</span>
            <span className="block text-[11px] text-ink-3">Notifié si DSO augmente de plus de 5 jours d&apos;une période à l&apos;autre.</span>
          </span>
        </label>
        <div>
          <label className="text-[11px] uppercase tracking-wide text-ink-3">Rappel échéance fiscale (J-X)</label>
          <input
            type="number"
            min={1}
            max={30}
            value={taxDeadlineDaysBefore}
            onChange={(e) => setTaxDeadlineDaysBefore(Number(e.target.value))}
            className="mt-1 h-9 w-full rounded-md border border-line bg-white px-2 font-mono text-[13px]"
          />
        </div>
      </div>

      <div>
        <div className="text-[11px] uppercase tracking-wide text-ink-3">Canaux préférés</div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {CHANNELS.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => toggleChannel(c.key)}
              className={clsx(
                "rounded-md border px-2.5 py-1.5 text-[12px] font-semibold transition",
                channels.includes(c.key)
                  ? "border-primary-500 bg-primary-50 text-primary-700"
                  : "border-line bg-white text-ink-3 hover:bg-surface-alt"
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-end">
        <button
          type="button"
          disabled={update.isPending}
          onClick={() => update.mutate({ treasuryThreshold, poAlertThreshold, dsoIncreaseAlert, taxDeadlineDaysBefore, channels })}
          className="inline-flex h-8 items-center gap-1 rounded-md bg-primary-500 px-3 text-[12.5px] font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
        >
          <Save className="h-3.5 w-3.5" />
          {update.isPending ? "Enregistrement..." : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}
