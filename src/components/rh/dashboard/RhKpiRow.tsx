"use client";

import { Users, Activity, Briefcase, ClipboardCheck } from "lucide-react";

function fmt(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(n);
}

interface Props {
  kpis: {
    totalHeadcount: number;
    presentToday: number;
    presentRate: number;
    hiringInProgress: number;
    pendingValidations: number;
  };
}

export function RhKpiRow({ kpis }: Props) {
  return (
    <div className="grid gap-2 grid-cols-2 lg:grid-cols-4">
      <Kpi
        icon={<Users className="h-4 w-4 text-primary-600" />}
        label="Effectif total"
        value={fmt(kpis.totalHeadcount)}
        hint="Tous statuts confondus"
      />
      <Kpi
        icon={<Activity className="h-4 w-4 text-emerald-600" />}
        label="Présents aujourd'hui"
        value={fmt(kpis.presentToday)}
        hint={`${kpis.presentRate.toFixed(1).replace(".", ",")} % de présence`}
      />
      <Kpi
        icon={<Briefcase className="h-4 w-4 text-amber-600" />}
        label="Embauches en cours"
        value={fmt(kpis.hiringInProgress)}
        hint="Pipeline recrutement"
      />
      <Kpi
        icon={<ClipboardCheck className="h-4 w-4 text-rose-600" />}
        label="Validations en attente"
        value={fmt(kpis.pendingValidations)}
        hint="N1 RH à traiter"
      />
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-white p-3 shadow-card min-w-0">
      <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">
        {icon} <span className="truncate">{label}</span>
      </div>
      <div className="mt-1 font-mono text-[18px] font-bold text-ink sm:text-[20px]">{value}</div>
      {hint && <div className="mt-0.5 truncate text-[11px] text-ink-3">{hint}</div>}
    </div>
  );
}
