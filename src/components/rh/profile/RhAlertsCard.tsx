"use client";

import { useEffect, useState } from "react";
import { Bell, Save } from "lucide-react";
import { clsx } from "clsx";
import { useRhAlerts, useUpdateRhAlerts } from "@/hooks/useRhProfile";

const CHANNELS = [
  { key: "IN_APP", label: "Notif in-app" },
  { key: "EMAIL", label: "Email" },
  { key: "SMS", label: "SMS" },
  { key: "PUSH", label: "Push mobile" },
];

export function RhAlertsCard() {
  const { data, isLoading } = useRhAlerts();
  const update = useUpdateRhAlerts();
  const [medicalDays, setMedicalDays] = useState(30);
  const [trainingDays, setTrainingDays] = useState(60);
  const [cddDays, setCddDays] = useState(30);
  const [leaveThr, setLeaveThr] = useState(10);
  const [payrollDeadline, setPayrollDeadline] = useState(3);
  const [channels, setChannels] = useState<string[]>(["IN_APP", "EMAIL"]);

  useEffect(() => {
    if (data) {
      setMedicalDays(data.medicalVisitDaysBefore);
      setTrainingDays(data.trainingRecycleDaysBefore);
      setCddDays(data.cddEndingDaysBefore);
      setLeaveThr(data.leaveAccumulationThreshold);
      setPayrollDeadline(data.payrollInputDeadlineDays);
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
        <h3 className="text-sm font-semibold text-ink">Préférences alertes RH</h3>
      </header>
      <div className="grid gap-3 sm:grid-cols-2">
        <NumberField label="Alerte avant visite médicale (jours)" value={medicalDays} onChange={setMedicalDays} max={120} />
        <NumberField label="Alerte avant recyclage CACES (jours)" value={trainingDays} onChange={setTrainingDays} max={120} />
        <NumberField label="Alerte avant fin CDD (jours)" value={cddDays} onChange={setCddDays} max={90} />
        <NumberField label="Seuil cumul demandes congés" value={leaveThr} onChange={setLeaveThr} max={50} />
        <NumberField label="Deadline saisie paie (J-X)" value={payrollDeadline} onChange={setPayrollDeadline} max={15} />
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
                "rounded-md border px-2.5 py-1.5 text-[12px] font-semibold",
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
          onClick={() =>
            update.mutate({
              medicalVisitDaysBefore: medicalDays,
              trainingRecycleDaysBefore: trainingDays,
              cddEndingDaysBefore: cddDays,
              leaveAccumulationThreshold: leaveThr,
              payrollInputDeadlineDays: payrollDeadline,
              channels,
            })
          }
          className="inline-flex h-8 items-center gap-1 rounded-md bg-primary-500 px-3 text-[12.5px] font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
        >
          <Save className="h-3.5 w-3.5" />
          {update.isPending ? "Enregistrement..." : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}

function NumberField({ label, value, onChange, max }: { label: string; value: number; onChange: (n: number) => void; max: number }) {
  return (
    <label className="block">
      <div className="text-[11px] uppercase tracking-wide text-ink-3">{label}</div>
      <input
        type="number"
        min={1}
        max={max}
        value={value}
        onChange={(e) => onChange(Math.max(1, Math.min(max, Number(e.target.value))))}
        className="mt-1 h-9 w-full rounded-md border border-line bg-white px-2 font-mono text-[13px]"
      />
    </label>
  );
}
