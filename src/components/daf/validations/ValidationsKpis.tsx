"use client";

import { Clock, Banknote, Timer, CheckCircle2 } from "lucide-react";
import { formatFCFA } from "@/lib/format";

interface Props {
  summary: { total: number; totalAmount: string; averageDelayDays: number; monthValidatedCount: number };
}

export function ValidationsKpis({ summary }: Props) {
  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
      <Kpi icon={<Clock className="h-4 w-4 text-warning" />} label="À valider" value={String(summary.total)} tone="warning" />
      <Kpi icon={<Banknote className="h-4 w-4 text-primary-500" />} label="Valeur cumulée" value={formatFCFA(BigInt(summary.totalAmount))} tone="primary" />
      <Kpi icon={<Timer className="h-4 w-4 text-info" />} label="Délai moyen" value={`${summary.averageDelayDays} j`} tone="info" />
      <Kpi icon={<CheckCircle2 className="h-4 w-4 text-success" />} label="Validées (mois)" value={String(summary.monthValidatedCount)} tone="success" />
    </div>
  );
}

function Kpi({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: "warning" | "primary" | "info" | "success" }) {
  const cls =
    tone === "warning" ? "border-warning/30 bg-warning/5" :
    tone === "primary" ? "border-primary-300 bg-primary-50" :
    tone === "info" ? "border-info/30 bg-info/5" :
    "border-success/30 bg-success/5";
  const valCls =
    tone === "warning" ? "text-warning" :
    tone === "primary" ? "text-primary-800" :
    tone === "info" ? "text-info" :
    "text-success";
  return (
    <div className={`rounded-xl border p-3 shadow-card sm:p-4 ${cls}`}>
      <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">
        {icon} {label}
      </div>
      <div className={`mt-1 font-mono text-[18px] font-bold tabular-nums sm:text-[20px] ${valCls}`}>{value}</div>
    </div>
  );
}
