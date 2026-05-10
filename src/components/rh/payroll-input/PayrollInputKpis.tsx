"use client";

import { Users, ClipboardCheck, Clock, Wallet } from "lucide-react";

interface Props {
  kpis: {
    totalBulletins: number;
    inputsSaved: number;
    journaliersTotal: number;
    overtimeHours: number;
    advancesCount: number;
  };
}

function fmt(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(n);
}

export function PayrollInputKpis({ kpis }: Props) {
  const inputsRate = Math.round((kpis.inputsSaved / kpis.journaliersTotal) * 100);
  return (
    <div className="grid gap-2 grid-cols-2 lg:grid-cols-4">
      <Card icon={<Users className="h-4 w-4 text-primary-600" />} label="Bulletins à produire" value={fmt(kpis.totalBulletins)} hint="Tous statuts" />
      <Card icon={<ClipboardCheck className="h-4 w-4 text-emerald-600" />} label="Saisies journaliers" value={`${kpis.inputsSaved} / ${kpis.journaliersTotal}`} hint={`${inputsRate} %`} />
      <Card icon={<Clock className="h-4 w-4 text-amber-600" />} label="Heures sup déclarées" value={`${fmt(kpis.overtimeHours)} h`} hint="Permanents + journaliers" />
      <Card icon={<Wallet className="h-4 w-4 text-rose-600" />} label="Avances en cours" value={fmt(kpis.advancesCount)} hint="À déduire ce mois" />
    </div>
  );
}

function Card({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-line bg-white p-3 shadow-card min-w-0">
      <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">
        {icon} <span className="truncate">{label}</span>
      </div>
      <div className="mt-1 font-mono text-[18px] font-bold text-ink sm:text-[20px]">{value}</div>
      <div className="mt-0.5 truncate text-[11px] text-ink-3">{hint}</div>
    </div>
  );
}
