import { Banknote, CalendarCheck, Clock, Award } from "lucide-react";
import { formatKShort } from "@/lib/emp-format";

interface Props {
  kpis: {
    lastNetSalary: number;
    leavesRemaining: number;
    overtimeHoursMonth: number;
    seniorityYears: number;
  };
}

/**
 * 4 KPIs personnels. Responsive : 1 colonne (mobile <360), 2x2 (mobile),
 * 4 col (tablette+). Le solde de congés passe en vert si > 10 j restants.
 */
export function EmpKpiRow({ kpis }: Props) {
  const items = [
    {
      label: "Salaire net (dernier)",
      value: `${formatKShort(kpis.lastNetSalary)} FCFA`,
      icon: Banknote,
      color: "text-purple-700",
    },
    {
      label: "Congés restants",
      value: `${kpis.leavesRemaining} j`,
      icon: CalendarCheck,
      color: kpis.leavesRemaining > 10 ? "text-green-600" : "text-amber-600",
    },
    {
      label: "Heures sup ce mois",
      value: `${kpis.overtimeHoursMonth} h`,
      icon: Clock,
      color: "text-blue-600",
    },
    {
      label: "Ancienneté",
      value: `${kpis.seniorityYears} ans`,
      icon: Award,
      color: "text-ink-2",
    },
  ];

  return (
    <section className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <div
            key={it.label}
            className="rounded-xl border border-line bg-white p-3 shadow-card"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider text-ink-3">
                {it.label}
              </span>
              <Icon className={`h-4 w-4 ${it.color}`} />
            </div>
            <div className={`mt-1 text-lg font-bold ${it.color}`}>{it.value}</div>
          </div>
        );
      })}
    </section>
  );
}
