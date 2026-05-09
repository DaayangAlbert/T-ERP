"use client";

import { Calendar, Banknote, TrendingUp, ShieldCheck } from "lucide-react";
import { formatFCFA } from "@/lib/format";

interface Props {
  summary: { upcomingCount: number; totalAmount: string; conformityYTD: number; vatCredit: number };
}

export function FiscalKpis({ summary }: Props) {
  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
      <Kpi icon={<Calendar className="h-4 w-4 text-warning" />} label="Échéances 30 j" value={String(summary.upcomingCount)} tone="warning" />
      <Kpi icon={<Banknote className="h-4 w-4 text-primary-500" />} label="Montant à payer" value={formatFCFA(BigInt(summary.totalAmount))} tone="primary" />
      <Kpi icon={<TrendingUp className="h-4 w-4 text-info" />} label="TVA crédit" value={summary.vatCredit > 0 ? formatFCFA(summary.vatCredit) : "—"} tone="info" />
      <Kpi icon={<ShieldCheck className="h-4 w-4 text-success" />} label="Conformité YTD" value={`${summary.conformityYTD} %`} tone="success" />
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
      <div className={`mt-1 font-mono text-[16px] font-bold tabular-nums sm:text-[18px] ${valCls}`}>{value}</div>
    </div>
  );
}
