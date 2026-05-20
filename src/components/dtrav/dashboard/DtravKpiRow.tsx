import { Users, TrendingUp, CheckCircle2, Wallet } from "lucide-react";
import { formatFCFA } from "@/lib/format";

interface Props {
  kpis: {
    workforcePresent: number;
    workforcePlanned: number;
    productionValue: number;
    pendingValidations: number;
    monthInvoiced: number;
    monthPaid: number;
    todayReportStatus: string | null;
  };
}

export function DtravKpiRow({ kpis }: Props) {
  const presenceRate = kpis.workforcePlanned > 0
    ? Math.round((kpis.workforcePresent / kpis.workforcePlanned) * 100)
    : 0;
  const items = [
    {
      label: "Effectif jour",
      value: `${kpis.workforcePresent}/${kpis.workforcePlanned}`,
      hint: `${presenceRate}% présents`,
      icon: Users,
    },
    {
      label: "Production jour",
      value: formatFCFA(kpis.productionValue, { noSuffix: true }),
      hint: "FCFA",
      icon: TrendingUp,
    },
    {
      label: "Validations",
      value: kpis.pendingValidations.toString(),
      hint: "en attente",
      icon: CheckCircle2,
    },
    {
      label: "Encaissé mois",
      value: formatFCFA(kpis.monthPaid, { noSuffix: true }),
      hint: `/ ${formatFCFA(kpis.monthInvoiced, { noSuffix: true })} FCFA facturés`,
      icon: Wallet,
    },
  ];
  return (
    <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <div key={it.label} className="rounded-xl border border-line bg-white p-3 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider text-ink-3">{it.label}</span>
              <Icon className="h-4 w-4 text-primary-600" />
            </div>
            <div className="mt-1 text-2xl font-bold text-ink">{it.value}</div>
            <div className="text-[11px] text-ink-3">{it.hint}</div>
          </div>
        );
      })}
    </section>
  );
}
