"use client";

import { LogOut, AlertTriangle } from "lucide-react";
import { useStcSimulation } from "@/hooks/useDgProfile";
import { formatFCFA } from "@/lib/format";

export function StcSimulator() {
  const { data, isLoading } = useStcSimulation();
  if (isLoading || !data) return <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-warning/40 bg-warning/5 p-3 text-[12.5px] text-warning">
        <AlertTriangle className="mr-1 inline h-4 w-4" />
        {data.note}
      </div>

      <section className="rounded-xl border border-primary-200 bg-primary-50/40 p-5">
        <h3 className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-primary-800">
          <LogOut className="h-3.5 w-3.5" /> Simulation Solde de Tout Compte
        </h3>
        <p className="mb-4 text-[12.5px] text-primary-700">
          {data.user.name} · Ancienneté {data.user.seniorityYears} an{data.user.seniorityYears > 1 ? "s" : ""} · Salaire moyen mensuel{" "}
          <strong>{formatFCFA(BigInt(data.monthlyAvg))}</strong>
        </p>

        <ul className="space-y-2">
          <Component
            label={`Indemnité de rupture (${data.components.ruptureMonths} mois)`}
            value={data.components.ruptureIndemnity}
          />
          <Component label="Solde de congés non pris (25 jours)" value={data.components.unpaidLeave} />
          <Component label="Préavis (3 mois)" value={data.components.noticePeriod} />
          <Component label="Bonus prorata année en cours" value={data.components.bonusProRata} />
        </ul>

        <div className="mt-4 flex items-center justify-between rounded-md border-2 border-primary-300 bg-white px-4 py-3">
          <span className="text-[13px] font-bold text-primary-800">TOTAL STC ESTIMÉ</span>
          <span className="font-mono text-[20px] font-bold text-primary-800">{formatFCFA(BigInt(data.total))}</span>
        </div>
      </section>
    </div>
  );
}

function Component({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-center justify-between rounded-md border border-line bg-white px-3 py-2 text-[12.5px]">
      <span className="text-ink-2">{label}</span>
      <span className="font-mono font-semibold text-ink">{formatFCFA(BigInt(value))}</span>
    </li>
  );
}
