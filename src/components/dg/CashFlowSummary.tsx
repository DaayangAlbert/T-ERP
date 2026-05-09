import { ArrowDownRight, ArrowUpRight, Wallet, TrendingDown } from "lucide-react";
import { formatFCFA } from "@/lib/format";

interface Props {
  summary: {
    initialBalance: number;
    totalIncome: number;
    totalExpense: number;
    finalBalance: number;
    criticalWeeksCount: number;
  };
  weeks: number;
}

export function CashFlowSummary({ summary, weeks }: Props) {
  const cards: Array<{
    icon: React.ReactNode;
    label: string;
    value: number;
    sub: string;
    tone: "ink" | "success" | "danger" | "primary" | "warning";
  }> = [
    {
      icon: <Wallet className="h-3.5 w-3.5" />,
      label: "Solde initial",
      value: summary.initialBalance,
      sub: "Estimation aujourd'hui",
      tone: "ink",
    },
    {
      icon: <ArrowUpRight className="h-3.5 w-3.5" />,
      label: `Encaissements prévus ${weeks} sem.`,
      value: summary.totalIncome,
      sub: "Pondéré par probabilité",
      tone: "success",
    },
    {
      icon: <ArrowDownRight className="h-3.5 w-3.5" />,
      label: "Décaissements engagés",
      value: -summary.totalExpense,
      sub: "Fournisseurs + paie + fiscalité",
      tone: "danger",
    },
    {
      icon: <TrendingDown className="h-3.5 w-3.5" />,
      label: `Solde projeté à ${weeks} sem.`,
      value: summary.finalBalance,
      sub:
        summary.criticalWeeksCount > 0
          ? `${summary.criticalWeeksCount} semaine(s) sous seuil critique`
          : "Trajectoire sans alerte",
      tone:
        summary.criticalWeeksCount > 0
          ? "warning"
          : summary.finalBalance > summary.initialBalance
            ? "primary"
            : "ink",
    },
  ];

  return (
    <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="rounded-xl border border-line bg-white p-4 shadow-card">
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-ink-3">
            {c.icon}
            {c.label}
          </div>
          <div className="mt-2 font-semibold leading-none">
            <span
              className={`font-mono text-[22px] tabular-nums ${
                c.tone === "success"
                  ? "text-success"
                  : c.tone === "danger"
                    ? "text-danger"
                    : c.tone === "primary"
                      ? "text-primary-700"
                      : c.tone === "warning"
                        ? "text-warning"
                        : "text-ink"
              }`}
            >
              {c.value < 0 ? "- " : ""}
              {formatFCFA(Math.abs(c.value))}
            </span>
          </div>
          <div className="mt-2 text-[11.5px] text-ink-3">{c.sub}</div>
        </div>
      ))}
    </div>
  );
}
