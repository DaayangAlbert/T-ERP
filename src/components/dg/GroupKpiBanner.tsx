import { formatFCFA } from "@/lib/format";
import { Building2, TrendingUp, Users, Wallet } from "lucide-react";

interface Props {
  kpis: {
    ca: number;
    margin: number;
    headcount: number;
    treasury: number;
    childrenCount: number;
  };
  groupName: string;
}

export function GroupKpiBanner({ kpis, groupName }: Props) {
  const ca = formatFCFA(kpis.ca, { splitUnit: true });
  const treasury = formatFCFA(kpis.treasury, { splitUnit: true });

  return (
    <section
      className="relative overflow-hidden rounded-xl text-white"
      style={{ background: "linear-gradient(135deg,#2A1B3D 0%,#581C87 50%,#7E22CE 100%)" }}
    >
      <div
        className="pointer-events-none absolute -right-12 -top-12 h-[280px] w-[280px]"
        style={{ background: "radial-gradient(circle,rgba(192,132,252,.25),transparent 60%)" }}
      />
      <div className="relative p-6">
        <div className="mb-4 flex items-center gap-2">
          <span className="rounded-md bg-white/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider">
            Consolidation
          </span>
          <span className="text-[12.5px] text-primary-100">
            Groupe {groupName} · {kpis.childrenCount} filiale{kpis.childrenCount > 1 ? "s" : ""}
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            icon={<Building2 className="h-4 w-4" />}
            label="CA consolidé groupe"
            value={ca.value}
            unit={ca.unit}
          />
          <Stat
            icon={<TrendingUp className="h-4 w-4" />}
            label="Marge consolidée"
            value={kpis.margin.toFixed(1).replace(".", ",")}
            unit="%"
          />
          <Stat
            icon={<Users className="h-4 w-4" />}
            label="Effectif total"
            value={kpis.headcount.toString()}
            unit="employés"
          />
          <Stat
            icon={<Wallet className="h-4 w-4" />}
            label="Trésorerie groupe"
            value={treasury.value}
            unit={treasury.unit}
          />
        </div>
      </div>
    </section>
  );
}

function Stat({
  icon,
  label,
  value,
  unit,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="rounded-lg bg-white/8 p-3 backdrop-blur ring-1 ring-white/10">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-primary-100">
        {icon}
        {label}
      </div>
      <div className="mt-1.5 font-semibold leading-none">
        <span className="font-mono text-[24px] tabular-nums">{value}</span>
        <span className="ml-1 text-[12px] font-medium text-primary-100">{unit}</span>
      </div>
    </div>
  );
}
