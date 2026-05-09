import { formatFCFA, formatPercent } from "@/lib/format";
import type { SitesSummary } from "@/hooks/useSites";

interface Props {
  summary: SitesSummary;
}

export function SitesKpis({ summary }: Props) {
  const budget = formatFCFA(BigInt(summary.totalBudget), { splitUnit: true });

  return (
    <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
      <Kpi
        label="Chantiers actifs"
        value={summary.activeCount.toString()}
        meta="Hors archivés"
      />
      <Kpi
        label="Budget total"
        value={budget.value}
        unit={budget.unit}
        meta="Cumulé tenant"
      />
      <Kpi
        label="Marge moyenne"
        value={formatPercent(summary.avgMargin)}
        meta="Pondérée"
        valueClass={summary.avgMargin < 10 ? "text-danger" : summary.avgMargin < 15 ? "text-warning" : "text-success"}
      />
      <Kpi
        label="Alertes"
        value={summary.alertsCount.toString()}
        meta="DRIFTING + AT_RISK"
        valueClass={summary.alertsCount > 0 ? "text-warning" : "text-success"}
      />
    </div>
  );
}

function Kpi({
  label,
  value,
  unit,
  meta,
  valueClass,
}: {
  label: string;
  value: string;
  unit?: string;
  meta?: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-white p-4 shadow-card">
      <div className="text-[11px] font-medium uppercase tracking-wide text-ink-3">{label}</div>
      <div className="mt-2 font-semibold leading-none">
        <span className={`font-mono text-[22px] tabular-nums ${valueClass ?? "text-ink"}`}>
          {value}
        </span>
        {unit && <span className="ml-1 text-[12px] font-medium text-ink-3">{unit}</span>}
      </div>
      {meta && <div className="mt-2 text-[11.5px] text-ink-3">{meta}</div>}
    </div>
  );
}
