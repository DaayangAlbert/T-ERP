"use client";

import { AlertOctagon, AlertTriangle, Info } from "lucide-react";
import { clsx } from "clsx";
import { useAccountingAnomalies, type AnomalyItem } from "@/hooks/useDafAccounting";
import { formatFCFA } from "@/lib/format";

interface Props {
  period: string;
}

const ICONS: Record<AnomalyItem["severity"], React.ReactNode> = {
  danger: <AlertOctagon className="h-4 w-4 text-danger" />,
  warning: <AlertTriangle className="h-4 w-4 text-warning" />,
  info: <Info className="h-4 w-4 text-info" />,
};

const SEVERITY_CLS: Record<AnomalyItem["severity"], string> = {
  danger: "border-danger/30 bg-danger/5",
  warning: "border-warning/30 bg-warning/5",
  info: "border-info/30 bg-info/5",
};

export function AnomaliesPanel({ period }: Props) {
  const { data, isLoading } = useAccountingAnomalies(period);

  if (isLoading || !data) {
    return <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />;
  }

  if (data.total === 0) {
    return (
      <section className="rounded-xl border border-success/30 bg-success/5 p-4 text-[13px] text-success">
        ✓ Aucune anomalie détectée sur la période {data.period}.
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-line bg-white p-4 shadow-card">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          Contrôles automatiques — {data.total} anomalie{data.total > 1 ? "s" : ""}
        </h3>
        <div className="flex items-center gap-2 text-[11px]">
          {data.countsBySeverity.danger > 0 && (
            <span className="inline-flex items-center gap-1 rounded bg-danger/10 px-1.5 py-0.5 font-semibold text-danger">
              <AlertOctagon className="h-3 w-3" /> {data.countsBySeverity.danger} bloquant{data.countsBySeverity.danger > 1 ? "s" : ""}
            </span>
          )}
          {data.countsBySeverity.warning > 0 && (
            <span className="inline-flex items-center gap-1 rounded bg-warning/10 px-1.5 py-0.5 font-semibold text-warning">
              <AlertTriangle className="h-3 w-3" /> {data.countsBySeverity.warning} à vérifier
            </span>
          )}
          {data.countsBySeverity.info > 0 && (
            <span className="inline-flex items-center gap-1 rounded bg-info/10 px-1.5 py-0.5 font-semibold text-info">
              <Info className="h-3 w-3" /> {data.countsBySeverity.info} info
            </span>
          )}
        </div>
      </header>

      <ul className="space-y-2">
        {data.items.map((a) => (
          <li
            key={a.id}
            className={clsx(
              "flex items-start gap-2 rounded-md border p-2.5 text-[12.5px]",
              SEVERITY_CLS[a.severity]
            )}
          >
            <span className="mt-0.5 flex-shrink-0">{ICONS[a.severity]}</span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-ink">{a.title}</span>
                {a.reference && (
                  <span className="font-mono text-[10.5px] text-ink-3">{a.reference}</span>
                )}
              </div>
              <p className="mt-0.5 text-[11.5px] text-ink-2">{a.detail}</p>
            </div>
            {a.amount && (
              <span className="flex-shrink-0 font-mono text-[12px] font-semibold tabular-nums text-ink">
                {formatFCFA(BigInt(a.amount))}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
