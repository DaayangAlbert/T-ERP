import { Banknote, ArrowDownRight, ArrowUpRight, UserCheck, Building2, Bell } from "lucide-react";
import type { DailyKeyStats as DailyKeyStatsType } from "@/hooks/useDashboardDg";
import { formatFCFA } from "@/lib/format";

interface Props {
  stats: DailyKeyStatsType;
}

export function DailyKeyStats({ stats }: Props) {
  const items = [
    {
      icon: <Banknote className="h-3.5 w-3.5" />,
      label: stats.caJour.label,
      value: formatFCFA(stats.caJour.value),
    },
    {
      icon: <ArrowUpRight className="h-3.5 w-3.5 text-success" />,
      label: stats.encaissements.label,
      value: formatFCFA(stats.encaissements.value),
    },
    {
      icon: <ArrowDownRight className="h-3.5 w-3.5 text-danger" />,
      label: stats.decaissements.label,
      value: formatFCFA(stats.decaissements.value),
    },
    {
      icon: <UserCheck className="h-3.5 w-3.5" />,
      label: stats.effectifPresent.label,
      value: `${stats.effectifPresent.value} / ${stats.effectifPresent.total ?? "—"}`,
    },
    {
      icon: <Building2 className="h-3.5 w-3.5" />,
      label: stats.chantiersActifs.label,
      value: stats.chantiersActifs.value.toString(),
    },
    {
      icon: <Bell className="h-3.5 w-3.5" />,
      label: stats.notifsNonLues.label,
      value: stats.notifsNonLues.value.toString(),
    },
  ];

  return (
    <section
      className="rounded-xl border border-primary-200 p-4"
      style={{ background: "linear-gradient(135deg,#FAF5FF 0%,#F5EDFF 100%)" }}
    >
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-primary-800">Mes chiffres clés du jour</h2>
        <span className="text-[11px] text-primary-700">
          {new Date().toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </span>
      </header>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {items.map((item) => (
          <li
            key={item.label}
            className="flex items-center gap-2.5 rounded-lg bg-white/80 px-3 py-2 ring-1 ring-primary-100"
          >
            <span className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-md bg-primary-100 text-primary-700">
              {item.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[10.5px] font-medium uppercase tracking-wide text-ink-3">
                {item.label}
              </span>
              <span className="block truncate font-mono text-[13px] font-semibold tabular-nums text-ink">
                {item.value}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
