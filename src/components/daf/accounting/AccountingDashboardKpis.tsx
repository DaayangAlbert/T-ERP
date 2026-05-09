"use client";

import { FileText, AlertCircle, Coins, Calendar } from "lucide-react";

interface Props {
  kpis: {
    todayEntries: number;
    draftToValidate: number;
    banksTotal: number;
    banksReconciled: number;
    daysToClose: number;
    checklistProgress: { done: number; total: number };
  };
}

export function AccountingDashboardKpis({ kpis }: Props) {
  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
      <Kpi icon={<FileText className="h-4 w-4 text-info" />} label="Écritures du jour" value={String(kpis.todayEntries)} sub="saisies par le comptable" />
      <Kpi icon={<AlertCircle className="h-4 w-4 text-warning" />} label="À valider DAF" value={String(kpis.draftToValidate)} tone="warning" sub="brouillard > 5 M ou OD" />
      <Kpi icon={<Coins className="h-4 w-4 text-primary-500" />} label="Rapprochements" value={`${kpis.banksReconciled} / ${kpis.banksTotal}`} sub="banques rapprochées" />
      <Kpi icon={<Calendar className="h-4 w-4 text-danger" />} label="Avant clôture" value={`J${kpis.daysToClose >= 0 ? "-" : "+"}${Math.abs(kpis.daysToClose)}`} tone={kpis.daysToClose <= 5 ? "warning" : "default"} sub={`${kpis.checklistProgress.done}/${kpis.checklistProgress.total} étapes`} />
    </div>
  );
}

function Kpi({ icon, label, value, sub, tone }: { icon: React.ReactNode; label: string; value: string; sub?: string; tone?: "warning" | "default" }) {
  const cls = tone === "warning" ? "border-warning/30 bg-warning/5" : "border-line bg-white";
  return (
    <div className={`rounded-xl border p-3 shadow-card sm:p-4 ${cls}`}>
      <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">
        {icon} {label}
      </div>
      <div className="mt-1 font-mono text-[18px] font-bold tabular-nums text-ink sm:text-[20px]">{value}</div>
      {sub && <div className="text-[10.5px] text-ink-3">{sub}</div>}
    </div>
  );
}
