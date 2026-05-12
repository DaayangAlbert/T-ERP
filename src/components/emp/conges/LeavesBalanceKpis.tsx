import { CalendarCheck, RotateCcw, CalendarClock, HeartPulse } from "lucide-react";
import type { LeaveBalance } from "@/hooks/useEmpLeaves";

interface Props {
  balance: LeaveBalance;
}

/**
 * 4 KPIs soldes : Congés payés restants (vert si > 10), Récupérations
 * (heures sup converties), Pris cette année, Maladie consommée.
 * Responsive 2 col → 4 col.
 */
export function LeavesBalanceKpis({ balance }: Props) {
  const items = [
    {
      label: "Congés payés restants",
      value: `${balance.paidLeaveRemaining} j`,
      icon: CalendarCheck,
      color: balance.paidLeaveRemaining > 10 ? "text-green-600" : "text-amber-600",
    },
    {
      label: "Récupérations",
      value: `${balance.compensatoryDays} j`,
      icon: RotateCcw,
      color: "text-purple-700",
    },
    {
      label: "Pris cette année",
      value: `${balance.paidLeaveTaken} j`,
      icon: CalendarClock,
      color: "text-blue-600",
    },
    {
      label: "Maladie",
      value: `${balance.sickDaysUsed} j`,
      icon: HeartPulse,
      color: "text-red-600",
    },
  ];
  return (
    <section className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <div key={it.label} className="rounded-xl border border-line bg-white p-3 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider text-ink-3">{it.label}</span>
              <Icon className={`h-4 w-4 ${it.color}`} />
            </div>
            <div className={`mt-1 text-lg font-bold ${it.color}`}>{it.value}</div>
          </div>
        );
      })}
    </section>
  );
}
