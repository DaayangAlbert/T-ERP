"use client";

import { Receipt, AlertTriangle, Timer, TrendingUp } from "lucide-react";
import { formatFCFA } from "@/lib/format";

interface Props {
  summary: { totalReceivables: string; overdue: string; dso: number; paidYTD: string };
}

export function ReceivablesKpis({ summary }: Props) {
  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
      <Kpi icon={<Receipt className="h-4 w-4 text-primary-500" />} label="Créances totales" value={formatFCFA(BigInt(summary.totalReceivables))} tone="primary" />
      <Kpi icon={<Timer className="h-4 w-4 text-warning" />} label="DSO" value={`${summary.dso} j`} tone={summary.dso > 60 ? "warning" : "info"} />
      <Kpi icon={<AlertTriangle className="h-4 w-4 text-danger" />} label="Échues" value={formatFCFA(BigInt(summary.overdue))} tone="danger" />
      <Kpi icon={<TrendingUp className="h-4 w-4 text-success" />} label="Encaissé YTD" value={formatFCFA(BigInt(summary.paidYTD))} tone="success" />
    </div>
  );
}

function Kpi({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: "primary" | "info" | "warning" | "danger" | "success" }) {
  const cls =
    tone === "primary" ? "border-primary-300 bg-primary-50" :
    tone === "info" ? "border-info/30 bg-info/5" :
    tone === "warning" ? "border-warning/30 bg-warning/5" :
    tone === "danger" ? "border-danger/30 bg-danger/5" :
    "border-success/30 bg-success/5";
  const valCls =
    tone === "primary" ? "text-primary-800" :
    tone === "info" ? "text-info" :
    tone === "warning" ? "text-warning" :
    tone === "danger" ? "text-danger" :
    "text-success";
  return (
    <div className={`rounded-xl border p-3 shadow-card sm:p-4 ${cls}`}>
      <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">
        {icon} {label}
      </div>
      <div className={`mt-1 font-mono text-[16px] font-bold tabular-nums sm:text-[18px] ${valCls}`}>{value}</div>
    </div>
  );
}
