import { ShieldCheck, Star, Briefcase, TrendingUp } from "lucide-react";
import type { SecondaryKpis } from "@/hooks/useDashboardDg";
import { formatFCFA } from "@/lib/format";

interface Props {
  kpis: SecondaryKpis;
}

export function SecondaryKpiRow({ kpis }: Props) {
  const backlog = formatFCFA(kpis.backlog.value, { splitUnit: true });
  const forecast = formatFCFA(kpis.productionForecast.value, { splitUnit: true });

  return (
    <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
      <Card
        icon={<Briefcase className="h-3.5 w-3.5" />}
        label={kpis.backlog.label}
        value={backlog.value}
        unit={backlog.unit}
        hint={kpis.backlog.hint}
      />
      <Card
        icon={<TrendingUp className="h-3.5 w-3.5" />}
        label={kpis.productionForecast.label}
        value={forecast.value}
        unit={forecast.unit}
        hint={kpis.productionForecast.hint}
        accent="primary"
      />
      <Card
        icon={<ShieldCheck className="h-3.5 w-3.5" />}
        label={kpis.hseDaysWithoutAccident.label}
        value={kpis.hseDaysWithoutAccident.value.toString()}
        unit="jours"
        hint={kpis.hseDaysWithoutAccident.hint}
        accent="success"
      />
      <Card
        icon={<Star className="h-3.5 w-3.5" />}
        label={kpis.customerSatisfaction.label}
        value={kpis.customerSatisfaction.value.toFixed(1).replace(".", ",")}
        unit="/ 5"
        hint={kpis.customerSatisfaction.hint}
        accent="warning"
      />
    </div>
  );
}

function Card({
  icon,
  label,
  value,
  unit,
  hint,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit?: string;
  hint?: string;
  accent?: "primary" | "success" | "warning";
}) {
  const accentClass =
    accent === "primary"
      ? "text-primary-700"
      : accent === "success"
        ? "text-success"
        : accent === "warning"
          ? "text-warning"
          : "text-ink";

  return (
    <div className="rounded-xl border border-line bg-white p-4 shadow-card">
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-ink-3">
        {icon}
        {label}
      </div>
      <div className="mt-2 font-semibold leading-none">
        <span className={`font-mono text-[22px] tabular-nums ${accentClass}`}>{value}</span>
        {unit && <span className="ml-1 text-[12px] font-medium text-ink-3">{unit}</span>}
      </div>
      {hint && <div className="mt-2 text-[11.5px] text-ink-3">{hint}</div>}
    </div>
  );
}
