"use client";

import { useTotalCompensation } from "@/hooks/useDgProfile";
import { formatFCFA } from "@/lib/format";

export function TotalCompensationPyramid() {
  const year = new Date().getFullYear();
  const { data, isLoading } = useTotalCompensation(year);
  if (isLoading || !data) return <div className="h-72 animate-pulse rounded-xl bg-surface-alt" />;

  const components = [
    { label: "Salaire de base annuel", value: BigInt(data.baseSalaryAnnual), color: "bg-primary-700" },
    { label: "Bonus performance (réalisé)", value: BigInt(data.variableBonusActual), color: "bg-primary-500" },
    { label: "Avantages en nature", value: BigInt(data.benefitsAnnual), color: "bg-primary-400" },
    { label: "Indemnités (transport, représentation)", value: BigInt(data.indemnitiesAnnual), color: "bg-info" },
    { label: "Cotisations patronales", value: BigInt(data.employerChargesAnnual), color: "bg-warning" },
  ];

  const total = BigInt(data.totalEmployerCost);
  const totalNMinus1 = BigInt(data.comparison.totalEmployerCost);
  const variation = total > 0n ? Number(((total - totalNMinus1) * 1000n) / total) / 10 : 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Coût employeur annuel" value={formatFCFA(total)} highlight />
        <Stat label={`vs ${data.comparison.year}`} value={`${variation > 0 ? "+" : ""}${variation.toFixed(1).replace(".", ",")} %`} />
        <Stat label="Bonus cible" value={formatFCFA(BigInt(data.variableBonusTarget))} />
      </div>

      <section className="rounded-xl border border-line bg-white p-5 shadow-card">
        <h3 className="mb-4 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          Pyramide rémunération globale {year}
        </h3>
        <ul className="space-y-2.5">
          {components.map((c) => {
            const pct = total > 0n ? Number((c.value * 1000n) / total) / 10 : 0;
            return (
              <li key={c.label}>
                <div className="mb-1 flex items-center justify-between text-[12.5px]">
                  <span className="text-ink-2">{c.label}</span>
                  <span className="font-mono font-semibold text-ink">{formatFCFA(c.value)}</span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-surface-alt">
                  <div className={`h-full ${c.color}`} style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-0.5 text-right text-[10.5px] text-ink-3">{pct.toFixed(1).replace(".", ",")} %</div>
              </li>
            );
          })}
        </ul>
        <div className="mt-4 flex items-center justify-between rounded-md border-2 border-primary-300 bg-primary-50 px-4 py-3">
          <span className="text-[13px] font-bold text-primary-800">TOTAL CHARGE EMPLOYEUR</span>
          <span className="font-mono text-[20px] font-bold text-primary-800">{formatFCFA(total)}</span>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={"rounded-lg border p-3 shadow-card " + (highlight ? "border-primary-300 bg-primary-50" : "border-line bg-white")}>
      <div className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">{label}</div>
      <div className={"mt-1 font-mono text-[18px] font-bold " + (highlight ? "text-primary-800" : "text-ink")}>{value}</div>
    </div>
  );
}
